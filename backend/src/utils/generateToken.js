const crypto = require('crypto');
const jwt = require('jsonwebtoken');

exports.generateAccessToken = (id) =>
  jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || '7d' });

exports.generateRefreshToken = (id) =>
  jwt.sign({ id }, process.env.JWT_REFRESH_SECRET, { expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '30d' });

exports.generateOTP = () => Math.floor(100000 + Math.random() * 900000).toString();

/** Unique per row; avoids rare collisions under concurrent checkouts vs time+Math.random alone. */
exports.generateOrderNumber = () =>
  `MW-${Date.now()}-${crypto.randomBytes(6).toString('hex')}`;
