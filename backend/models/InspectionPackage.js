const mongoose = require('mongoose');

const inspectionPackageSchema = new mongoose.Schema({
  companyId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  name: { type: String, required: [true, 'Package name is required'] },
  description: { type: String, required: [true, 'Package description is required'] },
  price: { type: Number, required: [true, 'Package price is required'] },
  duration: { type: Number, required: [true, 'Estimated duration (minutes) is required'] },
  vehicleTypes: [{
    type: String,
    enum: ['Car', 'SUV', 'Van', 'Motorcycle', 'Truck'],
  }],
  checklistItems: [{ type: String }],
  images: [{ type: String }],
  isActive: { type: Boolean, default: true },
}, { timestamps: true });

module.exports = mongoose.model('InspectionPackage', inspectionPackageSchema);
