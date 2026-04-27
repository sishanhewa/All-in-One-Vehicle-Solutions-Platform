const mongoose = require('mongoose');

const serviceProviderSchema = new mongoose.Schema({
  ownerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true
  },
  garageName: { type: String, required: true, trim: true },
  description: { type: String, default: '' },
  address: { type: String, default: '' },
  city: { type: String, required: true },
  logo: { type: String, default: '' },
  operatingHours: { type: String, default: 'Mon-Sat 8:00 AM - 6:00 PM' },
  website: { type: String, default: '' },
  phone: { type: String, default: '' },
  rating: { type: Number, default: 0, min: 0, max: 5 },
  totalReviews: { type: Number, default: 0 },
  isVerified: { type: Boolean, default: false },
  isActive: { type: Boolean, default: true },
  // Auto-synced from active ServiceOffering categories on create/update/delete
  serviceCategories: [{ type: String }],
}, { timestamps: true });

// Indexes for performance
serviceProviderSchema.index({ ownerId: 1 }, { unique: true }); // Ensure one garage per owner
serviceProviderSchema.index({ city: 1, isVerified: 1, isActive: 1 }); // For city filtering queries
serviceProviderSchema.index({ isVerified: 1, isActive: 1, rating: -1 }); // For browse/listing queries
serviceProviderSchema.index({ garageName: 'text', description: 'text' }); // For search functionality

module.exports = mongoose.model('ServiceProvider', serviceProviderSchema);
