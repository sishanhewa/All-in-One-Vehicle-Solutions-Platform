const mongoose = require('mongoose');

const rentalVehicleSchema = new mongoose.Schema({
  owner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  make: { type: String, required: true },
  model: { type: String, required: true },
  year: { type: Number, required: true },
  transmission: { type: String, enum: ['Auto', 'Manual'], required: true },
  shortTermDailyRate: { type: Number, required: true },
  longTermMonthlyRate: { type: Number, required: true },
  mileageLimit: { type: Number, required: true },
  mileageLimitType: { type: String, enum: ['Daily', 'Monthly'], required: true },
  extraMileageRate: { type: Number, required: true },
  deposit: { type: Number, required: true },
  images: [{ type: String }], // URLs or file paths
  description: { type: String },
  availability: { type: Boolean, default: true },
  requiredDocuments: {
    drivingLicense: { type: Boolean, default: true },
    idProof: { type: Boolean, default: true },
    billingProof: { type: Boolean, default: true },
    guarantorId: { type: Boolean, default: true },
    guarantorBilling: { type: Boolean, default: true }
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('RentalVehicle', rentalVehicleSchema);
