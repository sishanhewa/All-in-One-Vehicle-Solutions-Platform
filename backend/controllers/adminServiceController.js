const asyncHandler = require('express-async-handler');
const mongoose = require('mongoose');
const User = require('../models/User');
const RepairBooking = require('../models/RepairBooking');
const ServiceProvider = require('../models/ServiceProvider');
const ServiceOffering = require('../models/ServiceOffering');

// ─── Garages ──────────────────────────────────────────────────────────────────

// @desc    Get all garages (admin view)
// @route   GET /api/service/admin/garages
// @access  Private (Admin)
const getAllGaragesAdmin = asyncHandler(async (req, res) => {
  const garages = await ServiceProvider.find().populate('ownerId', 'name email phone role isActive');
  res.status(200).json(garages);
});

// @desc    Verify / unverify a garage
// @route   PUT /api/service/admin/garages/:id/verify
// @access  Private (Admin)
const verifyGarage = asyncHandler(async (req, res) => {
  let garage = await ServiceProvider.findById(req.params.id);
  if (!garage) garage = await ServiceProvider.findOne({ ownerId: req.params.id });

  if (!garage) {
    res.status(404);
    throw new Error('Garage not found');
  }

  const currentValue = garage.isVerified || false;
  const newValue = req.body.isVerified !== undefined ? req.body.isVerified : !currentValue;

  const updated = await ServiceProvider.findByIdAndUpdate(
    garage._id,
    { $set: { isVerified: newValue } },
    { new: true }
  ).populate('ownerId', 'name email phone role');

  res.status(200).json(updated);
});

// @desc    Suspend / activate a garage
// @route   PUT /api/service/admin/garages/:id/suspend
// @access  Private (Admin)
const suspendGarage = asyncHandler(async (req, res) => {
  let garage = await ServiceProvider.findById(req.params.id);
  if (!garage) garage = await ServiceProvider.findOne({ ownerId: req.params.id });

  if (!garage) {
    res.status(404);
    throw new Error('Garage not found');
  }

  const newValue = !garage.isActive;

  const updated = await ServiceProvider.findByIdAndUpdate(
    garage._id,
    { $set: { isActive: newValue } },
    { new: true }
  ).populate('ownerId', 'name email phone role');

  res.status(200).json(updated);
});

// @desc    Hard-delete a garage + cascade: offerings, mechanics (unlink), owner account
// @route   DELETE /api/service/admin/garages/:id
// @access  Private (Admin)
const deleteGarage = asyncHandler(async (req, res) => {
  const garage = await ServiceProvider.findById(req.params.id);
  if (!garage) {
    res.status(404);
    throw new Error('Garage not found');
  }

  const session = await mongoose.startSession();
  try {
    await session.withTransaction(async () => {
      // 1. Delete all service offerings for this garage
      await ServiceOffering.deleteMany({ garageId: garage._id }, { session });

      // 2. Unlink mechanics (reset garageId, keep their User accounts)
      await User.updateMany(
        { garageId: garage._id, role: 'Mechanic' },
        { $set: { garageId: null } },
        { session }
      );

      // 3. Delete the garage owner's User account
      await User.findByIdAndDelete(garage.ownerId, { session });

      // 4. Delete the ServiceProvider document
      await ServiceProvider.findByIdAndDelete(garage._id, { session });
    });
  } finally {
    await session.endSession();
  }

  res.status(200).json({ message: 'Garage and associated data deleted' });
});

// ─── Bookings ─────────────────────────────────────────────────────────────────

// @desc    Get all bookings (admin view, paginated + filterable)
// @route   GET /api/service/admin/bookings
// @access  Private (Admin)
const getAllBookingsAdmin = asyncHandler(async (req, res) => {
  const { status, garageId, customerId, page = 1, limit = 20 } = req.query;

  const filter = {};
  if (status)     filter.status     = status;
  if (garageId)   filter.garageId   = garageId;
  if (customerId) filter.customerId = customerId;

  const pageNum  = parseInt(page,  10) || 1;
  const limitNum = parseInt(limit, 10) || 20;

  const total    = await RepairBooking.countDocuments(filter);
  const bookings = await RepairBooking.find(filter)
    .populate('customerId', 'name email')
    .populate('garageId',   'garageName city logo')
    .sort({ createdAt: -1 })
    .skip((pageNum - 1) * limitNum)
    .limit(limitNum);

  res.status(200).json({ bookings, total, page: pageNum, pages: Math.ceil(total / limitNum) });
});

// @desc    Hard-delete a single booking (Admin only)
// @route   DELETE /api/service/admin/bookings/:id
// @access  Private (Admin)
const deleteBooking = asyncHandler(async (req, res) => {
  const booking = await RepairBooking.findById(req.params.id);
  if (!booking) {
    res.status(404);
    throw new Error('Booking not found');
  }
  await booking.deleteOne();
  res.status(200).json({ message: 'Booking deleted' });
});

// ─── Platform stats ───────────────────────────────────────────────────────────

// @desc    Platform statistics
// @route   GET /api/service/admin/stats
// @access  Private (Admin)
const getPlatformStats = asyncHandler(async (req, res) => {
  const [totalGarages, verifiedGarages, totalBookings, totalMechanics, totalCustomers, bookingsByStatus] =
    await Promise.all([
      ServiceProvider.countDocuments(),
      ServiceProvider.countDocuments({ isVerified: true }),
      RepairBooking.countDocuments(),
      User.countDocuments({ role: 'Mechanic' }),
      User.countDocuments({ role: 'User' }),
      RepairBooking.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]),
    ]);

  const statusCounts = {};
  bookingsByStatus.forEach((item) => { statusCounts[item._id] = item.count; });

  res.status(200).json({
    garages:   { total: totalGarages, verified: verifiedGarages, unverified: totalGarages - verifiedGarages },
    bookings:  { total: totalBookings, byStatus: statusCounts },
    mechanics: { total: totalMechanics },
    customers: { total: totalCustomers },
  });
});

// ─── Users ────────────────────────────────────────────────────────────────────

// @desc    List all users (filterable by role, search by name/email)
// @route   GET /api/service/admin/users
// @access  Private (Admin)
const getAllUsersAdmin = asyncHandler(async (req, res) => {
  const { role, search, page = 1, limit = 20 } = req.query;

  const filter = {};
  if (role) filter.role = role;
  if (search) {
    const esc = search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    filter.$or = [
      { name:  { $regex: esc, $options: 'i' } },
      { email: { $regex: esc, $options: 'i' } },
    ];
  }

  const pageNum  = parseInt(page,  10) || 1;
  const limitNum = parseInt(limit, 10) || 20;

  const total = await User.countDocuments(filter);
  const users = await User.find(filter)
    .select('-password')
    .populate('garageId', 'garageName city')
    .sort({ createdAt: -1 })
    .skip((pageNum - 1) * limitNum)
    .limit(limitNum);

  res.status(200).json({ users, total, page: pageNum, pages: Math.ceil(total / limitNum) });
});

// @desc    Get a single user (admin view)
// @route   GET /api/service/admin/users/:id
// @access  Private (Admin)
const getUserByIdAdmin = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id)
    .select('-password')
    .populate('garageId', 'garageName city isVerified isActive');

  if (!user) {
    res.status(404);
    throw new Error('User not found');
  }

  res.status(200).json(user);
});

// @desc    Change a user's role (Admin)
// @route   PUT /api/service/admin/users/:id/role
// @access  Private (Admin)
const changeUserRole = asyncHandler(async (req, res) => {
  const { role } = req.body;
  const allowed = ['User', 'Admin', 'GarageOwner', 'Mechanic', 'InspectionCompany'];

  if (!role || !allowed.includes(role)) {
    res.status(400);
    throw new Error(`Role must be one of: ${allowed.join(', ')}`);
  }

  const user = await User.findByIdAndUpdate(
    req.params.id,
    { $set: { role } },
    { new: true }
  ).select('-password');

  if (!user) {
    res.status(404);
    throw new Error('User not found');
  }

  res.status(200).json(user);
});

// @desc    Toggle a user's isActive (Admin)
// @route   PUT /api/service/admin/users/:id/toggle-active
// @access  Private (Admin)
const toggleUserActive = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user) {
    res.status(404);
    throw new Error('User not found');
  }

  user.isActive = !user.isActive;
  await user.save();

  res.status(200).json({
    _id:      user._id,
    name:     user.name,
    isActive: user.isActive,
    message:  user.isActive ? 'User activated' : 'User deactivated',
  });
});

module.exports = {
  getAllGaragesAdmin,
  verifyGarage,
  suspendGarage,
  deleteGarage,
  getAllBookingsAdmin,
  deleteBooking,
  getPlatformStats,
  getAllUsersAdmin,
  getUserByIdAdmin,
  changeUserRole,
  toggleUserActive,
};
