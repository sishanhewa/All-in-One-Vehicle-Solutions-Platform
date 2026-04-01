const express = require('express');
const router = express.Router();

const upload = require('../middleware/uploadMiddleware');
const { protect } = require('../middleware/authMiddleware');

const {
  getAllTickets,
  getTicketById,
  createTicket,
  updateTicket,
  deleteTicket,
  getMyTickets,
  addResponse,
  updateStatus,
} = require('../controllers/supportController');

// Public/Admin: Browse all tickets
router.get('/', getAllTickets);

// Private: Get logged-in user's tickets (must be before /:id)
router.get('/my-tickets', protect, getMyTickets);

// Private: Get single ticket by ID
router.get('/:id', protect, getTicketById);

// Private: Create a new support ticket
router.post('/', protect, upload.array('images', 3), createTicket);

// Private: Update ticket
router.put('/:id', protect, upload.array('images', 3), updateTicket);

// Private: Delete ticket
router.delete('/:id', protect, deleteTicket);

// Private: Add a response message to a ticket
router.post('/:id/respond', protect, addResponse);

// Private: Update ticket status
router.patch('/:id/status', protect, updateStatus);

module.exports = router;
