const mongoose = require('mongoose');

const rentalBookingSchema = new mongoose.Schema({
  vehicle: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'RentalVehicle',
    required: true
  },
  renter: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  owner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  startDate: { type: Date, required: true },
  endDate: { type: Date, required: true },
  totalDays: { type: Number },
  totalMonths: { type: Number },
  
  // Renter Proof Documents (Paths)
  drivingLicensePath: { type: String, required: true },
  idProofPath: { type: String, required: true },
  billingProofPath: { type: String, required: true },

  // Guarantor Details
  guarantorName: { type: String, required: true },
  guarantorIdPath: { type: String, required: true },
  guarantorBillingPath: { type: String, required: true },

  status: {
    type: String,
    enum: ['Pending', 'Accepted', 'Rejected', 'Completed', 'Cancelled'],
    default: 'Pending'
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('RentalBooking', rentalBookingSchema);
