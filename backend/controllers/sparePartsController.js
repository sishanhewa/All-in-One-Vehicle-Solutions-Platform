const asyncHandler = require('express-async-handler');
const VehiclePart = require('../models/VehiclePart');

// @desc    Get all available spare parts (with optional filters)
// @route   GET /api/spare-parts
// @access  Public
const getAllParts = asyncHandler(async (req, res) => {
  const {
    category, condition, make, model,
    minPrice, maxPrice, search, location,
  } = req.query;

  let query = { status: 'Available' };

  if (category) query.category = category;
  if (condition) query.condition = condition;
  if (location) query.location = new RegExp(location, 'i');
  if (make) query['compatibility.make'] = new RegExp(make, 'i');
  if (model) query['compatibility.model'] = new RegExp(model, 'i');

  if (minPrice || maxPrice) {
    query.price = {};
    if (minPrice) query.price.$gte = Number(minPrice);
    if (maxPrice) query.price.$lte = Number(maxPrice);
  }

  if (search) {
    query.$or = [
      { partName: new RegExp(search, 'i') },
      { partNumber: new RegExp(search, 'i') },
      { description: new RegExp(search, 'i') },
      { 'compatibility.make': new RegExp(search, 'i') },
      { 'compatibility.model': new RegExp(search, 'i') },
    ];
  }

  const parts = await VehiclePart.find(query)
    .populate('sellerId', 'name phone email')
    .sort({ createdAt: -1 });

  res.status(200).json(parts);
});

// @desc    Get a single spare part by ID
// @route   GET /api/spare-parts/:id
// @access  Public
const getPartById = asyncHandler(async (req, res) => {
  const part = await VehiclePart.findById(req.params.id)
    .populate('sellerId', 'name phone email');

  if (!part) {
    res.status(404);
    throw new Error('Spare part not found');
  }

  res.status(200).json(part);
});

// @desc    Create a new spare part listing
// @route   POST /api/spare-parts
// @access  Private
const createPart = asyncHandler(async (req, res) => {
  const {
    partName, partNumber, category, condition,
    price, quantity, description, location,
    compatibilityMake, compatibilityModel,
    compatibilityYearFrom, compatibilityYearTo, compatibilityEngineType,
  } = req.body;

  if (!partName || !price || !location) {
    res.status(400);
    throw new Error('Please provide: partName, price, and location');
  }

  // Collect image paths from multer
  const images = req.files ? req.files.map(file => file.path) : [];

  const part = await VehiclePart.create({
    sellerId: req.user._id,
    partName,
    partNumber: partNumber || '',
    category: category || 'Other',
    condition: condition || 'Used',
    price: Number(price),
    quantity: quantity ? Number(quantity) : 1,
    description: description || '',
    images,
    compatibility: {
      make:       compatibilityMake || '',
      model:      compatibilityModel || '',
      yearFrom:   compatibilityYearFrom ? Number(compatibilityYearFrom) : undefined,
      yearTo:     compatibilityYearTo ? Number(compatibilityYearTo) : undefined,
      engineType: compatibilityEngineType || '',
    },
    location,
  });

  const populated = await VehiclePart.findById(part._id)
    .populate('sellerId', 'name phone email');

  res.status(201).json(populated);
});

// @desc    Update a spare part listing
// @route   PUT /api/spare-parts/:id
// @access  Private (Owner only)
const updatePart = asyncHandler(async (req, res) => {
  const part = await VehiclePart.findById(req.params.id);

  if (!part) {
    res.status(404);
    throw new Error('Spare part not found');
  }

  if (part.sellerId.toString() !== req.user._id.toString()) {
    res.status(401);
    throw new Error('Not authorized to update this spare part');
  }

  // Update simple text/number fields
  const fields = ['partName', 'partNumber', 'category', 'condition', 'price', 'quantity', 'description', 'location', 'status'];
  fields.forEach(field => {
    if (req.body[field] !== undefined) {
      part[field] = req.body[field];
    }
  });

  // Update compatibility sub-document fields
  const compatibilityMap = {
    compatibilityMake:       'make',
    compatibilityModel:      'model',
    compatibilityYearFrom:   'yearFrom',
    compatibilityYearTo:     'yearTo',
    compatibilityEngineType: 'engineType',
  };
  Object.entries(compatibilityMap).forEach(([bodyKey, schemaKey]) => {
    if (req.body[bodyKey] !== undefined) {
      part.compatibility[schemaKey] = req.body[bodyKey];
    }
  });

  // If new images were uploaded, replace the existing images
  if (req.files && req.files.length > 0) {
    part.images = req.files.map(file => file.path);
  }

  const updated = await part.save();
  const populated = await VehiclePart.findById(updated._id)
    .populate('sellerId', 'name phone email');

  res.status(200).json(populated);
});

// @desc    Delete a spare part listing
// @route   DELETE /api/spare-parts/:id
// @access  Private (Owner only)
const deletePart = asyncHandler(async (req, res) => {
  const part = await VehiclePart.findById(req.params.id);

  if (!part) {
    res.status(404);
    throw new Error('Spare part not found');
  }

  if (part.sellerId.toString() !== req.user._id.toString()) {
    res.status(401);
    throw new Error('Not authorized to delete this spare part');
  }

  await part.deleteOne();
  res.status(200).json({ message: 'Spare part removed successfully', id: req.params.id });
});

// @desc    Get logged-in user's spare part listings
// @route   GET /api/spare-parts/my-parts
// @access  Private
const getMyParts = asyncHandler(async (req, res) => {
  const parts = await VehiclePart.find({ sellerId: req.user._id })
    .sort({ createdAt: -1 });

  res.status(200).json(parts);
});

module.exports = {
  getAllParts,
  getPartById,
  createPart,
  updatePart,
  deletePart,
  getMyParts,
};
