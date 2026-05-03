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
    images = req.files.map(file => file.path);
  }

  let parsedRequiredDocs;
  if (req.body.requiredDocuments) {
    try {
      parsedRequiredDocs = JSON.parse(req.body.requiredDocuments);
    } catch (e) {
      console.log('Error parsing required docs:', e);
    }
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
    images,
    ...(parsedRequiredDocs && { requiredDocuments: parsedRequiredDocs })
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

// @desc    Get current user's rental vehicle listings (all, regardless of availability)
// @route   GET /api/rentals/owner/listings
// @access  Private
const getOwnerVehicles = asyncHandler(async (req, res) => {
  const vehicles = await RentalVehicle.find({ owner: req.user._id });
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
  const reqDocs = vehicle.requiredDocuments || {};

  if (reqDocs.drivingLicense && !files.drivingLicense) { res.status(400); throw new Error('Driving License is required'); }
  if (reqDocs.idProof && !files.idProof) { res.status(400); throw new Error('ID Proof is required'); }
  if (reqDocs.billingProof && !files.billingProof) { res.status(400); throw new Error('Billing Proof is required'); }
  if (reqDocs.guarantorId && !files.guarantorId) { res.status(400); throw new Error('Guarantor ID is required'); }
  if (reqDocs.guarantorBilling && !files.guarantorBilling) { res.status(400); throw new Error('Guarantor Billing is required'); }

  const booking = await RentalBooking.create({
    vehicle: vehicleId,
    renter: req.user._id,
    owner: vehicle.owner,
    startDate,
    endDate,
    totalDays,
    totalMonths,
    drivingLicensePath: files.drivingLicense ? files.drivingLicense[0].path : undefined,
    idProofPath: files.idProof ? files.idProof[0].path : undefined,
    billingProofPath: files.billingProof ? files.billingProof[0].path : undefined,
    guarantorName,
    guarantorIdPath: files.guarantorId ? files.guarantorId[0].path : undefined,
    guarantorBillingPath: files.guarantorBilling ? files.guarantorBilling[0].path : undefined,
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

// @desc    Get a single booking by ID with full details
// @route   GET /api/rentals/bookings/:id
// @access  Private
const getBookingById = asyncHandler(async (req, res) => {
  const booking = await RentalBooking.findById(req.params.id)
    .populate('vehicle', 'make model year transmission images')
    .populate('renter', 'name phone email')
    .populate('owner', 'name phone email');

  if (!booking) {
    res.status(404);
    throw new Error('Booking not found');
  }

  // Only the owner or renter should be able to view
  if (booking.owner._id.toString() !== req.user._id.toString() &&
      booking.renter._id.toString() !== req.user._id.toString()) {
    res.status(401);
    throw new Error('Not authorized to view this booking');
  }

  res.status(200).json(booking);
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

// @desc    Update a rental vehicle
// @route   PUT /api/rentals/:id
// @access  Private
const updateRentalVehicle = asyncHandler(async (req, res) => {
  const vehicle = await RentalVehicle.findById(req.params.id);

  if (!vehicle) {
    res.status(404);
    throw new Error('Vehicle not found');
  }

  // Ensure only owner can update
  if (vehicle.owner.toString() !== req.user._id.toString()) {
    res.status(401);
    throw new Error('Not authorized to update this vehicle');
  }

  const updatedVehicle = await RentalVehicle.findByIdAndUpdate(
    req.params.id,
    { ...req.body },
    { returnDocument: 'after' }
  );

  res.status(200).json(updatedVehicle);
});

// @desc    Delete a rental vehicle
// @route   DELETE /api/rentals/:id
// @access  Private
const deleteRentalVehicle = asyncHandler(async (req, res) => {
  const vehicle = await RentalVehicle.findById(req.params.id);

  if (!vehicle) {
    res.status(404);
    throw new Error('Vehicle not found');
  }

  // Ensure only owner can delete
  if (vehicle.owner.toString() !== req.user._id.toString()) {
    res.status(401);
    throw new Error('Not authorized to delete this vehicle');
  }

  await vehicle.deleteOne();
  res.status(200).json({ message: 'Vehicle removed' });
});

module.exports = {
  createRentalVehicle,
  getRentalVehicles,
  getRentalVehicleById,
  requestBooking,
  getOwnerBookings,
  getRenterBookings,
  getBookingById,
  updateBookingStatus,
  updateRentalVehicle,
  deleteRentalVehicle,
  getOwnerVehicles
};
