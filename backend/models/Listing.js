const mongoose = require('mongoose');

const listingSchema = new mongoose.Schema({
  sellerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  make: { type: String, required: [true, 'Please add a make (e.g. Toyota)'] },
  model: { type: String, required: [true, 'Please add a model (e.g. Corolla)'] },
  year: { type: Number, required: [true, 'Please add the year'] },
  price: { type: Number, required: [true, 'Please add the price in LKR'] },
  mileage: { type: Number, default: 0 },
  fuelType: {
    type: String,
    enum: ['Petrol', 'Diesel', 'Hybrid', 'Electric'],
    default: 'Petrol',
  },
  transmission: {
    type: String,
    enum: ['Manual', 'Automatic', 'Tiptronic'],
    default: 'Manual',
  },
  bodyType: {
    type: String,
    enum: ['Sedan', 'SUV', 'Hatchback', 'Van', 'Truck', 'Coupe', 'Wagon', 'Other'],
    default: 'Sedan',
  },
  location: { type: String, required: [true, 'Please add a location'] },
  description: { type: String, default: '' },
  images: [{ type: String }], // paths like /uploads/images-123.jpg
  status: {
    type: String,
    enum: ['Available', 'Active', 'Sold', 'Removed'],
    default: 'Available',
  },
}, { timestamps: true });

// Index for common queries
listingSchema.index({ status: 1, make: 1, fuelType: 1, bodyType: 1 });

module.exports = mongoose.model('Listing', listingSchema, 'vehiclelistings');
