const asyncHandler = require('express-async-handler');
const RentalVehicle = require('../models/RentalVehicle');
const RentalBooking = require('../models/RentalBooking');

// @desc    Create a new rental vehicle
// @route   POST /api/rentals
// @access  Private
const createRentalVehicle = asyncHandler(async (req, res) => {
  const { make, model, year, transmission, shortTermDailyRate, longTermMonthlyRate, mileageLimit, mileageLimitType, extraMileageRate, deposit, description } = req.body;
  
  let images = [];
  if (req.files && req.files.length > 0) {
    images = req.files.map(file => `/uploads/${file.filename}`);
  }

  const vehicle = await RentalVehicle.create({
    owner: req.user._id,
    make,
    model,
    year,
    transmission,
    shortTermDailyRate,
    longTermMonthlyRate,
    mileageLimit,
    mileageLimitType,
    extraMileageRate,
    deposit,
    description,
    images
  });

  res.status(201).json(vehicle);
});

// @desc    Get all available rental vehicles
// @route   GET /api/rentals
// @access  Public
const getRentalVehicles = asyncHandler(async (req, res) => {
  const vehicles = await RentalVehicle.find({ availability: true }).populate('owner', 'name phone');
  res.status(200).json(vehicles);
});

// @desc    Get rental vehicle by ID
// @route   GET /api/rentals/:id
// @access  Public
const getRentalVehicleById = asyncHandler(async (req, res) => {
  const vehicle = await RentalVehicle.findById(req.params.id).populate('owner', 'name phone email');
  if (vehicle) {
    res.status(200).json(vehicle);
  } else {
    res.status(404);
    throw new Error('Rental vehicle not found');
  }
});

// @desc    Request a booking for a rental vehicle
// @route   POST /api/rentals/:id/book
// @access  Private
const requestBooking = asyncHandler(async (req, res) => {
  const vehicleId = req.params.id;
  const { startDate, endDate, totalDays, totalMonths, guarantorName } = req.body;

  const vehicle = await RentalVehicle.findById(vehicleId);
  if (!vehicle) {
    res.status(404);
    throw new Error('Vehicle not found');
  }

  // Get uploaded files from multer
  const files = req.files || {};
  
  if (!files.drivingLicense || !files.idProof || !files.billingProof || !files.guarantorId || !files.guarantorBilling) {
    res.status(400);
    throw new Error('All proof documents are required');
  }

  const booking = await RentalBooking.create({
    vehicle: vehicleId,
    renter: req.user._id,
    owner: vehicle.owner,
    startDate,
    endDate,
    totalDays,
    totalMonths,
    drivingLicensePath: `/uploads/${files.drivingLicense[0].filename}`,
    idProofPath: `/uploads/${files.idProof[0].filename}`,
    billingProofPath: `/uploads/${files.billingProof[0].filename}`,
    guarantorName,
    guarantorIdPath: `/uploads/${files.guarantorId[0].filename}`,
    guarantorBillingPath: `/uploads/${files.guarantorBilling[0].filename}`,
    status: 'Pending'
  });

  res.status(201).json(booking);
});

// @desc    Get bookings received for owner's vehicles
// @route   GET /api/rentals/owner/bookings
// @access  Private
const getOwnerBookings = asyncHandler(async (req, res) => {
  const bookings = await RentalBooking.find({ owner: req.user._id })
    .populate('vehicle', 'make model year')
    .populate('renter', 'name phone email');
  res.status(200).json(bookings);
});

// @desc    Get renter's requested bookings
// @route   GET /api/rentals/my-bookings
// @access  Private
const getRenterBookings = asyncHandler(async (req, res) => {
  const bookings = await RentalBooking.find({ renter: req.user._id })
    .populate('vehicle', 'make model year images')
    .populate('owner', 'name phone email');
  res.status(200).json(bookings);
});

// @desc    Update booking status (Accept/Reject/Complete)
// @route   PUT /api/rentals/bookings/:id/status
// @access  Private
const updateBookingStatus = asyncHandler(async (req, res) => {
  const { status } = req.body;
  const booking = await RentalBooking.findById(req.params.id);

  if (!booking) {
    res.status(404);
    throw new Error('Booking not found');
  }

  // Ensure only the owner can modify this
  if (booking.owner.toString() !== req.user._id.toString()) {
    res.status(401);
    throw new Error('Not authorized to update this booking');
  }

  booking.status = status;
  await booking.save();

  // If accepted, update vehicle availability to false
  if (status === 'Accepted') {
    await RentalVehicle.findByIdAndUpdate(booking.vehicle, { availability: false });
  } else if (status === 'Completed' || status === 'Cancelled' || status === 'Rejected') {
    // If it was previously accepted and now completed/cancelled, make available again
    await RentalVehicle.findByIdAndUpdate(booking.vehicle, { availability: true });
  }

  res.status(200).json(booking);
});

module.exports = {
  createRentalVehicle,
  getRentalVehicles,
  getRentalVehicleById,
  requestBooking,
  getOwnerBookings,
  getRenterBookings,
  updateBookingStatus
};
