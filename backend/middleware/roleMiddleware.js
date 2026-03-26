const asyncHandler = require('express-async-handler');

// Reusable role-gating middleware - chains after `protect`
// Usage: protect, requireRole('InspectionCompany')
const requireRole = (...roles) => asyncHandler(async (req, res, next) => {
  if (req.user && roles.includes(req.user.role)) {
    next();
  } else {
    res.status(403);
    throw new Error(`Access denied. Required role: ${roles.join(' or ')}`);
  }
});

module.exports = { requireRole };
