const bcrypt = require('bcryptjs');
const { Sequelize } = require('sequelize');
const { User, Role } = require('../models');
const { generateAccessToken, generateRefreshToken, generateOTP } = require('../utils/generateToken');
const { sendOTPEmailSafe } = require('../utils/sendEmail');
const { normalizeEmailLocale } = require('../utils/emailTemplate');

function readAuthLocale(req) {
  return normalizeEmailLocale(req.body?.locale || req.body?.language || req.headers['accept-language']);
}

function normalizeEmail(email) {
  return typeof email === 'string' ? email.trim().toLowerCase() : '';
}

function normalizeOtp(otp) {
  return String(otp ?? '').trim().replace(/\D/g, '');
}

function otpMatches(stored, submitted) {
  const expected = normalizeOtp(stored);
  const actual = normalizeOtp(submitted);
  return expected.length >= 6 && actual.length >= 6 && expected === actual;
}

/** Small grace window for DB/server clock skew (Sequelize + MySQL datetime). */
function isOtpExpired(expiresAt) {
  if (!expiresAt) return true;
  const expiresMs = new Date(expiresAt).getTime();
  if (Number.isNaN(expiresMs)) return true;
  const OTP_GRACE_MS = 2 * 60 * 1000;
  return Date.now() > expiresMs + OTP_GRACE_MS;
}

function emailMatchWhere(normalized) {
  return Sequelize.where(Sequelize.fn('LOWER', Sequelize.col('email')), normalized);
}

async function issueAndSendOtp(user, email, locale = 'en') {
  const otp = generateOTP();
  user.otp = otp;
  user.otp_expires = new Date(Date.now() + 10 * 60 * 1000);
  await user.save();

  const mail = await sendOTPEmailSafe(email, otp, locale);
  if (!mail.ok && process.env.NODE_ENV === 'development') {
    console.info(`[auth] Dev OTP for ${email}: ${otp}`);
  }
  return mail;
}

function emailFailureMessage(mail) {
  if (process.env.NODE_ENV === 'development') {
    return mail.message || 'SMTP send failed';
  }
  return 'Could not send verification email. Check SMTP settings in Admin → Settings, then try again.';
}

exports.register = async (req, res, next) => {
  try {
    const { name, email, phone, password } = req.body;
    const emailNorm = normalizeEmail(email);
    if (!emailNorm) {
      return res.status(400).json({ success: false, message: 'Valid email is required' });
    }

    const exists = await User.findOne({ where: emailMatchWhere(emailNorm) });
    if (exists) return res.status(409).json({ success: false, message: 'Email already registered' });

    const hashed = await bcrypt.hash(password, 12);
    const otp = generateOTP();
    const otpExpires = new Date(Date.now() + 10 * 60 * 1000);

    const customerRole = await Role.findOne({ where: { name: 'customer' } });
    const user = await User.create({
      name,
      email: emailNorm,
      phone,
      password: hashed,
      role_id: customerRole?.id || 2,
      otp,
      otp_expires: otpExpires,
    });

    const mail = await sendOTPEmailSafe(emailNorm, otp, readAuthLocale(req));
    if (!mail.ok) {
      console.error('[auth] register OTP email failed:', mail.message);
      if (process.env.NODE_ENV === 'development') {
        console.info(`[auth] Dev OTP for ${emailNorm}: ${otp}`);
      }
    }

    const token = generateAccessToken(user.id);
    res.status(201).json({
      success: true,
      message: mail.ok
        ? 'Registration successful. Please verify your email.'
        : 'Account created, but the verification email could not be sent.',
      email_sent: mail.ok,
      ...(mail.ok ? {} : { email_error: emailFailureMessage(mail) }),
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: customerRole?.name,
      },
    });
  } catch (err) { next(err); }
};

exports.login = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const emailNorm = normalizeEmail(email);
    const user =
      emailNorm &&
      typeof password === 'string' &&
      (await User.findOne({ where: emailMatchWhere(emailNorm), include: [{ model: Role, as: 'role' }] }));
    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }
    if (!user.is_active) return res.status(403).json({ success: false, message: 'Account disabled' });

    user.last_login = new Date();
    await user.save();

    const token = generateAccessToken(user.id);
    const refreshToken = generateRefreshToken(user.id);
    res.json({
      success: true,
      token,
      refreshToken,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        avatar: user.avatar,
        role: user.role?.name,
        email_verified: user.email_verified,
      },
    });
  } catch (err) { next(err); }
};

exports.verifyOTP = async (req, res, next) => {
  try {
    const { email, otp } = req.body;
    const emailNorm = normalizeEmail(email);
    const user =
      emailNorm && (await User.findOne({ where: emailMatchWhere(emailNorm) }));
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    if (user.email_verified) {
      return res.json({ success: true, message: 'Email already verified' });
    }
    if (!user.otp) {
      return res.status(400).json({ success: false, message: 'No verification code pending. Please request a new one.' });
    }
    if (isOtpExpired(user.otp_expires)) {
      return res.status(400).json({ success: false, message: 'Verification code expired. Please request a new one.' });
    }
    if (!otpMatches(user.otp, otp)) {
      return res.status(400).json({ success: false, message: 'Invalid verification code' });
    }
    user.email_verified = true;
    user.otp = null;
    user.otp_expires = null;
    await user.save();
    res.json({ success: true, message: 'Email verified successfully' });
  } catch (err) { next(err); }
};

exports.resendOTP = async (req, res, next) => {
  try {
    const emailNorm = normalizeEmail(req.body?.email);
    if (!emailNorm) {
      return res.status(400).json({ success: false, message: 'Email is required' });
    }

    const user = await User.findOne({ where: emailMatchWhere(emailNorm) });
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const mail = await issueAndSendOtp(user, user.email, readAuthLocale(req));
    if (!mail.ok) {
      return res.status(502).json({
        success: false,
        message: emailFailureMessage(mail),
        email_sent: false,
      });
    }

    res.json({ success: true, message: 'Verification code sent', email_sent: true });
  } catch (err) { next(err); }
};

exports.forgotPassword = async (req, res, next) => {
  try {
    const { email } = req.body;
    const emailNorm = normalizeEmail(email);
    const user =
      emailNorm && (await User.findOne({ where: emailMatchWhere(emailNorm) }));
    if (!user) return res.status(404).json({ success: false, message: 'Email not found' });

    const mail = await issueAndSendOtp(user, user.email, readAuthLocale(req));
    if (!mail.ok) {
      return res.status(502).json({
        success: false,
        message: emailFailureMessage(mail),
        email_sent: false,
      });
    }

    res.json({ success: true, message: 'Password reset code sent to your email', email_sent: true });
  } catch (err) { next(err); }
};

exports.resetPassword = async (req, res, next) => {
  try {
    const { email, otp, password } = req.body;
    const emailNorm = normalizeEmail(email);
    const user =
      emailNorm && (await User.findOne({ where: emailMatchWhere(emailNorm) }));
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    if (!user.otp) {
      return res.status(400).json({ success: false, message: 'No reset code pending. Please request a new one.' });
    }
    if (isOtpExpired(user.otp_expires)) {
      return res.status(400).json({ success: false, message: 'Reset code expired. Please request a new one.' });
    }
    if (!otpMatches(user.otp, otp)) {
      return res.status(400).json({ success: false, message: 'Invalid reset code' });
    }
    user.password = await bcrypt.hash(password, 12);
    user.otp = null;
    user.otp_expires = null;
    await user.save();
    res.json({ success: true, message: 'Password reset successfully' });
  } catch (err) { next(err); }
};

exports.getMe = async (req, res) => {
  const user = await User.findByPk(req.user.id, { include: [{ model: Role, as: 'role' }], attributes: { exclude: ['password', 'otp', 'otp_expires', 'reset_token', 'reset_token_expires'] } });
  if (!user) return res.status(404).json({ success: false, message: 'User not found' });
  res.json({ success: true, user: { id: user.id, name: user.name, email: user.email, phone: user.phone, avatar: user.avatar, role: user.role?.name, email_verified: user.email_verified } });
};

exports.updateProfile = async (req, res, next) => {
  try {
    const { name, phone } = req.body;
    const user = req.user;
    if (name) user.name = name;
    if (phone) user.phone = phone;
    if (req.file) user.avatar = req.file.path;
    await user.save();
    res.json({ success: true, message: 'Profile updated', user: { id: user.id, name: user.name, email: user.email, phone: user.phone, avatar: user.avatar } });
  } catch (err) { next(err); }
};

exports.changePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const user = await User.findByPk(req.user.id);
    if (!(await bcrypt.compare(currentPassword, user.password))) {
      return res.status(400).json({ success: false, message: 'Current password is incorrect' });
    }
    user.password = await bcrypt.hash(newPassword, 12);
    await user.save();
    res.json({ success: true, message: 'Password changed successfully' });
  } catch (err) { next(err); }
};
