const asyncHandler = require('express-async-handler');
const SupportTicket = require('../models/SupportTicket');

// @desc    Get all open support tickets (with optional filters)
// @route   GET /api/support
// @access  Public (Can act as Admin feed)
const getAllTickets = asyncHandler(async (req, res) => {
  const { category, status, priority, search } = req.query;
  let query = {};
  
  if (category) query.category = category;
  if (status) query.status = status;
  if (priority) query.priority = priority;
  if (search) {
    query.$or = [
      { subject: new RegExp(search, 'i') },
      { description: new RegExp(search, 'i') },
    ];
  }

  const tickets = await SupportTicket.find(query)
    .populate('userId', 'name email phone')
    .sort({ createdAt: -1 });

  res.status(200).json(tickets);
});

// @desc    Get a single ticket by ID
// @route   GET /api/support/:id
// @access  Private
const getTicketById = asyncHandler(async (req, res) => {
  const ticket = await SupportTicket.findById(req.params.id)
    .populate('userId', 'name email phone')
    .populate('responses.responderId', 'name role');

  if (!ticket) {
    res.status(404);
    throw new Error('Support ticket not found');
  }

  // Optional: check if user is admin OR ticket owner, but for now allow logged in users (assignment simplicity)
  res.status(200).json(ticket);
});

// @desc    Create a new support ticket
// @route   POST /api/support
// @access  Private
const createTicket = asyncHandler(async (req, res) => {
  const { category, subject, description, priority, entityType, entityId } = req.body;

  if (!subject || !description) {
    res.status(400);
    throw new Error('Please provide subject and description');
  }

  const images = req.files ? req.files.map(file => `/uploads/${file.filename}`) : [];

  const ticket = await SupportTicket.create({
    userId: req.user._id,
    category: category || 'Other',
    subject,
    description,
    priority: priority || 'Medium',
    relatedEntity: {
      entityType: entityType || 'None',
      entityId: entityId || null,
    },
    images,
  });

  const populated = await SupportTicket.findById(ticket._id)
    .populate('userId', 'name email phone');

  res.status(201).json(populated);
});

// @desc    Update a support ticket (Owner only)
// @route   PUT /api/support/:id
// @access  Private
const updateTicket = asyncHandler(async (req, res) => {
  const ticket = await SupportTicket.findById(req.params.id);

  if (!ticket) {
    res.status(404);
    throw new Error('Support ticket not found');
  }

  if (ticket.userId.toString() !== req.user._id.toString() && req.user.role !== 'Admin') {
    res.status(401);
    throw new Error('Not authorized to modify this ticket');
  }

  const fields = ['category', 'subject', 'description', 'priority'];
  fields.forEach(field => {
    if (req.body[field] !== undefined) {
      ticket[field] = req.body[field];
    }
  });

  if (req.files && req.files.length > 0) {
    ticket.images = req.files.map(file => `/uploads/${file.filename}`);
  }

  const updated = await ticket.save();
  const populated = await SupportTicket.findById(updated._id)
    .populate('userId', 'name email phone');

  res.status(200).json(populated);
});

// @desc    Delete a ticket
// @route   DELETE /api/support/:id
// @access  Private (Owner/Admin)
const deleteTicket = asyncHandler(async (req, res) => {
  const ticket = await SupportTicket.findById(req.params.id);

  if (!ticket) {
    res.status(404);
    throw new Error('Support ticket not found');
  }

  if (ticket.userId.toString() !== req.user._id.toString() && req.user.role !== 'Admin') {
    res.status(401);
    throw new Error('Not authorized to delete this ticket');
  }

  await ticket.deleteOne();
  res.status(200).json({ message: 'Support ticket removed successfully', id: req.params.id });
});

// @desc    Get logged-in user's tickets
// @route   GET /api/support/my-tickets
// @access  Private
const getMyTickets = asyncHandler(async (req, res) => {
  const tickets = await SupportTicket.find({ userId: req.user._id })
    .sort({ createdAt: -1 });

  res.status(200).json(tickets);
});

// @desc    Add a response message to a ticket
// @route   POST /api/support/:id/respond
// @access  Private
const addResponse = asyncHandler(async (req, res) => {
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

  const isOwner = ticket.userId.toString() === req.user._id.toString();
  const isAdmin = req.user.role === 'Admin';

  if (!isOwner && !isAdmin) {
    res.status(401);
    throw new Error('Not authorized to respond to this ticket');
  }

  ticket.responses.push({
    responderRole: isAdmin ? 'Admin' : 'User',
    responderId: req.user._id,
    message,
  });

  const updated = await ticket.save();
  const populated = await SupportTicket.findById(updated._id)
    .populate('userId', 'name email phone')
    .populate('responses.responderId', 'name role');

  res.status(201).json(populated);
});

// @desc    Update ticket status (resolve/close)
// @route   PATCH /api/support/:id/status
// @access  Private
const updateStatus = asyncHandler(async (req, res) => {
  const { status } = req.body;
  const ticket = await SupportTicket.findById(req.params.id);

  if (!ticket) {
    res.status(404);
    throw new Error('Support ticket not found');
  }

  const isOwner = ticket.userId.toString() === req.user._id.toString();
  const isAdmin = req.user.role === 'Admin';

  if (!isOwner && !isAdmin) {
    res.status(401);
    throw new Error('Not authorized to update ticket status');
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

module.exports = {
  getAllTickets,
  getTicketById,
  createTicket,
  updateTicket,
  deleteTicket,
  getMyTickets,
  addResponse,
  updateStatus,
};
