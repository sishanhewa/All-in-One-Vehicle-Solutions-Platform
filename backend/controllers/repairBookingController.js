const asyncHandler = require('express-async-handler');
const mongoose = require('mongoose');
const RepairBooking = require('../models/RepairBooking');
const ServiceOffering = require('../models/ServiceOffering');
const User = require('../models/User');
const ServiceProvider = require('../models/ServiceProvider');

const getMyGarageForOwner = async (res, user) => {
  const myGarage = await ServiceProvider.findOne({ ownerId: user._id });
  if (!myGarage) {
    res.status(404);
    throw new Error('You do not own a registered garage');
  }
  return myGarage;
};

const toNonNegativeNumber = (value) => {
  const number = Number(value);
  return Number.isFinite(number) && number >= 0 ? number : null;
};

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
  if (!garageId || !serviceOfferingIds || !preferredDate) {
    res.status(400);
    throw new Error('Please provide: garageId, serviceOfferingIds, and preferredDate');
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

  // Validate garage - must be verified and active
  const garage = await ServiceProvider.findOne({
    _id: garageId,
    isVerified: true,
    isActive: true,
  });

  if (!garage) {
    res.status(404);
    throw new Error('Garage not found or not accepting bookings');
  }

  // Duplicate booking guard: block if an active booking already exists for same customer + garage + date
  const existingBooking = await RepairBooking.findOne({
    customerId: req.user._id,
    garageId,
    preferredDate: new Date(preferredDate),
    status: { $nin: ['cancelled', 'completed'] },
  });
  if (existingBooking) {
    res.status(409);
    throw new Error('You already have an active booking at this garage for the same date. Please choose a different date or cancel the existing booking.');
  }

  // Validate each service offering in parallel (single round-trip)
  const offeringResults = await Promise.all(
    serviceOfferingIds.map((offeringId) =>
      ServiceOffering.findOne({ _id: offeringId, garageId, isActive: true })
    )
  );

  let estimatedTotal = 0;
  for (let i = 0; i < offeringResults.length; i++) {
    if (!offeringResults[i]) {
      res.status(404);
      throw new Error(`Service offering ${serviceOfferingIds[i]} not found or unavailable`);
    }
    estimatedTotal += offeringResults[i].estimatedPrice;
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
    { path: 'garageId', select: 'garageName city logo ownerId' },
    { path: 'serviceOfferingIds', select: 'name estimatedPrice estimatedDuration category' },
  ]);

  res.status(201).json(booking);
});

// @desc    Get customer's bookings
// @route   GET /api/service/bookings/my-bookings
// @access  Private
const getMyBookings = asyncHandler(async (req, res) => {
  const { status, page = 1, limit = 20 } = req.query;

  let query = { customerId: req.user._id };
  if (status) query.status = status;

  const pageNum = Math.max(1, parseInt(page, 10) || 1);
  const limitNum = Math.min(50, Math.max(1, parseInt(limit, 10) || 20));

  const bookings = await RepairBooking.find(query)
    .populate('garageId', 'garageName city logo ownerId')
    .populate('serviceOfferingIds', 'name category estimatedPrice estimatedDuration')
    .populate('assignedMechanicId', 'name')
    .populate('cancelledBy', 'name role')
    .sort({ createdAt: -1 })
    .skip((pageNum - 1) * limitNum)
    .limit(limitNum);

  const total = await RepairBooking.countDocuments(query);

  // Attach review data without N+1 — single query on Review collection
  const Review = require('../models/Review');
  const bookingIds = bookings.map((b) => b._id);
  const reviews = await Review.find({ bookingId: { $in: bookingIds } }).lean();
  const reviewMap = new Map(reviews.map((r) => [r.bookingId.toString(), r]));

  const result = bookings.map((b) => {
    const bookingObj = b.toObject();
    const review = reviewMap.get(b._id.toString());
    return {
      ...bookingObj,
      hasReview: !!review,
      review: review || null,
    };
  });

  res.status(200).json({
    bookings: result,
    pagination: {
      page: pageNum,
      limit: limitNum,
      total,
      pages: Math.ceil(total / limitNum),
    },
  });
});

// @desc    Get garage owner's booking queue
// @route   GET /api/service/bookings/queue
// @access  Private (GarageOwner)
const getBookingQueue = asyncHandler(async (req, res) => {
  const { status, mechanicId, dateFrom, dateTo, page = 1, limit = 20 } = req.query;

  const myGarage = await getMyGarageForOwner(res, req.user);
  let query = { garageId: myGarage._id };

  const pageNum = Math.max(1, parseInt(page, 10) || 1);
  const limitNum = Math.min(50, Math.max(1, parseInt(limit, 10) || 20));

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
    .sort({ createdAt: -1 })
    .skip((pageNum - 1) * limitNum)
    .limit(limitNum);

  const total = await RepairBooking.countDocuments(query);

  // Build base counts query (same filters as bookings, excluding status filter)
  const countsQuery = { garageId: myGarage._id };
  if (mechanicId) countsQuery.assignedMechanicId = mechanicId;
  if (dateFrom || dateTo) {
    countsQuery.preferredDate = {};
    if (dateFrom) countsQuery.preferredDate.$gte = new Date(dateFrom);
    if (dateTo) countsQuery.preferredDate.$lte = new Date(dateTo);
  }

  // Count bookings per status (respecting the same filters)
  const counts = await RepairBooking.aggregate([
    { $match: countsQuery },
    { $group: { _id: '$status', count: { $sum: 1 } } },
  ]);

  const countsMap = {
    pending_confirmation: 0,
    confirmed: 0,
    in_progress: 0,
    ready_for_pickup: 0,
    completed: 0,
    cancelled: 0,
  };

  counts.forEach((item) => {
    countsMap[item._id] = item.count;
  });

  res.status(200).json({
    bookings,
    counts: countsMap,
    pagination: {
      page: pageNum,
      limit: limitNum,
      total,
      pages: Math.ceil(total / limitNum),
    },
  });
});

// @desc    Get mechanic's assigned jobs
// @route   GET /api/service/bookings/my-jobs
// @access  Private (Mechanic)
const getMyJobs = asyncHandler(async (req, res) => {
  const { status, page = 1, limit = 20 } = req.query;

  // Active statuses: what a mechanic cares about day-to-day
  const ACTIVE_STATUSES = ['confirmed', 'in_progress', 'ready_for_pickup'];

  let query = { assignedMechanicId: req.user._id };

  if (status && status !== 'All') {
    // Explicit filter requested
    query.status = status;
  } else if (!status) {
    // Default: only active jobs (no cancelled/completed noise)
    query.status = { $in: ACTIVE_STATUSES };
  }
  // status === 'All' → no status filter, show everything

  const pageNum = Math.max(1, parseInt(page, 10) || 1);
  const limitNum = Math.min(50, Math.max(1, parseInt(limit, 10) || 20));

  const bookings = await RepairBooking.find(query)
    .populate('customerId', 'name phone')
    .populate('garageId', 'garageName city logo ownerId')
    .populate('serviceOfferingIds', 'name category estimatedDuration')
    .sort({ preferredDate: 1 })
    .skip((pageNum - 1) * limitNum)
    .limit(limitNum);

  const total = await RepairBooking.countDocuments(query);

  res.status(200).json({
    bookings,
    pagination: {
      page: pageNum,
      limit: limitNum,
      total,
      pages: Math.ceil(total / limitNum),
    },
  });
});

// @desc    Get single booking by ID (scoped by role)
// @route   GET /api/service/bookings/:id
// @access  Private
const getBookingById = asyncHandler(async (req, res) => {
  const booking = await RepairBooking.findById(req.params.id)
    .populate('customerId', 'name email phone')
    .populate('garageId', 'garageName city logo ownerId')
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
    const myGarage = await ServiceProvider.findOne({ ownerId: req.user._id });
    hasAccess = Boolean(myGarage && booking.garageId._id.toString() === myGarage._id.toString());
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
  const myGarage = await getMyGarageForOwner(res, req.user);

  const booking = await RepairBooking.findById(req.params.id);
  if (!booking) {
    res.status(404);
    throw new Error('Booking not found');
  }

  if (booking.garageId.toString() !== myGarage._id.toString()) {
    res.status(403);
    throw new Error('Not authorized');
  }

  assertBookingStatus(res, booking, ['pending_confirmation']);

  const { assignedMechanicId, ownerNotes } = req.body;

  // Validate mechanic belongs to this garage
  if (assignedMechanicId) {
    const mechanic = await User.findById(assignedMechanicId);
    if (!mechanic || mechanic.role !== 'Mechanic' || mechanic.garageId.toString() !== myGarage._id.toString()) {
      res.status(400);
      throw new Error('Invalid mechanic or mechanic not in your garage');
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
  const myGarage = await getMyGarageForOwner(res, req.user);

  const booking = await RepairBooking.findById(req.params.id);
  if (!booking) {
    res.status(404);
    throw new Error('Booking not found');
  }

  if (booking.garageId.toString() !== myGarage._id.toString()) {
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
  const myGarage = await getMyGarageForOwner(res, req.user);

  const booking = await RepairBooking.findById(req.params.id);
  if (!booking) {
    res.status(404);
    throw new Error('Booking not found');
  }

  if (booking.garageId.toString() !== myGarage._id.toString()) {
    res.status(403);
    throw new Error('Not authorized');
  }

  assertBookingStatus(res, booking, ['ready_for_pickup']);

  const parsedFinalInvoiceAmount = toNonNegativeNumber(req.body.finalInvoiceAmount || 0);
  if (parsedFinalInvoiceAmount === null) {
    res.status(400);
    throw new Error('finalInvoiceAmount must be a non-negative number');
  }

  // Calculate total parts cost
  const partsCost = Array.isArray(booking.partsUsed)
    ? booking.partsUsed.reduce((sum, part) => sum + ((part.price || 0) * (part.quantity || 0)), 0)
    : 0;

  // Warn if invoice is less than parts cost (data integrity issue)
  if (parsedFinalInvoiceAmount < partsCost) {
    res.status(400);
    throw new Error(`Final invoice amount (Rs. ${parsedFinalInvoiceAmount}) cannot be less than parts cost (Rs. ${partsCost}). Please verify parts used or adjust the invoice amount.`);
  }

  booking.finalInvoiceAmount = parsedFinalInvoiceAmount;
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

  // Authorization: customer or garage owner (role must be GarageOwner for garage-side cancel)
  const isCustomer = booking.customerId.toString() === req.user._id.toString();
  let isGarageOwnerForBooking = false;
  if (req.user.role === 'GarageOwner') {
    const myGarage = await ServiceProvider.findOne({ ownerId: req.user._id });
    isGarageOwnerForBooking = Boolean(
      myGarage && booking.garageId.toString() === myGarage._id.toString(),
    );
  }

  if (!isCustomer && !isGarageOwnerForBooking) {
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
    // Validate partsUsed structure
    if (!Array.isArray(req.body.partsUsed)) {
      res.status(400);
      throw new Error('partsUsed must be an array');
    }
    
    // Validate each part has required fields
    for (let i = 0; i < req.body.partsUsed.length; i++) {
      const part = req.body.partsUsed[i];
      if (!part.name || typeof part.name !== 'string') {
        res.status(400);
        throw new Error(`Part at index ${i} must have a valid name`);
      }
      if (typeof part.quantity !== 'number' || part.quantity < 1 || !Number.isInteger(part.quantity)) {
        res.status(400);
        throw new Error(`Part "${part.name}" must have a valid quantity (positive integer)`);
      }
      if (typeof part.price !== 'number' || part.price < 0) {
        res.status(400);
        throw new Error(`Part "${part.name}" must have a valid price (non-negative number)`);
      }
    }
    
    booking.partsUsed = req.body.partsUsed;
  }

  await booking.save();
  res.status(200).json(booking);
});

// @desc    Reassign a mechanic on an already-confirmed booking (GarageOwner)
// @route   PUT /api/service/bookings/:id/reassign
// @access  Private (GarageOwner)
const reassignMechanic = asyncHandler(async (req, res) => {
  const myGarage = await getMyGarageForOwner(res, req.user);

  const booking = await RepairBooking.findById(req.params.id);
  if (!booking) {
    res.status(404);
    throw new Error('Booking not found');
  }

  if (booking.garageId.toString() !== myGarage._id.toString()) {
    res.status(403);
    throw new Error('Not authorized');
  }

  // Only allow reassignment on active (non-terminal) bookings
  assertBookingStatus(res, booking, ['confirmed', 'in_progress'], 'Can only reassign mechanic on confirmed or in-progress bookings');

  const { assignedMechanicId, note } = req.body;
  if (!assignedMechanicId) {
    res.status(400);
    throw new Error('Please provide assignedMechanicId');
  }

  // Validate mechanic belongs to this garage
  const mechanic = await User.findById(assignedMechanicId);
  if (!mechanic || mechanic.role !== 'Mechanic' || mechanic.garageId?.toString() !== myGarage._id.toString()) {
    res.status(400);
    throw new Error('Invalid mechanic or mechanic not in your garage');
  }

  booking.assignedMechanicId = mechanic._id;
  booking.statusHistory.push({
    status: booking.status,
    changedBy: req.user._id,
    changedAt: new Date(),
    note: note || `Mechanic reassigned to ${mechanic.name}`,
  });

  await booking.save();
  res.status(200).json(booking);
});

// @desc    Customer updates a pending booking (date / time / vehicle / notes / services)
// @route   PUT /api/service/bookings/:id
// @access  Private (User — customer only)
const updatePendingBooking = asyncHandler(async (req, res) => {
  const booking = await RepairBooking.findById(req.params.id);
  if (!booking) {
    res.status(404);
    throw new Error('Booking not found');
  }

  // Only the owning customer can edit
  if (booking.customerId.toString() !== req.user._id.toString()) {
    res.status(403);
    throw new Error('Not authorized');
  }

  assertBookingStatus(res, booking, ['pending_confirmation'], 'Booking can only be edited while pending confirmation');

  const { preferredDate, preferredTime, vehicleInfo, customerNotes, serviceOfferingIds } = req.body;

  // Validate and update preferredDate (must be today or future)
  if (preferredDate) {
    const newDate = new Date(preferredDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (newDate < today) {
      res.status(400);
      throw new Error('Preferred date cannot be in the past');
    }

    // Duplicate booking guard: block if another active booking exists for same customer + garage + date
    const existingBooking = await RepairBooking.findOne({
      _id: { $ne: booking._id }, // Exclude current booking
      customerId: req.user._id,
      garageId: booking.garageId,
      preferredDate: newDate,
      status: { $nin: ['cancelled', 'completed'] },
    });
    if (existingBooking) {
      res.status(409);
      throw new Error('You already have another active booking at this garage for the same date. Please choose a different date.');
    }

    booking.preferredDate = newDate;
  }

  if (preferredTime) booking.preferredTime = preferredTime;
  if (customerNotes !== undefined) booking.customerNotes = customerNotes;

  // Partial vehicleInfo update — only fields provided are overwritten
  if (vehicleInfo && typeof vehicleInfo === 'object') {
    Object.assign(booking.vehicleInfo, vehicleInfo);
  }

  // Update service offerings and recalculate estimated total
  if (serviceOfferingIds && Array.isArray(serviceOfferingIds) && serviceOfferingIds.length > 0) {
    const offeringResults = await Promise.all(
      serviceOfferingIds.map((offeringId) =>
        ServiceOffering.findOne({ _id: offeringId, garageId: booking.garageId, isActive: true })
      )
    );

    let estimatedTotal = 0;
    for (let i = 0; i < offeringResults.length; i++) {
      if (!offeringResults[i]) {
        res.status(404);
        throw new Error(`Service offering ${serviceOfferingIds[i]} not found or unavailable at this garage`);
      }
      estimatedTotal += offeringResults[i].estimatedPrice;
    }

    booking.serviceOfferingIds = serviceOfferingIds;
    booking.estimatedTotal = estimatedTotal;
  }

  await booking.save();

  // Populate references before returning
  await booking.populate([
    { path: 'garageId', select: 'garageName city address phone' },
    { path: 'serviceOfferingIds', select: 'name category estimatedPrice estimatedDuration' },
    { path: 'assignedMechanicId', select: 'name phone' },
  ]);

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
  reassignMechanic,
  updatePendingBooking,
};
