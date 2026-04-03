const express = require('express');
const router = express.Router();
const {
  createRentalVehicle,
  getRentalVehicles,
  getRentalVehicleById,
  requestBooking,
  getOwnerBookings,
  getRenterBookings,
  getBookingById,
  updateBookingStatus
} = require('../controllers/rentalController');
const { protect } = require('../middleware/authMiddleware');
const upload = require('../middleware/uploadMiddleware');

router.route('/')
  .post(protect, upload.array('images', 5), createRentalVehicle)
  .get(getRentalVehicles);

router.get('/owner/bookings', protect, getOwnerBookings);
router.get('/my-bookings', protect, getRenterBookings);

router.get('/bookings/:id', protect, getBookingById);
router.put('/bookings/:id/status', protect, updateBookingStatus);

router.route('/:id')
  .get(getRentalVehicleById)
  .put(protect, updateRentalVehicle)
  .delete(protect, deleteRentalVehicle);

// Multi-file upload configuration for booking proofs
const bookingUploadFields = [
  { name: 'drivingLicense', maxCount: 1 },
  { name: 'idProof', maxCount: 1 },
  { name: 'billingProof', maxCount: 1 },
  { name: 'guarantorId', maxCount: 1 },
  { name: 'guarantorBilling', maxCount: 1 }
];

router.post('/:id/book', protect, upload.fields(bookingUploadFields), requestBooking);

module.exports = router;
