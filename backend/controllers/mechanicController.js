const asyncHandler = require('express-async-handler');
const User = require('../models/User');
const RepairBooking = require('../models/RepairBooking');

// @desc    Add a new mechanic to the garage
// @route   POST /api/service/mechanics
// @access  Private (GarageOwner)
const addMechanic = asyncHandler(async (req, res) => {
  const { name, email, phone, password } = req.body;

  if (!name || !email || !phone || !password) {
    res.status(400);
    throw new Error('Please provide: name, email, phone, and password');
  }

  // Check if email already exists
  const userExists = await User.findOne({ email });
  if (userExists) {
    res.status(400);
    throw new Error('User already exists with this email');
  }

  const user = await User.create({
    name,
    email,
    password,
    phone,
    role: 'Mechanic',
    garageId: req.user._id,
  });

  res.status(201).json({
    _id: user._id,
    name: user.name,
    email: user.email,
    phone: user.phone,
    role: user.role,
    garageId: user.garageId,
  });
});

// @desc    List all mechanics for this garage
// @route   GET /api/service/mechanics
// @access  Private (GarageOwner)
const listMechanics = asyncHandler(async (req, res) => {
  const mechanics = await User.find({ garageId: req.user._id, role: 'Mechanic' }).select('-password');
  res.status(200).json(mechanics);
});

// @desc    Remove a mechanic from the garage
// @route   DELETE /api/service/mechanics/:id
// @access  Private (GarageOwner)
const removeMechanic = asyncHandler(async (req, res) => {
  const mechanic = await User.findById(req.params.id);

  if (!mechanic || mechanic.role !== 'Mechanic' || mechanic.garageId.toString() !== req.user._id.toString()) {
    res.status(404);
    throw new Error('Mechanic not found or not in your garage');
  }

  // Check for active bookings
  const activeBooking = await RepairBooking.findOne({
    assignedMechanicId: req.params.id,
    status: { $nin: ['completed', 'cancelled'] },
  });

  if (activeBooking) {
    res.status(400);
    throw new Error('Cannot remove mechanic with active bookings. Reassign first.');
  }

  await User.findByIdAndDelete(req.params.id);
  res.status(200).json({ message: 'Mechanic removed' });
});

module.exports = {
  addMechanic,
  listMechanics,
  removeMechanic,
};
