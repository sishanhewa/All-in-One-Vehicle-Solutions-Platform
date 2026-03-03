const asyncHandler = require('express-async-handler');
const InspectionBooking = require('../models/InspectionBooking');
const InspectionPackage = require('../models/InspectionPackage');
const User = require('../models/User');

// @desc    Create a new inspection booking
// @route   POST /api/inspection/bookings
// @access  Private (User)
const createBooking = asyncHandler(async (req, res) => {
  const {
    companyId, packageId, appointmentDate, appointmentTime, notes,
    make, model, year, plateNumber, vehicleType
  } = req.body;

  if (!companyId || !packageId || !appointmentDate || !appointmentTime || !make || !model || !year || !plateNumber) {
    res.status(400);
    throw new Error('Please provide: companyId, packageId, appointmentDate, appointmentTime, make, model, year, and plateNumber');
  }

  // Verify the company exists
  const company = await User.findById(companyId);
  if (!company || company.role !== 'InspectionCompany') {
    res.status(404);
    throw new Error('Inspection company not found');
  }

  // Verify the package exists and belongs to the company
  const pkg = await InspectionPackage.findById(packageId);
  if (!pkg || pkg.companyId.toString() !== companyId) {
    res.status(404);
    throw new Error('Inspection package not found for this company');
  }

  if (!pkg.isActive) {
    res.status(400);
    throw new Error('This inspection package is currently unavailable');
  }

  const booking = await InspectionBooking.create({
    userId: req.user._id,
    companyId,
    packageId,
    vehicleInfo: {
      make,
      model,
      year: Number(year),
      plateNumber,
      vehicleType: vehicleType || 'Car',
    },
    appointmentDate: new Date(appointmentDate),
    appointmentTime,
    notes: notes || '',
    status: 'Pending',
  });

  // Populate references for the response
  const populated = await InspectionBooking.findById(booking._id)
    .populate('companyId', 'name phone companyProfile')
    .populate('packageId', 'name price duration')
    .populate('userId', 'name phone email');

  res.status(201).json(populated);
});

// @desc    Get logged-in user's bookings
// @route   GET /api/inspection/bookings/my-bookings
// @access  Private (User)
const getMyBookings = asyncHandler(async (req, res) => {
  const { status } = req.query;

  let query = { userId: req.user._id };
  if (status && status !== 'All') {
    query.status = status;
  }

  const bookings = await InspectionBooking.find(query)
    .populate('companyId', 'name phone companyProfile')
    .populate('packageId', 'name price duration')
    .sort({ appointmentDate: -1 });

  res.status(200).json(bookings);
});

// @desc    Get single booking by ID
// @route   GET /api/inspection/bookings/:id
// @access  Private (User who booked OR Company that owns the booking)
const getBookingById = asyncHandler(async (req, res) => {
  const booking = await InspectionBooking.findById(req.params.id)
    .populate('companyId', 'name phone email companyProfile')
    .populate('packageId', 'name price duration description checklistItems')
    .populate('userId', 'name phone email');

  if (!booking) {
    res.status(404);
    throw new Error('Booking not found');
  }

  // Authorization: Only the booking user or the company can view
  const isOwner = booking.userId._id.toString() === req.user._id.toString();
  const isCompany = booking.companyId._id.toString() === req.user._id.toString();

  if (!isOwner && !isCompany) {
    res.status(401);
    throw new Error('Not authorized to view this booking');
  }

  res.status(200).json(booking);
});

// @desc    Cancel a booking
// @route   PUT /api/inspection/bookings/:id/cancel
// @access  Private (User who booked OR Company)
const cancelBooking = asyncHandler(async (req, res) => {
  const booking = await InspectionBooking.findById(req.params.id);
  if (!booking) {
    res.status(404);
    throw new Error('Booking not found');
  }

  const isOwner = booking.userId.toString() === req.user._id.toString();
  const isCompany = booking.companyId.toString() === req.user._id.toString();

  if (!isOwner && !isCompany) {
    res.status(401);
    throw new Error('Not authorized to cancel this booking');
  }

  // Can only cancel if not already completed or cancelled
  if (['Completed', 'Cancelled'].includes(booking.status)) {
    res.status(400);
    throw new Error(`Cannot cancel a booking that is already ${booking.status}`);
  }

  booking.status = 'Cancelled';
  booking.cancelReason = req.body.reason || 'No reason provided';
  const updated = await booking.save();

  res.status(200).json(updated);
});

// @desc    Get company's booking queue
// @route   GET /api/inspection/bookings/queue
// @access  Private (InspectionCompany)
const getCompanyQueue = asyncHandler(async (req, res) => {
  const { status, date } = req.query;

  let query = { companyId: req.user._id };

  if (status && status !== 'All') {
    query.status = status;
  }

  // Filter by date range
  if (date === 'today') {
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date();
    endOfDay.setHours(23, 59, 59, 999);
    query.appointmentDate = { $gte: startOfDay, $lte: endOfDay };
  } else if (date === 'week') {
    const startOfWeek = new Date();
    startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());
    startOfWeek.setHours(0, 0, 0, 0);
    const endOfWeek = new Date();
    endOfWeek.setDate(endOfWeek.getDate() + (6 - endOfWeek.getDay()));
    endOfWeek.setHours(23, 59, 59, 999);
    query.appointmentDate = { $gte: startOfWeek, $lte: endOfWeek };
  }

  const bookings = await InspectionBooking.find(query)
    .populate('userId', 'name phone email')
    .populate('packageId', 'name price duration')
    .sort({ appointmentDate: 1, appointmentTime: 1 });

  res.status(200).json(bookings);
});

// @desc    Company confirms a booking
// @route   PUT /api/inspection/bookings/:id/confirm
// @access  Private (InspectionCompany)
const confirmBooking = asyncHandler(async (req, res) => {
  const booking = await InspectionBooking.findById(req.params.id);
  if (!booking) {
    res.status(404);
    throw new Error('Booking not found');
  }

  if (booking.companyId.toString() !== req.user._id.toString()) {
    res.status(401);
    throw new Error('Not authorized to manage this booking');
  }

  if (booking.status !== 'Pending') {
    res.status(400);
    throw new Error(`Cannot confirm a booking with status: ${booking.status}`);
  }

  booking.status = 'Confirmed';
  const updated = await booking.save();

  const populated = await InspectionBooking.findById(updated._id)
    .populate('userId', 'name phone email')
    .populate('packageId', 'name price duration');

  res.status(200).json(populated);
});

// @desc    Company starts inspection
// @route   PUT /api/inspection/bookings/:id/start
// @access  Private (InspectionCompany)
const startInspection = asyncHandler(async (req, res) => {
  const booking = await InspectionBooking.findById(req.params.id);
  if (!booking) {
    res.status(404);
    throw new Error('Booking not found');
  }

  if (booking.companyId.toString() !== req.user._id.toString()) {
    res.status(401);
    throw new Error('Not authorized to manage this booking');
  }

  if (booking.status !== 'Confirmed') {
    res.status(400);
    throw new Error(`Cannot start inspection for a booking with status: ${booking.status}`);
  }

  booking.status = 'In Progress';
  const updated = await booking.save();

  const populated = await InspectionBooking.findById(updated._id)
    .populate('userId', 'name phone email')
    .populate('packageId', 'name price duration');

  res.status(200).json(populated);
});

// @desc    Company completes inspection and records results
// @route   PUT /api/inspection/bookings/:id/complete
// @access  Private (InspectionCompany)
const completeInspection = asyncHandler(async (req, res) => {
  const booking = await InspectionBooking.findById(req.params.id);
  if (!booking) {
    res.status(404);
    throw new Error('Booking not found');
  }

  if (booking.companyId.toString() !== req.user._id.toString()) {
    res.status(401);
    throw new Error('Not authorized to manage this booking');
  }

  if (booking.status !== 'In Progress') {
    res.status(400);
    throw new Error(`Cannot complete a booking with status: ${booking.status}`);
  }

  const { inspectionResult, overallScore, checklist, resultRemarks } = req.body;

  if (!inspectionResult) {
    res.status(400);
    throw new Error('Please provide the inspection result (Pass, Fail, or Conditional)');
  }

  // Parse checklist if sent as JSON string
  let parsedChecklist = checklist;
  if (typeof checklist === 'string') {
    try { parsedChecklist = JSON.parse(checklist); } catch (e) { parsedChecklist = []; }
  }

  booking.status = 'Completed';
  booking.inspectionResult = inspectionResult;
  booking.overallScore = overallScore ? Number(overallScore) : null;
  booking.checklist = parsedChecklist || [];
  booking.resultRemarks = resultRemarks || '';
  booking.completedDate = new Date();

  const updated = await booking.save();

  const populated = await InspectionBooking.findById(updated._id)
    .populate('userId', 'name phone email')
    .populate('companyId', 'name phone companyProfile')
    .populate('packageId', 'name price duration');

  res.status(200).json(populated);
});

// @desc    Upload report images for a completed inspection
// @route   POST /api/inspection/bookings/:id/images
// @access  Private (InspectionCompany)
const uploadReportImages = asyncHandler(async (req, res) => {
  const booking = await InspectionBooking.findById(req.params.id);
  if (!booking) {
    res.status(404);
    throw new Error('Booking not found');
  }

  if (booking.companyId.toString() !== req.user._id.toString()) {
    res.status(401);
    throw new Error('Not authorized to manage this booking');
  }

  if (!req.files || req.files.length === 0) {
    res.status(400);
    throw new Error('Please upload at least one image');
  }

  const newImages = req.files.map(file => `/uploads/${file.filename}`);
  booking.reportImages = [...booking.reportImages, ...newImages];
  const updated = await booking.save();

  res.status(200).json(updated);
});

module.exports = {
  createBooking,
  getMyBookings,
  getBookingById,
  cancelBooking,
  getCompanyQueue,
  confirmBooking,
  startInspection,
  completeInspection,
  uploadReportImages,
};
