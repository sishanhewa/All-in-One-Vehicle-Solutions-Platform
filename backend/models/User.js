const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  name: { type: String, required: [true, 'Please add a name'] },
  email: { type: String, required: [true, 'Please add an email'], unique: true },
  password: { type: String, required: [true, 'Please add a password'] },
  // Phone is extremely important for a Riyasewana-style classifieds platform
  phone: { type: String, required: [true, 'Please add a phone number'] }, 
  role: { type: String, enum: ['User', 'Admin', 'InspectionCompany'], default: 'User' },
  // Fields only applicable when role === 'InspectionCompany'
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
}, { timestamps: true });

// Pre-save hook to hash passwords before saving them into the DB
userSchema.pre('save', async function () {
  if (!this.isModified('password')) {
    return;
  }
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

// Helper method appended to the User model to verify passwords upon login
userSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

module.exports = mongoose.model('User', userSchema);
