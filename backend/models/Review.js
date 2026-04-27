const mongoose = require('mongoose');

const reviewSchema = new mongoose.Schema({
  bookingId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'RepairBooking',
    required: true,
  },
  customerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  garageId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ServiceProvider',
    required: true,
  },
  mechanicId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null,
  },
  garageRating: {
    type: Number,
    required: [true, 'Garage rating is required'],
    min: 1,
    max: 5,
  },
  mechanicRating: {
    type: Number,
    default: null,
    min: 1,
    max: 5,
  },
  comment: {
    type: String,
    default: '',
    maxlength: 1000,
  },
}, { timestamps: true });

// Compound unique index to prevent duplicate reviews and handle race conditions
reviewSchema.index({ bookingId: 1, customerId: 1 }, { unique: true });

// Index for efficient garage rating lookups
reviewSchema.index({ garageId: 1, createdAt: -1 });

module.exports = mongoose.model('Review', reviewSchema);
