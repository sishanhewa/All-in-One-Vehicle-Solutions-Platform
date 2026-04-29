const asyncHandler = require('express-async-handler');
const ServiceProvider = require('../models/ServiceProvider');
const User = require('../models/User');
const RepairBooking = require('../models/RepairBooking');

// Helper: normalize phone number to international format (+94 for Sri Lanka)
const normalizePhone = (phone) => {
  if (!phone || typeof phone !== 'string') return phone;
  // Remove all non-numeric characters
  let digits = phone.replace(/\D/g, '');
  // Convert local Sri Lankan format (0771234567) to international (+94771234567)
  if (digits.length === 10 && digits.startsWith('0')) {
    digits = '94' + digits.substring(1);
  }
  // If already has country code without +, add it
  if (digits.length === 11 && digits.startsWith('94')) {
    return '+' + digits;
  }
  // If already has +, just return cleaned version
  if (phone.trim().startsWith('+')) {
    return '+' + digits;
  }
  // Return as-is if doesn't match known patterns
  return phone.trim();
};

// Helper: get the garage owned by the current user or throw 404
const getMyGarage = async (res, user) => {
  const garage = await ServiceProvider.findOne({ ownerId: user._id });
  if (!garage) {
    res.status(404);
    throw new Error('You do not own a registered garage');
  }
  return garage;
};

// ─── GarageOwner: list all mechanics in garage ────────────────────────────────
// GET /api/service/mechanics
const listMechanics = asyncHandler(async (req, res) => {
  const myGarage = await getMyGarage(res, req.user);
  const mechanics = await User.find({ garageId: myGarage._id, role: 'Mechanic' }).select('-password');
  res.status(200).json(mechanics);
});

// ─── GarageOwner: get single mechanic ─────────────────────────────────────────
// GET /api/service/mechanics/:id
const getMechanicById = asyncHandler(async (req, res) => {
  const myGarage = await getMyGarage(res, req.user);

  const mechanic = await User.findById(req.params.id).select('-password');

  if (!mechanic || mechanic.role !== 'Mechanic' || mechanic.garageId?.toString() !== myGarage._id.toString()) {
    res.status(404);
    throw new Error('Mechanic not found or not in your garage');
  }

  res.status(200).json(mechanic);
});

// ─── GarageOwner: add mechanic ────────────────────────────────────────────────
// POST /api/service/mechanics
const addMechanic = asyncHandler(async (req, res) => {
  const { name, email, phone, password } = req.body;

  if (!name || !email || !phone || !password) {
    res.status(400);
    throw new Error('Please provide: name, email, phone, and password');
  }

  const myGarage = await getMyGarage(res, req.user);

  const userExists = await User.findOne({ email });
  if (userExists) {
    res.status(400);
    throw new Error('A user already exists with this email');
  }

  const mechanic = await User.create({
    name: name.trim(),
    email: email.trim().toLowerCase(),
    password,
    phone: normalizePhone(phone),
    role: 'Mechanic',
    garageId: myGarage._id,
    isActive: true,
  });

  res.status(201).json({
    _id:      mechanic._id,
    name:     mechanic.name,
    email:    mechanic.email,
    phone:    mechanic.phone,
    role:     mechanic.role,
    garageId: mechanic.garageId,
    isActive: mechanic.isActive,
  });
});

// ─── GarageOwner: update mechanic name / phone / password ────────────────────
// PUT /api/service/mechanics/:id
const updateMechanic = asyncHandler(async (req, res) => {
  const myGarage = await getMyGarage(res, req.user);

  const mechanic = await User.findById(req.params.id);

  if (!mechanic || mechanic.role !== 'Mechanic' || mechanic.garageId?.toString() !== myGarage._id.toString()) {
    res.status(404);
    throw new Error('Mechanic not found or not in your garage');
  }

  const { name, phone, newPassword } = req.body;
  if (name)  mechanic.name  = name.trim();
  if (phone) mechanic.phone = normalizePhone(phone);

  // Owner-initiated password reset (no current password needed — owner authority)
  if (newPassword) {
    if (newPassword.length < 6) {
      res.status(400);
      throw new Error('New password must be at least 6 characters');
    }
    mechanic.password = newPassword; // pre-save hook hashes it
  }

  await mechanic.save();

  res.status(200).json({
    _id:      mechanic._id,
    name:     mechanic.name,
    email:    mechanic.email,
    phone:    mechanic.phone,
    role:     mechanic.role,
    garageId: mechanic.garageId,
    isActive: mechanic.isActive,
  });
});

// ─── GarageOwner: soft-deactivate mechanic ────────────────────────────────────
// PUT /api/service/mechanics/:id/deactivate
// Also accepts { isActive: true } to reactivate.
const deactivateMechanic = asyncHandler(async (req, res) => {
  const myGarage = await getMyGarage(res, req.user);

  const mechanic = await User.findById(req.params.id);

  if (!mechanic || mechanic.role !== 'Mechanic' || mechanic.garageId?.toString() !== myGarage._id.toString()) {
    res.status(404);
    throw new Error('Mechanic not found or not in your garage');
  }

  // Explicit toggle: body can pass { isActive: false } to deactivate or { isActive: true } to reactivate
  const targetState = req.body.isActive !== undefined ? Boolean(req.body.isActive) : false;

  // If deactivating, block if mechanic has active jobs
  if (!targetState) {
    const activeBooking = await RepairBooking.findOne({
      assignedMechanicId: mechanic._id,
      status: { $nin: ['completed', 'cancelled'] },
    });
    if (activeBooking) {
      res.status(400);
      throw new Error('Cannot deactivate a mechanic with active jobs. Reassign first.');
    }
  }

  mechanic.isActive = targetState;
  await mechanic.save();

  res.status(200).json({
    _id:      mechanic._id,
    name:     mechanic.name,
    isActive: mechanic.isActive,
    message:  mechanic.isActive ? 'Mechanic reactivated' : 'Mechanic deactivated',
  });
});

// ─── GarageOwner: hard-delete mechanic ───────────────────────────────────────
// DELETE /api/service/mechanics/:id
const removeMechanic = asyncHandler(async (req, res) => {
  const myGarage = await getMyGarage(res, req.user);

  const mechanic = await User.findById(req.params.id);

  if (!mechanic || mechanic.role !== 'Mechanic' || mechanic.garageId?.toString() !== myGarage._id.toString()) {
    res.status(404);
    throw new Error('Mechanic not found or not in your garage');
  }

  const activeBooking = await RepairBooking.findOne({
    assignedMechanicId: req.params.id,
    status: { $nin: ['completed', 'cancelled'] },
  });

  if (activeBooking) {
    res.status(400);
    throw new Error('Cannot remove a mechanic with active jobs. Reassign or deactivate instead.');
  }

  await User.findByIdAndDelete(req.params.id);
  res.status(200).json({ message: 'Mechanic removed' });
});

// ─── Mechanic self-service: view own profile ─────────────────────────────────
// GET /api/service/mechanics/me
const getMyMechanicProfile = asyncHandler(async (req, res) => {
  const mechanic = await User.findById(req.user._id)
    .select('-password')
    .populate('garageId', 'garageName city logo phone address');

  res.status(200).json(mechanic);
});

// ─── Mechanic self-service: update own profile ────────────────────────────────
// PUT /api/service/mechanics/me
const updateMyMechanicProfile = asyncHandler(async (req, res) => {
  const { name, phone, password, currentPassword, newPassword } = req.body;

  const mechanic = await User.findById(req.user._id);

  if (name)  mechanic.name  = name.trim();
  if (phone) mechanic.phone = normalizePhone(phone);

  // Option 1: Simple direct password set (MechanicProfile screen uses this)
  if (password && !newPassword) {
    if (password.length < 6) {
      res.status(400);
      throw new Error('Password must be at least 6 characters');
    }
    mechanic.password = password; // pre-save hook hashes it
  }

  // Option 2: Require current password verification (legacy)
  if (newPassword) {
    if (!currentPassword) {
      res.status(400);
      throw new Error('Please provide your current password to set a new one');
    }
    const match = await mechanic.matchPassword(currentPassword);
    if (!match) {
      res.status(401);
      throw new Error('Current password is incorrect');
    }
    if (newPassword.length < 6) {
      res.status(400);
      throw new Error('New password must be at least 6 characters');
    }
    mechanic.password = newPassword;
  }

  await mechanic.save();

  res.status(200).json({
    _id:   mechanic._id,
    name:  mechanic.name,
    email: mechanic.email,
    phone: mechanic.phone,
    role:  mechanic.role,
  });
});

module.exports = {
  listMechanics,
  getMechanicById,
  addMechanic,
  updateMechanic,
  deactivateMechanic,
  removeMechanic,
  getMyMechanicProfile,
  updateMyMechanicProfile,
};
