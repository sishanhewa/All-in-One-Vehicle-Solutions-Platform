const mongoose = require('mongoose');

const vehiclePartSchema = new mongoose.Schema({
  sellerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  partName: {
    type: String,
    required: [true, 'Please add a part name'],
  },
  partNumber: {
    type: String,
    default: '',
  },
  category: {
    type: String,
    enum: ['Engine', 'Brakes', 'Suspension', 'Electrical', 'Body', 'Interior', 'Exhaust', 'Transmission', 'Wheels & Tires', 'Other'],
    default: 'Other',
  },
  condition: {
    type: String,
    enum: ['New', 'Used', 'Refurbished'],
    default: 'Used',
  },
  price: {
    type: Number,
    required: [true, 'Please add the price in LKR'],
  },
  quantity: {
    type: Number,
    default: 1,
    min: [1, 'Quantity must be at least 1'],
  },
  description: {
    type: String,
    default: '',
  },
  images: [{ type: String }], // paths like /uploads/images-123.jpg
  // Compatibility details – specifies which vehicles this part fits
  compatibility: {
    make:       { type: String, default: '' },  // e.g. "Toyota"
    model:      { type: String, default: '' },  // e.g. "Corolla"
    yearFrom:   { type: Number },               // e.g. 2015
    yearTo:     { type: Number },               // e.g. 2023
    engineType: { type: String, default: '' },  // e.g. "1.8L Petrol"
  },
  location: {
    type: String,
    required: [true, 'Please add a location'],
  },
  status: {
    type: String,
    enum: ['Available', 'Sold', 'Removed'],
    default: 'Available',
  },
}, { timestamps: true });

// Compound index for frequent query patterns
vehiclePartSchema.index({ status: 1, category: 1, 'compatibility.make': 1 });

module.exports = mongoose.model('VehiclePart', vehiclePartSchema, 'vehicleparts');
