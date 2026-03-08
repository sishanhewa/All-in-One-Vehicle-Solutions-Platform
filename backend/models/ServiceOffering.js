const mongoose = require('mongoose');

const serviceOfferingSchema = new mongoose.Schema({
  garageId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  name: { type: String, required: [true, 'Service name is required'], trim: true },
  description: { type: String, required: [true, 'Service description is required'] },
  category: {
    type: String,
    required: [true, 'Service category is required'],
    enum: ['Engine', 'Brakes', 'Tires', 'AC', 'Electrical', 'Bodywork', 'Diagnostics', 'Oil Change', 'Transmission', 'Wheels', 'Other'],
  },
  estimatedPrice: { type: Number, required: [true, 'Estimated price is required'], min: 0 },
  estimatedDuration: { type: Number, required: [true, 'Estimated duration (minutes) is required'], min: 1 },
  vehicleTypes: [{
    type: String,
    enum: ['Car', 'SUV', 'Van', 'Motorcycle', 'Truck', 'Any'],
    default: ['Any'],
  }],
  images: [{ type: String }],
  isActive: { type: Boolean, default: true },
}, { timestamps: true });

module.exports = mongoose.model('ServiceOffering', serviceOfferingSchema);
