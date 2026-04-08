const asyncHandler = require('express-async-handler');
const mongoose = require('mongoose');
const RepairBooking = require('../models/RepairBooking');
const ServiceOffering = require('../models/ServiceOffering');
const User = require('../models/User');

// Helper: Assert booking status (returns true or throws with res.status set)
const assertBookingStatus = (res, booking, expectedStatuses, errorMsg) => {
  if (!expectedStatuses.includes(booking.status)) {
    res.status(400);
    throw new Error(errorMsg || `Action not allowed in status: ${booking.status}`);
  }
};

// Helper: Add status history entry
const addStatusHistory = (booking, status, userId, note = '') => {
  booking.statusHistory.push({ status, changedBy: userId, changedAt: new Date(), note });
  booking.status = status;
};

// @desc    Create a new repair booking
// @route   POST /api/service/bookings
// @access  Private (User)
const createBooking = asyncHandler(async (req, res) => {
  // Block service providers from booking
  if (req.user.role !== 'User') {
    res.status(403);
    throw new Error('Service providers cannot book their own services');
  }

  const { garageId, serviceOfferingIds, preferredDate, preferredTime, vehicleInfo, customerNotes } = req.body;

  // Validate required fields
  if (!garageId || !serviceOfferingIds || !preferredDate || !preferredTime) {
    res.status(400);
    throw new Error('Please provide: garageId, serviceOfferingIds, preferredDate, and preferredTime');
  }

  // Validate serviceOfferingIds is a non-empty array
  if (!Array.isArray(serviceOfferingIds) || serviceOfferingIds.length === 0) {
    res.status(400);
    throw new Error('serviceOfferingIds must be a non-empty array');
  }

  // Validate each offeringId is a valid MongoDB ObjectId
  for (const offeringId of serviceOfferingIds) {
    if (!mongoose.Types.ObjectId.isValid(offeringId)) {
      res.status(400);
      throw new Error(`Invalid service offering ID: "${offeringId}". Check your request variables.`);
    }
  }

  // Validate vehicleInfo fields
  if (!vehicleInfo || !vehicleInfo.make || !vehicleInfo.model || !vehicleInfo.year || !vehicleInfo.plateNumber) {
    res.status(400);
    throw new Error('Please provide vehicleInfo with make, model, year, and plateNumber');
  }

  // Validate garage - must be verified and active GarageOwner
  const garage = await User.findOne({
    _id: garageId,
    role: 'GarageOwner',
    'serviceProviderProfile.isVerified': true,
    'serviceProviderProfile.isActive': true,
  });

  if (!garage) {
    res.status(404);
    throw new Error('Garage not found or not accepting bookings');
  }

  // Validate each service offering
  let estimatedTotal = 0;
  for (const offeringId of serviceOfferingIds) {
    const offering = await ServiceOffering.findOne({
      _id: offeringId,
      garageId,
      isActive: true,
    });

    if (!offering) {
      res.status(404);
      throw new Error(`Service offering ${offeringId} not found or unavailable`);
    }

    estimatedTotal += offering.estimatedPrice;
  }

  // Create the booking
  const booking = new RepairBooking({
    customerId: req.user._id,
    garageId,
    serviceOfferingIds,
    vehicleInfo,
    preferredDate: new Date(preferredDate),
    preferredTime,
    customerNotes: customerNotes || '',
    estimatedTotal,
    status: 'pending_confirmation',
    statusHistory: [
      {
        status: 'pending_confirmation',
        changedBy: req.user._id,
        changedAt: new Date(),
        note: 'Booking submitted',
      },
    ],
  });

  await booking.save();

  // Populate references
  await booking.populate([
    { path: 'customerId', select: 'name email phone' },
    { path: 'garageId', select: 'name serviceProviderProfile' },
    { path: 'serviceOfferingIds', select: 'name estimatedPrice estimatedDuration category' },
  ]);

  res.status(201).json(booking);
});

// @desc    Get customer's bookings
// @route   GET /api/service/bookings/my-bookings
// @access  Private
const getMyBookings = asyncHandler(async (req, res) => {
  const { status } = req.query;

  let query = { customerId: req.user._id };
  if (status) {
    query.status = status;
  }

  const bookings = await RepairBooking.find(query)
    .populate('garageId', 'name serviceProviderProfile.garageName serviceProviderProfile.city serviceProviderProfile.logo')
    .populate('serviceOfferingIds', 'name category')
    .populate('assignedMechanicId', 'name')
    .sort({ createdAt: -1 });

  res.status(200).json(bookings);
});

// @desc    Get garage owner's booking queue
// @route   GET /api/service/bookings/queue
// @access  Private (GarageOwner)
const getBookingQueue = asyncHandler(async (req, res) => {
  const { status, mechanicId, dateFrom, dateTo } = req.query;

  let query = { garageId: req.user._id };

  if (status) {
    query.status = status;
  }

  if (mechanicId) {
    query.assignedMechanicId = mechanicId;
  }

  if (dateFrom || dateTo) {
    query.preferredDate = {};
    if (dateFrom) query.preferredDate.$gte = new Date(dateFrom);
    if (dateTo) query.preferredDate.$lte = new Date(dateTo);
  }

  const bookings = await RepairBooking.find(query)
    .populate('customerId', 'name email phone')
    .populate('serviceOfferingIds', 'name estimatedPrice')
    .populate('assignedMechanicId', 'name phone')
    .sort({ createdAt: -1 });

  // Count bookings per status
  const counts = await RepairBooking.aggregate([
    { $match: { garageId: req.user._id } },
    { $group: { _id: '$status', count: { $sum: 1 } } },
  ]);

  const countsMap = {
    pending_confirmation: 0,
    confirmed: 0,
    in_progress: 0,
    ready_for_pickup: 0,
  };

  counts.forEach((item) => {
    countsMap[item._id] = item.count;
  });

  res.status(200).json({ bookings, counts: countsMap });
});

// @desc    Get mechanic's assigned jobs
// @route   GET /api/service/bookings/my-jobs
// @access  Private (Mechanic)
const getMyJobs = asyncHandler(async (req, res) => {
  const { status } = req.query;

  let query = { assignedMechanicId: req.user._id };

  if (status) {
    query.status = status;
  }

  const bookings = await RepairBooking.find(query)
    .populate('customerId', 'name phone')
    .populate('garageId', 'name serviceProviderProfile.garageName')
    .populate('serviceOfferingIds', 'name category estimatedDuration')
    .sort({ preferredDate: 1 });

  res.status(200).json(bookings);
});

// @desc    Get single booking by ID (scoped by role)
// @route   GET /api/service/bookings/:id
// @access  Private
const getBookingById = asyncHandler(async (req, res) => {
  const booking = await RepairBooking.findById(req.params.id)
    .populate('customerId', 'name email phone')
    .populate('garageId', 'name serviceProviderProfile')
    .populate('serviceOfferingIds', 'name category estimatedPrice estimatedDuration')
    .populate('assignedMechanicId', 'name phone');

  if (!booking) {
    res.status(404);
    throw new Error('Booking not found');
  }

  // Scope check based on role
  const userRole = req.user.role;
  const userId = req.user._id.toString();
  let hasAccess = false;

  if (userRole === 'Admin') {
    hasAccess = true;
  } else if (userRole === 'User') {
    hasAccess = booking.customerId._id.toString() === userId;
  } else if (userRole === 'GarageOwner') {
    hasAccess = booking.garageId._id.toString() === userId;
  } else if (userRole === 'Mechanic') {
    hasAccess = booking.assignedMechanicId && booking.assignedMechanicId._id.toString() === userId;
  }

  if (!hasAccess) {
    res.status(403);
    throw new Error('Access denied');
  }

  res.status(200).json(booking);
});

// @desc    Confirm booking and assign mechanic (GarageOwner)
// @route   PUT /api/service/bookings/:id/confirm
// @access  Private (GarageOwner)
const confirmBooking = asyncHandler(async (req, res) => {
  const booking = await RepairBooking.findById(req.params.id);
  if (!booking) {
    res.status(404);
    throw new Error('Booking not found');
  }

  if (booking.garageId.toString() !== req.user._id.toString()) {
    res.status(403);
    throw new Error('Not authorized');
  }

  assertBookingStatus(res, booking, ['pending_confirmation']);

  const { assignedMechanicId, ownerNotes } = req.body;

  // Validate mechanic belongs to this garage
  if (assignedMechanicId) {
    const mechanic = await User.findById(assignedMechanicId);
    if (!mechanic || mechanic.role !== 'Mechanic' || mechanic.garageId.toString() !== req.user._id.toString()) {
      res.status(400);
      throw new Error('Invalid mechanic');
    }
    booking.assignedMechanicId = mechanic._id;
  }

  if (ownerNotes) {
    booking.ownerNotes = ownerNotes;
  }

  addStatusHistory(booking, 'confirmed', req.user._id, 'Booking confirmed and mechanic assigned');
  await booking.save();

  res.status(200).json(booking);
});

// @desc    Decline booking (GarageOwner)
// @route   PUT /api/service/bookings/:id/decline
// @access  Private (GarageOwner)
const declineBooking = asyncHandler(async (req, res) => {
  const booking = await RepairBooking.findById(req.params.id);
  if (!booking) {
    res.status(404);
    throw new Error('Booking not found');
  }

  if (booking.garageId.toString() !== req.user._id.toString()) {
    res.status(403);
    throw new Error('Not authorized');
  }

  assertBookingStatus(res, booking, ['pending_confirmation']);

  booking.cancelReason = req.body.reason || 'Declined by garage';
  booking.cancelledBy = req.user._id;
  addStatusHistory(booking, 'cancelled', req.user._id, booking.cancelReason);
  await booking.save();

  res.status(200).json(booking);
});

// @desc    Start job (Mechanic)
// @route   PUT /api/service/bookings/:id/start
// @access  Private (Mechanic)
const startJob = asyncHandler(async (req, res) => {
  const booking = await RepairBooking.findById(req.params.id);
  if (!booking) {
    res.status(404);
    throw new Error('Booking not found');
  }

  if (!booking.assignedMechanicId || booking.assignedMechanicId.toString() !== req.user._id.toString()) {
    res.status(403);
    throw new Error('Not authorized');
  }

  assertBookingStatus(res, booking, ['confirmed']);

  addStatusHistory(booking, 'in_progress', req.user._id, 'Work started');
  await booking.save();

  res.status(200).json(booking);
});

// @desc    Mark job ready for pickup (Mechanic)
// @route   PUT /api/service/bookings/:id/ready
// @access  Private (Mechanic)
const markReadyForPickup = asyncHandler(async (req, res) => {
  const booking = await RepairBooking.findById(req.params.id);
  if (!booking) {
    res.status(404);
    throw new Error('Booking not found');
  }

  if (!booking.assignedMechanicId || booking.assignedMechanicId.toString() !== req.user._id.toString()) {
    res.status(403);
    throw new Error('Not authorized');
  }

  assertBookingStatus(res, booking, ['in_progress']);

  addStatusHistory(booking, 'ready_for_pickup', req.user._id, 'Vehicle ready for pickup');
  await booking.save();

  res.status(200).json(booking);
});

// @desc    Complete booking (GarageOwner)
// @route   PUT /api/service/bookings/:id/complete
// @access  Private (GarageOwner)
const completeBooking = asyncHandler(async (req, res) => {
  const booking = await RepairBooking.findById(req.params.id);
  if (!booking) {
    res.status(404);
    throw new Error('Booking not found');
  }

  if (booking.garageId.toString() !== req.user._id.toString()) {
    res.status(403);
    throw new Error('Not authorized');
  }

  assertBookingStatus(res, booking, ['ready_for_pickup']);

  booking.finalInvoiceAmount = req.body.finalInvoiceAmount || 0;
  addStatusHistory(booking, 'completed', req.user._id, 'Job completed');
  await booking.save();

  res.status(200).json(booking);
});

// @desc    Cancel booking (Customer or GarageOwner)
// @route   PUT /api/service/bookings/:id/cancel
// @access  Private
const cancelBooking = asyncHandler(async (req, res) => {
  const booking = await RepairBooking.findById(req.params.id);
  if (!booking) {
    res.status(404);
    throw new Error('Booking not found');
  }

  // Authorization: customer or garage owner
  const isCustomer = booking.customerId.toString() === req.user._id.toString();
  const isGarageOwner = booking.garageId.toString() === req.user._id.toString();

  if (!isCustomer && !isGarageOwner) {
    res.status(403);
    throw new Error('Not authorized');
  }

  assertBookingStatus(res, booking, ['pending_confirmation', 'confirmed'], 'Cannot cancel booking at this stage');

  booking.cancelReason = req.body.reason || '';
  booking.cancelledBy = req.user._id;
  addStatusHistory(booking, 'cancelled', req.user._id, booking.cancelReason || 'Cancelled');
  await booking.save();

  res.status(200).json(booking);
});

// @desc    Update job notes and parts (Mechanic)
// @route   PUT /api/service/bookings/:id/notes
// @access  Private (Mechanic)
const updateJobNotes = asyncHandler(async (req, res) => {
  const booking = await RepairBooking.findById(req.params.id);
  if (!booking) {
    res.status(404);
    throw new Error('Booking not found');
  }

  if (!booking.assignedMechanicId || booking.assignedMechanicId.toString() !== req.user._id.toString()) {
    res.status(403);
    throw new Error('Not authorized');
  }

  assertBookingStatus(res, booking, ['confirmed', 'in_progress', 'ready_for_pickup'], 'Cannot update notes at this stage');

  if (req.body.mechanicNotes !== undefined) {
    booking.mechanicNotes = req.body.mechanicNotes;
  }

  if (req.body.partsUsed !== undefined) {
    booking.partsUsed = req.body.partsUsed;
  }

  await booking.save();
  res.status(200).json(booking);
});

module.exports = {
  createBooking,
  getMyBookings,
  getBookingQueue,
  getMyJobs,
  getBookingById,
  confirmBooking,
  declineBooking,
  startJob,
  markReadyForPickup,
  completeBooking,
  cancelBooking,
  updateJobNotes,
};
