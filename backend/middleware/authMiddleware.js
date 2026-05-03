const jwt = require('jsonwebtoken');
const asyncHandler = require('express-async-handler');
const User = require('../models/User');

const protect = asyncHandler(async (req, res, next) => {
  let token;

  // Check if Bearer token exists in the Auth header
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    try {
      // Get token from header (Format: "Bearer <token>")
      token = req.headers.authorization.split(' ')[1];

      // Decode the token using our secret key
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      // Get user from the token (excluding the password) and append it to the Express Request
      req.user = await User.findById(decoded.id).select('-password');
      if (!req.user) {
        res.status(401);
        throw new Error('Not authorized, user no longer exists');
      }
      next();
    } catch (error) {
      console.error(error);
      res.status(401);
      throw new Error('Not authorized, strict token validation failed');
    }
  }

  if (!token) {
    res.status(401);
    throw new Error('Not authorized, no token provided');
  }
});

module.exports = { protect };
