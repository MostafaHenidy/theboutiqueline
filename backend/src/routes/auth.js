const router = require('express').Router();
const { register, login, verifyOTP, resendOTP, forgotPassword, resetPassword, getMe, updateProfile, changePassword } = require('../controllers/authController');
const { protect } = require('../middleware/auth');
const { avatarUpload } = require('../config/cloudinary');
const { pickSingleUploadedFile } = require('../middleware/multerMultipartNormalize');

router.post('/register', register);
router.post('/login', login);
router.post('/verify-otp', verifyOTP);
router.post('/resend-otp', resendOTP);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password', resetPassword);
router.get('/me', protect, getMe);
router.put('/profile', protect, avatarUpload, pickSingleUploadedFile('avatar'), updateProfile);
router.put('/change-password', protect, changePassword);

module.exports = router;
