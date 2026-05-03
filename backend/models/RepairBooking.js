const mongoose = require('mongoose');

const repairBookingSchema = new mongoose.Schema({
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
  serviceOfferingIds: {
    type: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ServiceOffering',
    }],
    required: [true, 'At least one service offering is required'],
    validate: {
      validator: function (arr) {
        return arr.length > 0;
      },
      message: 'At least one service offering required',
    },
  },
  assignedMechanicId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null,
  },
  // Vehicle details entered by the customer at booking time
  vehicleInfo: {
    make: { type: String, required: true },
    model: { type: String, required: true },
    year: { type: Number, required: true },
    plateNumber: { type: String, required: true, uppercase: true, trim: true },
    vehicleType: {
      type: String,
      enum: ['Car', 'SUV', 'Van', 'Motorcycle', 'Truck', 'Any'],
      default: 'Car',
    },
  },
  preferredDate: { type: Date, required: true },
  preferredTime: { type: String, default: '' }, // e.g., "10:00 AM" — optional
  status: {
    type: String,
    enum: ['pending_confirmation', 'confirmed', 'in_progress', 'ready_for_pickup', 'completed', 'cancelled'],
    default: 'pending_confirmation',
  },
  statusHistory: [{
    status: { type: String },
    changedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    changedAt: { type: Date, default: Date.now },
    note: { type: String, default: '' },
  }],
  customerNotes: { type: String, default: '' },
  mechanicNotes: { type: String, default: '' },
  ownerNotes: { type: String, default: '' },
  partsUsed: [{
    name:     { type: String, required: true },
    quantity:  { type: Number, required: true, min: 1 },
    price:     { type: Number, required: true, min: 0 }, // what was charged per unit
  }],
  estimatedTotal: { type: Number, default: 0 },
  finalInvoiceAmount: { type: Number, default: 0 },
  cancelReason: { type: String, default: '' },
  cancelledBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null,
  },
  // Set by reviewController after customer leaves a review — used to hide the "Leave Review" button
  review: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Review',
    default: null,
  },
}, { timestamps: true });

// Indexes for performance - support the most common query patterns
repairBookingSchema.index({ customerId: 1, status: 1, createdAt: -1 }); // For getMyBookings
repairBookingSchema.index({ garageId: 1, status: 1, createdAt: -1 }); // For getBookingQueue
repairBookingSchema.index({ assignedMechanicId: 1, status: 1, preferredDate: 1 }); // For getMyJobs
repairBookingSchema.index({ customerId: 1, garageId: 1, preferredDate: 1, status: 1 }); // For duplicate booking guard

module.exports = mongoose.model('RepairBooking', repairBookingSchema);
