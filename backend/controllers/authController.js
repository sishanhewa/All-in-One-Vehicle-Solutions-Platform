const asyncHandler = require('express-async-handler');
const User = require('../models/User');
const jwt = require('jsonwebtoken');

// Helper to generate JWT Token
const generateToken = (id) => {
  // Use a secure fallback secret if not explicitly provided in .env
  return jwt.sign({ id }, process.env.JWT_SECRET || 'wmt-fallback-super-secret-key-2026', {
    expiresIn: '30d',
  });
};

// @desc    Register a new Seller Account
// @route   POST /api/auth/register
// @access  Public
const registerUser = asyncHandler(async (req, res) => {
  const { name, email, password, phone } = req.body;

  if (!name || !email || !password || !phone) {
    res.status(400);
    throw new Error('Please append all required fields to create a Seller Account');
  }

  // Check if seller already exists
  const userExists = await User.findOne({ email });
  if (userExists) {
    res.status(400);
    throw new Error('Seller Account already exists with this email');
  }

  // Create standard user natively
  const user = await User.create({ name, email, password, phone });

  if (user) {
    res.status(201).json({
      _id: user.id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      role: user.role,
      companyProfile: user.companyProfile || null,
      token: generateToken(user._id),
    });
  } else {
    res.status(400);
    throw new Error('Invalid user details. Database rejected creation.');
  }
});

// @desc    Authenticate a Seller Account
// @route   POST /api/auth/login
// @access  Public
const loginUser = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  // Search user natively
  const user = await User.findOne({ email });

  // Compare strictly securely hashed payload
  if (user && (await user.matchPassword(password))) {
    res.json({
      _id: user.id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      role: user.role,
      companyProfile: user.companyProfile || null,
      token: generateToken(user._id),
    });
  } else {
    res.status(401);
    throw new Error('Invalid email or password');
  }
});

// @desc    Get current logged in Seller details
// @route   GET /api/auth/profile
// @access  Private
const getProfile = asyncHandler(async (req, res) => {
  // req.user is dynamically appended by the `protect` middleware
  res.status(200).json(req.user);
});

module.exports = { registerUser, loginUser, getProfile };
