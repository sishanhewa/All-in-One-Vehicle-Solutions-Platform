const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const { requireRole } = require('../middleware/roleMiddleware');

const {
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
} = require('../controllers/adminController');

// All routes are protected and require Admin role
router.use(protect, requireRole('Admin'));

// Dashboard
router.get('/dashboard', getDashboardStats);

// User Management
router.get('/users', getAllUsers);
router.get('/users/:id', getUserById);
router.patch('/users/:id/role', updateUserRole);
router.delete('/users/:id', deleteUser);

// Ad / Content Management (Listings)
router.get('/listings', getAllListings);
router.patch('/listings/:id/status', updateListingStatus);
router.delete('/listings/:id', deleteListing);

// Ad / Content Management (Rentals)
router.get('/rentals', getAllRentals);
router.delete('/rentals/:id', deleteRental);

// Ad / Content Management (Parts)
router.get('/parts', getAllParts);
router.delete('/parts/:id', deletePart);

// Ticket Management
router.get('/tickets', getAllTickets);
router.patch('/tickets/:id/status', assignTicketStatus);
router.post('/tickets/:id/respond', respondToTicket);
router.delete('/tickets/:id', deleteTicket);

// Inspection Management
router.get('/inspections', getAllBookings);
router.patch('/inspections/:id/status', updateBookingStatus);

module.exports = router;
