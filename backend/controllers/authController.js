const asyncHandler = require('express-async-handler');
const User = require('../models/User');
const jwt = require('jsonwebtoken');

// Helper to generate JWT Token
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET || 'wmt-fallback-super-secret-key-2026', {
    expiresIn: '30d',
  });
};

/** Shapes the user object sent back to the client after login / register. */
const userPayload = (user) => ({
  _id:           user._id,
  name:          user.name,
  email:         user.email,
  phone:         user.phone,
  role:          user.role,
  garageId:      user.garageId ?? null,
  isActive:      user.isActive,
  // companyProfile is always returned — Inspection module depends on it for
  // InspectionCompany accounts. Other roles receive null and can safely ignore it.
  companyProfile: user.companyProfile ?? null,
  token:         generateToken(user._id),
});

// @desc    Register a new customer account
// @route   POST /api/auth/register
// @access  Public
const registerUser = asyncHandler(async (req, res) => {
  const { name, email, password, phone } = req.body;

  if (!name || !email || !password || !phone) {
    res.status(400);
    throw new Error('Please provide name, email, password, and phone');
  }

  const userExists = await User.findOne({ email });
  if (userExists) {
    res.status(400);
    throw new Error('An account already exists with this email');
  }

  const user = await User.create({ name, email, password, phone });

  if (user) {
    res.status(201).json(userPayload(user));
  } else {
    res.status(400);
    throw new Error('Invalid user details. Registration failed.');
  }
});

// @desc    Authenticate a user
// @route   POST /api/auth/login
// @access  Public
const loginUser = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  const user = await User.findOne({ email });

  if (user && (await user.matchPassword(password))) {
    // Block deactivated accounts
    if (user.isActive === false) {
      res.status(403);
      throw new Error('This account has been deactivated. Contact your garage owner.');
    }
    res.json(userPayload(user));
  } else {
    res.status(401);
    throw new Error('Invalid email or password');
  }
});

// @desc    Get current logged-in user details
// @route   GET /api/auth/profile
// @access  Private
const getProfile = asyncHandler(async (req, res) => {
  res.status(200).json(userPayload(req.user));
});

// @desc    Update user profile
// @route   PUT /api/auth/profile
// @access  Private
const updateProfile = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id);

  if (user) {
    user.name = req.body.name || user.name;
    user.phone = req.body.phone || user.phone;

    if (req.body.password) {
      user.password = req.body.password;
    }

    const updatedUser = await user.save();
    res.json(userPayload(updatedUser));
  } else {
    res.status(404);
    throw new Error('User not found');
  }
});

module.exports = { registerUser, loginUser, getProfile, updateProfile };
