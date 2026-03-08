const mongoose = require('mongoose');

const reviewSchema = new mongoose.Schema({
  bookingId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'RepairBooking',
    required: true,
    unique: true,
  },
  customerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  garageId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
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

module.exports = mongoose.model('Review', reviewSchema);
