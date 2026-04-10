const express = require('express');
const router = express.Router();
const upload = require('../middleware/uploadMiddleware');
const { protect } = require('../middleware/authMiddleware');
const { requireRole } = require('../middleware/roleMiddleware');
const { registerGarage, getAllGarages, getGarageById, getOwnerProfile, updateOwnerProfile } = require('../controllers/serviceProviderController');
const { createOffering, getMyOfferings, getGarageOfferings, updateOffering, deleteOffering } = require('../controllers/serviceOfferingController');
const { addMechanic, listMechanics, removeMechanic } = require('../controllers/mechanicController');
const { createBooking, getMyBookings, getBookingQueue, getMyJobs, getBookingById, confirmBooking, declineBooking, startJob, markReadyForPickup, completeBooking, cancelBooking, updateJobNotes } = require('../controllers/repairBookingController');
const { createReview } = require('../controllers/reviewController');
const { getAllGaragesAdmin, verifyGarage, suspendGarage, getAllBookingsAdmin, getPlatformStats } = require('../controllers/adminServiceController');

// Test route
router.get('/', (req, res) => {
  res.json({ message: 'Service & Repair API ready', version: '1.0' });
});

// Garage registration route
router.post('/garages/register', upload.single('logo'), registerGarage);

// Protected garage owner profile routes (must come before /garages/:id)
router.get('/garages/profile', protect, requireRole('GarageOwner'), getOwnerProfile);
router.put('/garages/profile', protect, requireRole('GarageOwner'), upload.single('logo'), updateOwnerProfile);

// Public garage browsing routes
router.get('/garages', getAllGarages);
router.get('/garages/:id', getGarageById);

// Service offering routes
router.post('/offerings', protect, requireRole('GarageOwner'), createOffering);
router.get('/offerings/my-offerings', protect, requireRole('GarageOwner'), getMyOfferings);
router.get('/garages/:garageId/offerings', getGarageOfferings);
router.put('/offerings/:id', protect, requireRole('GarageOwner'), updateOffering);
router.delete('/offerings/:id', protect, requireRole('GarageOwner'), deleteOffering);

// Mechanic management routes
router.get('/mechanics', protect, requireRole('GarageOwner'), listMechanics);
router.post('/mechanics', protect, requireRole('GarageOwner'), addMechanic);
router.delete('/mechanics/:id', protect, requireRole('GarageOwner'), removeMechanic);

// Repair booking routes
router.post('/bookings', protect, createBooking);
router.get('/bookings/my-bookings', protect, getMyBookings);
router.get('/bookings/queue', protect, requireRole('GarageOwner'), getBookingQueue);
router.get('/bookings/my-jobs', protect, requireRole('Mechanic'), getMyJobs);
router.get('/bookings/:id', protect, getBookingById);

// Booking lifecycle routes
router.put('/bookings/:id/confirm', protect, requireRole('GarageOwner'), confirmBooking);
router.put('/bookings/:id/decline', protect, requireRole('GarageOwner'), declineBooking);
router.put('/bookings/:id/start', protect, requireRole('Mechanic'), startJob);
router.put('/bookings/:id/ready', protect, requireRole('Mechanic'), markReadyForPickup);
router.put('/bookings/:id/complete', protect, requireRole('GarageOwner'), completeBooking);
router.put('/bookings/:id/cancel', protect, cancelBooking);
router.put('/bookings/:id/notes', protect, requireRole('Mechanic'), updateJobNotes);

// Review routes
router.post('/bookings/:id/review', protect, createReview);

// Admin routes
router.get('/admin/garages', protect, requireRole('Admin'), getAllGaragesAdmin);
router.put('/admin/garages/:id/verify', protect, requireRole('Admin'), verifyGarage);
router.put('/admin/garages/:id/suspend', protect, requireRole('Admin'), suspendGarage);
router.get('/admin/bookings', protect, requireRole('Admin'), getAllBookingsAdmin);
router.get('/admin/stats', protect, requireRole('Admin'), getPlatformStats);

module.exports = router;
