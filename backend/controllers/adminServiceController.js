const asyncHandler = require('express-async-handler');
const User = require('../models/User');
const RepairBooking = require('../models/RepairBooking');

// @desc    Get all garages (admin view)
// @route   GET /api/service/admin/garages
// @access  Private (Admin)
const getAllGaragesAdmin = asyncHandler(async (req, res) => {
  const garages = await User.find({ role: 'GarageOwner' }).select('-password');
  res.status(200).json(garages);
});

// @desc    Verify/unverify a garage
// @route   PUT /api/service/admin/garages/:id/verify
// @access  Private (Admin)
const verifyGarage = asyncHandler(async (req, res) => {
  const garage = await User.findOne({ _id: req.params.id, role: 'GarageOwner' });

  if (!garage) {
    res.status(404);
    throw new Error('Garage not found');
  }

  // Toggle or use explicit value
  const currentValue = garage.serviceProviderProfile?.isVerified || false;
  const newValue = req.body.isVerified !== undefined ? req.body.isVerified : !currentValue;

  const updatedGarage = await User.findByIdAndUpdate(
    req.params.id,
    { $set: { 'serviceProviderProfile.isVerified': newValue } },
    { new: true }
  ).select('-password');

  res.status(200).json(updatedGarage);
});

// @desc    Suspend/activate a garage
// @route   PUT /api/service/admin/garages/:id/suspend
// @access  Private (Admin)
const suspendGarage = asyncHandler(async (req, res) => {
  const garage = await User.findOne({ _id: req.params.id, role: 'GarageOwner' });

  if (!garage) {
    res.status(404);
    throw new Error('Garage not found');
  }

  // Toggle isActive
  const currentValue = garage.serviceProviderProfile?.isActive !== false;
  const newValue = !currentValue;

  const updatedGarage = await User.findByIdAndUpdate(
    req.params.id,
    { $set: { 'serviceProviderProfile.isActive': newValue } },
    { new: true }
  ).select('-password');

  res.status(200).json(updatedGarage);
});

// @desc    Get all bookings (admin view)
// @route   GET /api/service/admin/bookings
// @access  Private (Admin)
const getAllBookingsAdmin = asyncHandler(async (req, res) => {
  const { status, garageId, customerId, page = 1, limit = 20 } = req.query;

  const filter = {};
  if (status) filter.status = status;
  if (garageId) filter.garageId = garageId;
  if (customerId) filter.customerId = customerId;

  const pageNum = parseInt(page, 10) || 1;
  const limitNum = parseInt(limit, 10) || 20;

  const total = await RepairBooking.countDocuments(filter);
  const bookings = await RepairBooking.find(filter)
    .populate('customerId', 'name email')
    .populate('garageId', 'name serviceProviderProfile.garageName')
    .sort({ createdAt: -1 })
    .skip((pageNum - 1) * limitNum)
    .limit(limitNum);

  const pages = Math.ceil(total / limitNum);

  res.status(200).json({
    bookings,
    total,
    page: pageNum,
    pages,
  });
});

// @desc    Get platform statistics
// @route   GET /api/service/admin/stats
// @access  Private (Admin)
const getPlatformStats = asyncHandler(async (req, res) => {
  const totalGarages = await User.countDocuments({ role: 'GarageOwner' });
  const verifiedGarages = await User.countDocuments({
    role: 'GarageOwner',
    'serviceProviderProfile.isVerified': true,
  });
  const totalBookings = await RepairBooking.countDocuments();
  const totalMechanics = await User.countDocuments({ role: 'Mechanic' });

  const bookingsByStatus = await RepairBooking.aggregate([
    { $group: { _id: '$status', count: { $sum: 1 } } },
  ]);

  // Convert array to object for easier consumption
  const statusCounts = {};
  bookingsByStatus.forEach((item) => {
    statusCounts[item._id] = item.count;
  });

  res.status(200).json({
    garages: {
      total: totalGarages,
      verified: verifiedGarages,
      unverified: totalGarages - verifiedGarages,
    },
    bookings: {
      total: totalBookings,
      byStatus: statusCounts,
    },
    mechanics: {
      total: totalMechanics,
    },
  });
});

module.exports = {
  getAllGaragesAdmin,
  verifyGarage,
  suspendGarage,
  getAllBookingsAdmin,
  getPlatformStats,
};
