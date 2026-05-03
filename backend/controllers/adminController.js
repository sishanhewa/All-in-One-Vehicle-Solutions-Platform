const asyncHandler = require('express-async-handler');
const User = require('../models/User');
const SupportTicket = require('../models/SupportTicket');
const Listing = require('../models/Listing');
const RentalVehicle = require('../models/RentalVehicle');
const VehiclePart = require('../models/VehiclePart');
const InspectionBooking = require('../models/InspectionBooking');

// --- DASHBOARD STATS ---

// @desc    Get dashboard aggregated stats
// @route   GET /api/admin/dashboard
// @access  Private/Admin
const getDashboardStats = asyncHandler(async (req, res) => {
  const users = await User.countDocuments();
  const admins = await User.countDocuments({ role: 'Admin' });
  const companies = await User.countDocuments({ role: 'InspectionCompany' });
  const regularUsers = await User.countDocuments({ role: 'User' });

  const listings = await Listing.countDocuments();
  const activeListings = await Listing.countDocuments({ status: 'Active' });

  const rentals = await RentalVehicle.countDocuments();
  const availableRentals = await RentalVehicle.countDocuments({ availability: true });

  const parts = await VehiclePart.countDocuments();
  const availableParts = await VehiclePart.countDocuments({ availability: 'In Stock' });

  const tickets = await SupportTicket.countDocuments();
  const openTickets = await SupportTicket.countDocuments({ status: 'Open' });
  const resolvedTickets = await SupportTicket.countDocuments({ status: 'Resolved' });

  const inspections = await InspectionBooking.countDocuments();
  const pendingInspections = await InspectionBooking.countDocuments({ status: 'Pending' });

  res.status(200).json({
    users: { total: users, admins, inspectionCompanies: companies, regular: regularUsers },
    listings: { total: listings, active: activeListings },
    rentals: { total: rentals, available: availableRentals },
    parts: { total: parts, available: availableParts },
    tickets: { total: tickets, open: openTickets, resolved: resolvedTickets },
    inspections: { total: inspections, pending: pendingInspections }
  });
});

// --- USER MANAGEMENT ---

// @desc    Get all users
// @route   GET /api/admin/users
// @access  Private/Admin
const getAllUsers = asyncHandler(async (req, res) => {
  const { role, search } = req.query;
  let query = {};
  
  if (role && role !== 'All') query.role = role;
  if (search) {
    query.$or = [
      { name: new RegExp(search, 'i') },
      { email: new RegExp(search, 'i') }
    ];
  }

  const users = await User.find(query).select('-password').sort({ createdAt: -1 });
  res.status(200).json(users);
});

// @desc    Get user by ID
// @route   GET /api/admin/users/:id
// @access  Private/Admin
const getUserById = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id).select('-password');
  if (!user) {
    res.status(404);
    throw new Error('User not found');
  }

  // Get activity stats
  const listingCount = await Listing.countDocuments({ sellerId: user._id });
  const rentalCount = await RentalVehicle.countDocuments({ owner: user._id });
  const partCount = await VehiclePart.countDocuments({ sellerId: user._id });
  const ticketCount = await SupportTicket.countDocuments({ userId: user._id });
  
  res.status(200).json({
    user,
    stats: { listings: listingCount, rentals: rentalCount, parts: partCount, tickets: ticketCount }
  });
});

// @desc    Update user role
// @route   PATCH /api/admin/users/:id/role
// @access  Private/Admin
const updateUserRole = asyncHandler(async (req, res) => {
  const { role } = req.body;
  if (!['User', 'Admin', 'InspectionCompany'].includes(role)) {
    res.status(400);
    throw new Error('Invalid role');
  }

  const user = await User.findById(req.params.id).select('-password');
  if (!user) {
    res.status(404);
    throw new Error('User not found');
  }

  user.role = role;
  const updatedUser = await user.save();
  res.status(200).json(updatedUser);
});

// @desc    Delete user
// @route   DELETE /api/admin/users/:id
// @access  Private/Admin
const deleteUser = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user) {
    res.status(404);
    throw new Error('User not found');
  }
  
  // Optionally delete associated content here, but for now just delete the user
  await user.deleteOne();
  res.status(200).json({ message: 'User deleted' });
});

// --- AD / CONTENT MANAGEMENT ---

// @desc    Get all listings
// @route   GET /api/admin/listings
// @access  Private/Admin
const getAllListings = asyncHandler(async (req, res) => {
  const listings = await Listing.find().populate('sellerId', 'name email').sort({ createdAt: -1 });
  res.status(200).json(listings);
});

// @desc    Update listing status
// @route   PATCH /api/admin/listings/:id/status
// @access  Private/Admin
const updateListingStatus = asyncHandler(async (req, res) => {
  const { status } = req.body;
  const listing = await Listing.findById(req.params.id);
  if (!listing) {
    res.status(404);
    throw new Error('Listing not found');
  }
  listing.status = status;
  const updated = await listing.save();
  res.status(200).json(updated);
});

// @desc    Delete listing
// @route   DELETE /api/admin/listings/:id
// @access  Private/Admin
const deleteListing = asyncHandler(async (req, res) => {
  const listing = await Listing.findById(req.params.id);
  if (!listing) {
    res.status(404);
    throw new Error('Listing not found');
  }
  await listing.deleteOne();
  res.status(200).json({ message: 'Listing deleted' });
});

// @desc    Get all rentals
// @route   GET /api/admin/rentals
// @access  Private/Admin
const getAllRentals = asyncHandler(async (req, res) => {
  const rentals = await RentalVehicle.find().populate('owner', 'name email').sort({ createdAt: -1 });
  res.status(200).json(rentals);
});

// @desc    Delete rental
// @route   DELETE /api/admin/rentals/:id
// @access  Private/Admin
const deleteRental = asyncHandler(async (req, res) => {
  const rental = await RentalVehicle.findById(req.params.id);
  if (!rental) {
    res.status(404);
    throw new Error('Rental not found');
  }
  await rental.deleteOne();
  res.status(200).json({ message: 'Rental deleted' });
});

// @desc    Get all parts
// @route   GET /api/admin/parts
// @access  Private/Admin
const getAllParts = asyncHandler(async (req, res) => {
  const parts = await VehiclePart.find().populate('sellerId', 'name email').sort({ createdAt: -1 });
  res.status(200).json(parts);
});

// @desc    Delete part
// @route   DELETE /api/admin/parts/:id
// @access  Private/Admin
const deletePart = asyncHandler(async (req, res) => {
  const part = await VehiclePart.findById(req.params.id);
  if (!part) {
    res.status(404);
    throw new Error('Part not found');
  }
  await part.deleteOne();
  res.status(200).json({ message: 'Part deleted' });
});

// --- TICKET MANAGEMENT ---

// @desc    Get all tickets
// @route   GET /api/admin/tickets
// @access  Private/Admin
const getAllTickets = asyncHandler(async (req, res) => {
  const tickets = await SupportTicket.find()
    .populate('userId', 'name email')
    .sort({ createdAt: -1 });
  res.status(200).json(tickets);
});

// @desc    Assign ticket status
// @route   PATCH /api/admin/tickets/:id/status
// @access  Private/Admin
const assignTicketStatus = asyncHandler(async (req, res) => {
  const { status } = req.body;
  const ticket = await SupportTicket.findById(req.params.id);
  if (!ticket) {
    res.status(404);
    throw new Error('Ticket not found');
  }
  
  if (['Open', 'In Progress', 'Resolved', 'Closed'].includes(status)) {
    ticket.status = status;
    if (status === 'Resolved' || status === 'Closed') {
      ticket.resolvedAt = Date.now();
    }
  }
  
  const updated = await ticket.save();
  res.status(200).json(updated);
});

// @desc    Respond to ticket
// @route   POST /api/admin/tickets/:id/respond
// @access  Private/Admin
const respondToTicket = asyncHandler(async (req, res) => {
  const { message } = req.body;
  if (!message) {
    res.status(400);
    throw new Error('Please provide a message');
  }

  const ticket = await SupportTicket.findById(req.params.id);
  if (!ticket) {
    res.status(404);
    throw new Error('Support ticket not found');
  }

  ticket.responses.push({
    responderRole: 'Admin',
    responderId: req.user._id,
    message,
  });

  const updated = await ticket.save();
  const populated = await SupportTicket.findById(updated._id)
    .populate('userId', 'name email phone')
    .populate('responses.responderId', 'name role');

  res.status(201).json(populated);
});

// @desc    Delete ticket
// @route   DELETE /api/admin/tickets/:id
// @access  Private/Admin
const deleteTicket = asyncHandler(async (req, res) => {
  const ticket = await SupportTicket.findById(req.params.id);
  if (!ticket) {
    res.status(404);
    throw new Error('Ticket not found');
  }
  await ticket.deleteOne();
  res.status(200).json({ message: 'Ticket deleted' });
});

// --- INSPECTION MANAGEMENT ---

// @desc    Get all inspection bookings
// @route   GET /api/admin/inspections
// @access  Private/Admin
const getAllBookings = asyncHandler(async (req, res) => {
  const bookings = await InspectionBooking.find()
    .populate('userId', 'name email')
    .populate('companyId', 'name email companyProfile.companyName')
    .populate('packageId', 'name price')
    .sort({ createdAt: -1 });
  res.status(200).json(bookings);
});

// @desc    Update booking status
// @route   PATCH /api/admin/inspections/:id/status
// @access  Private/Admin
const updateBookingStatus = asyncHandler(async (req, res) => {
  const { status } = req.body;
  const booking = await InspectionBooking.findById(req.params.id);
  if (!booking) {
    res.status(404);
    throw new Error('Booking not found');
  }
  booking.status = status;
  const updated = await booking.save();
  res.status(200).json(updated);
});

module.exports = {
  getDashboardStats,
  getAllUsers,
  getUserById,
  updateUserRole,
  deleteUser,
  getAllListings,
  updateListingStatus,
  deleteListing,
  getAllRentals,
  deleteRental,
  getAllParts,
  deletePart,
  getAllTickets,
  assignTicketStatus,
  respondToTicket,
  deleteTicket,
  getAllBookings,
  updateBookingStatus
};
