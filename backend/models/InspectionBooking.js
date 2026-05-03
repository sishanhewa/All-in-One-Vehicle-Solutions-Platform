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
  customerEmail: { type: String }, // Email where the report should be sent

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

  // === Structured Inspection Report (mirrors physical form) ===
  inspectionReport: {
    reportNumber: { type: String },
    inspectionDateTime: { type: Date },
    vehiclePowerSystem: {
      type: String,
      enum: ['Hybrid', 'Non-Hybrid', 'Electric'],
    },
    registrationNo: { type: String },
    meterReading: { type: String },

    engineOn: {
      lightsAndIndicators:      { type: String, enum: ['checked','problem','adjusted','clean','replace','na'], default: 'na' },
      horn:                     { type: String, enum: ['checked','problem','adjusted','clean','replace','na'], default: 'na' },
      windshieldWashersWipers:  { type: String, enum: ['checked','problem','adjusted','clean','replace','na'], default: 'na' },
      steeringFreePlay:         { type: String, enum: ['checked','problem','adjusted','clean','replace','na'], default: 'na' },
      brakeClutchPedal:         { type: String, enum: ['checked','problem','adjusted','clean','replace','na'], default: 'na' },
      parkingBrakeLevel:        { type: String, enum: ['checked','problem','adjusted','clean','replace','na'], default: 'na' },
      sideMirrorOperation:      { type: String, enum: ['checked','problem','adjusted','clean','replace','na'], default: 'na' },
      powerWindowsOperation:    { type: String, enum: ['checked','problem','adjusted','clean','replace','na'], default: 'na' },
      seatBeltOperation:        { type: String, enum: ['checked','problem','adjusted','clean','replace','na'], default: 'na' },
      powerSteeringFluidEPS:    { type: String, enum: ['checked','problem','adjusted','clean','replace','na'], default: 'na' },
      engineNoise:              { type: String, enum: ['checked','problem','adjusted','clean','replace','na'], default: 'na' },
    },
    engineOff: {
      engineOilLevelCheck:      { type: String, enum: ['checked','problem','adjusted','clean','replace','na'], default: 'na' },
      brakeFluid:               { type: String, enum: ['checked','problem','adjusted','clean','replace','na'], default: 'na' },
      clutchFluid:              { type: String, enum: ['checked','problem','adjusted','clean','replace','na'], default: 'na' },
      windscreenWasherFluid:    { type: String, enum: ['checked','problem','adjusted','clean','replace','na'], default: 'na' },
      engineCoolant:            { type: String, enum: ['checked','problem','adjusted','clean','replace','na'], default: 'na' },
      inverterCoolant:          { type: String, enum: ['checked','problem','adjusted','clean','replace','na'], default: 'na' },
      driveBelts:               { type: String, enum: ['checked','problem','adjusted','clean','replace','na'], default: 'na' },
      auxBatteryCondition:      { type: String, enum: ['checked','problem','adjusted','clean','replace','na'], default: 'na' },
      acFilter:                 { type: String, enum: ['checked','problem','adjusted','clean','replace','na'], default: 'na' },
      airFilter:                { type: String, enum: ['checked','problem','adjusted','clean','replace','na'], default: 'na' },
      hvBatteryAirFilter:       { type: String, enum: ['checked','problem','adjusted','clean','replace','na'], default: 'na' },
      evBlower:                 { type: String, enum: ['checked','problem','adjusted','clean','replace','na'], default: 'na' },
    },
    mechanical: {
      wheelBearing:             { type: String, enum: ['checked','problem','adjusted','clean','replace','na'], default: 'na' },
      steeringKnuckleLinkage:   { type: String, enum: ['checked','problem','adjusted','clean','replace','na'], default: 'na' },
      frontBrakes:              { type: String, enum: ['checked','problem','adjusted','clean','replace','na'], default: 'na' },
      rearBrakes:               { type: String, enum: ['checked','problem','adjusted','clean','replace','na'], default: 'na' },
      tyreCondition:            { type: String, enum: ['checked','problem','adjusted','clean','replace','na'], default: 'na' },
      oilDrain:                 { type: String, enum: ['checked','problem','adjusted','clean','replace','na'], default: 'na' },
      engineOilFilter:          { type: String, enum: ['checked','problem','adjusted','clean','replace','na'], default: 'na' },
      transmissionFluid:        { type: String, enum: ['checked','problem','adjusted','clean','replace','na'], default: 'na' },
      transferCaseOil:          { type: String, enum: ['checked','problem','adjusted','clean','replace','na'], default: 'na' },
      differentialOil:          { type: String, enum: ['checked','problem','adjusted','clean','replace','na'], default: 'na' },
      greasePoints:             { type: String, enum: ['checked','problem','adjusted','clean','replace','na'], default: 'na' },
    },
    suspensionWheelsExhaust: {
      linkBushesStabilizer:     { type: String, enum: ['checked','problem','adjusted','clean','replace','na'], default: 'na' },
      ballJoints:               { type: String, enum: ['checked','problem','adjusted','clean','replace','na'], default: 'na' },
      bushesAndMounts:          { type: String, enum: ['checked','problem','adjusted','clean','replace','na'], default: 'na' },
      shockAbsorbers:           { type: String, enum: ['checked','problem','adjusted','clean','replace','na'], default: 'na' },
      wheelRotation:            { type: String, enum: ['checked','problem','adjusted','clean','replace','na'], default: 'na' },
      oilFluidLeakage:          { type: String, enum: ['checked','problem','adjusted','clean','replace','na'], default: 'na' },
      tyrePressureSpare:        { type: String, enum: ['checked','problem','adjusted','clean','replace','na'], default: 'na' },
      driveShaftJackBoots:      { type: String, enum: ['checked','problem','adjusted','clean','replace','na'], default: 'na' },
      exhaustHangers:           { type: String, enum: ['checked','problem','adjusted','clean','replace','na'], default: 'na' },
      fillEngineOilCheckLevel:  { type: String, enum: ['checked','problem','adjusted','clean','replace','na'], default: 'na' },
      torqueWheelNuts:          { type: String, enum: ['checked','problem','adjusted','clean','replace','na'], default: 'na' },
    },

    serviceOptions: {
      fullService: { type: Boolean, default: false },
      oilChange: { type: Boolean, default: false },
      interior: { type: Boolean, default: false },
    },

    remarks: { type: String, default: '' },
    technicianSignature: { type: String },
    serviceAdviserSignature: { type: String },
    customerSignature: { type: String },
  }
}, { timestamps: true });

module.exports = mongoose.model('InspectionBooking', inspectionBookingSchema);
