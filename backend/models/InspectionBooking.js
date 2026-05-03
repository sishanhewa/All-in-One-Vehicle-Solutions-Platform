const mongoose = require('mongoose');

const inspectionBookingSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  companyId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  packageId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'InspectionPackage',
    required: true
  },
  // Vehicle details entered by the user at booking time
  vehicleInfo: {
    make: { type: String, required: true },
    model: { type: String, required: true },
    year: { type: Number, required: true },
    plateNumber: { type: String, required: true },
    vehicleType: {
      type: String,
      enum: ['Car', 'SUV', 'Van', 'Motorcycle', 'Truck'],
      default: 'Car'
    },
  },
  appointmentDate: { type: Date, required: true },
  appointmentTime: { type: String, required: true }, // e.g., "10:00 AM"
  status: {
    type: String,
    enum: ['Pending', 'Confirmed', 'In Progress', 'Completed', 'Cancelled'],
    default: 'Pending'
  },
  notes: { type: String }, // User notes for the company
  cancelReason: { type: String }, // If cancelled

  // === Post-Inspection Fields (filled by company) ===
  inspectionResult: {
    type: String,
    enum: ['Pass', 'Fail', 'Conditional', null],
    default: null
  },
  overallScore: { type: Number, min: 0, max: 100, default: null },
  checklist: [{
    item: { type: String },
    condition: { type: String, enum: ['Excellent', 'Good', 'Fair', 'Poor', 'N/A'] },
    notes: { type: String },
  }],
  resultRemarks: { type: String },
  reportImages: [{ type: String }],
  completedDate: { type: Date },
}, { timestamps: true });

module.exports = mongoose.model('InspectionBooking', inspectionBookingSchema);
