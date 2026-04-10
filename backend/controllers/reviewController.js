const asyncHandler = require('express-async-handler');
const Review = require('../models/Review');
const RepairBooking = require('../models/RepairBooking');
const User = require('../models/User');

// @desc    Create a review for a completed booking
// @route   POST /api/service/bookings/:id/review
// @access  Private (User)
const createReview = asyncHandler(async (req, res) => {
  // Only customers can create reviews
  if (req.user.role !== 'User') {
    res.status(403);
    throw new Error('Only customers can create reviews');
  }

  const booking = await RepairBooking.findById(req.params.id);
  if (!booking) {
    res.status(404);
    throw new Error('Booking not found');
  }

  // Verify the customer owns this booking
  if (booking.customerId.toString() !== req.user._id.toString()) {
    res.status(403);
    throw new Error('Not authorized');
  }

  // Can only review completed bookings
  if (booking.status !== 'completed') {
    res.status(400);
    throw new Error('Can only review completed bookings');
  }

  // Check for existing review
  const existing = await Review.findOne({ bookingId: req.params.id });
  if (existing) {
    res.status(400);
    throw new Error('You have already reviewed this booking');
  }

  // Validate garageRating
  const { garageRating, mechanicRating, comment } = req.body;
  if (!garageRating || garageRating < 1 || garageRating > 5) {
    res.status(400);
    throw new Error('Garage rating must be between 1 and 5');
  }

  // Create the review
  const review = await Review.create({
    bookingId: req.params.id,
    customerId: req.user._id,
    garageId: booking.garageId,
    mechanicId: booking.assignedMechanicId || null,
    garageRating,
    mechanicRating: mechanicRating || null,
    comment: comment || '',
  });

  // Recalculate garage rating
  const result = await Review.aggregate([
    { $match: { garageId: booking.garageId } },
    { $group: { _id: null, avgRating: { $avg: '$garageRating' }, count: { $sum: 1 } } },
  ]);

  if (result.length > 0) {
    await User.findByIdAndUpdate(booking.garageId, {
      'serviceProviderProfile.rating': Math.round(result[0].avgRating * 10) / 10,
      'serviceProviderProfile.totalReviews': result[0].count,
    });
  }

  res.status(201).json(review);
});

module.exports = {
  createReview,
};
