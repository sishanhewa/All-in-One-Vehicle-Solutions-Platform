const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  name:     { type: String, required: [true, 'Please add a name'] },
  email:    { type: String, required: [true, 'Please add an email'], unique: true },
  password: { type: String, required: [true, 'Please add a password'] },
  phone:    { type: String, required: [true, 'Please add a phone number'] },

  // 'User' = Customer | 'GarageOwner' | 'Mechanic' | 'Admin'
  // InspectionCompany is handled by that module's own User records
  role: {
    type: String,
    enum: ['User', 'Admin', 'InspectionCompany', 'GarageOwner', 'Mechanic'],
    default: 'User',
  },

  // Link: Mechanic → their garage (ServiceProvider._id). Null for all other roles.
  garageId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ServiceProvider',
    default: null,
  },

  // Soft-delete / deactivation flag (used for mechanics; Admin can also suspend any user)
  isActive: { type: Boolean, default: true },

  // ─── Inspection module: company profile ──────────────────────────────────────
  // The Inspection module stores its company-level data embedded on the User
  // document for InspectionCompany accounts. The Service & Repair module does
  // NOT use this field — garage data lives exclusively in ServiceProvider.
  companyProfile: {
    companyName:    { type: String },
    description:    { type: String },
    address:        { type: String },
    city:           { type: String },
    logo:           { type: String },
    operatingHours: { type: String },
    website:        { type: String },
    rating:         { type: Number, default: 0 },
    totalReviews:   { type: Number, default: 0 },
    isVerified:     { type: Boolean, default: false },
  },
  // NOTE: serviceProviderProfile has been intentionally removed.
  // Garage/ServiceProvider data lives exclusively in the ServiceProvider collection.
}, { timestamps: true });

// Pre-save hook to hash passwords before saving
userSchema.pre('save', async function () {
  if (!this.isModified('password')) return;
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

// Helper to verify passwords upon login
userSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

module.exports = mongoose.model('User', userSchema);
