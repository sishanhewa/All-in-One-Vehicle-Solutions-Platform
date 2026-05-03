const mongoose = require('mongoose');

const supportTicketSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  category: {
    type: String,
    enum: [
      'Vehicle Listing Issue',
      'Rental Dispute',
      'Spare Part Complaint',
      'Inspection Problem',
      'Payment Issue',
      'Account Issue',
      'App Bug',
      'Other',
    ],
    default: 'Other',
  },
  subject: {
    type: String,
    required: [true, 'Please add a subject'],
    maxlength: [120, 'Subject cannot exceed 120 characters'],
  },
  description: {
    type: String,
    required: [true, 'Please describe your issue'],
  },
  relatedEntity: {
    entityType: {
      type: String,
      enum: ['Listing', 'RentalBooking', 'VehiclePart', 'InspectionBooking', 'None'],
      default: 'None',
    },
    entityId: {
      type: mongoose.Schema.Types.ObjectId,
      default: null,
    },
  },
  images: [{ type: String }],
  priority: {
    type: String,
    enum: ['Low', 'Medium', 'High', 'Urgent'],
    default: 'Medium',
  },
  status: {
    type: String,
    enum: ['Open', 'In Progress', 'Resolved', 'Closed'],
    default: 'Open',
  },
  responses: [{
    responderRole: { type: String, enum: ['User', 'Admin'], default: 'User' },
    responderId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    message: { type: String, required: true },
    createdAt: { type: Date, default: Date.now },
  }],
  resolvedAt: { type: Date, default: null },
}, { timestamps: true });

supportTicketSchema.index({ userId: 1, status: 1 });
supportTicketSchema.index({ status: 1, priority: 1 });

module.exports = mongoose.model('SupportTicket', supportTicketSchema, 'supporttickets');
