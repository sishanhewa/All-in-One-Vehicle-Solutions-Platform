const express = require('express');
const router = express.Router();
const { upload } = require('../middleware/uploadMiddleware');
const { protect } = require('../middleware/authMiddleware');
const { requireRole } = require('../middleware/roleMiddleware');

const {
  registerGarage, getAllGarages, getGarageById,
  getOwnerGarage, updateOwnerGarage,
} = require('../controllers/serviceProviderController');


const {
  createOffering, getMyOfferings, getGarageOfferings,
  getOfferingById, updateOffering, deleteOffering,
} = require('../controllers/serviceOfferingController');

const {
  listMechanics, getMechanicById, addMechanic,
  updateMechanic, deactivateMechanic, removeMechanic,
  getMyMechanicProfile, updateMyMechanicProfile,
} = require('../controllers/mechanicController');

const {
  createBooking, getMyBookings, getBookingQueue,
  getMyJobs, getBookingById,
  confirmBooking, declineBooking,
  startJob, markReadyForPickup, completeBooking,
  cancelBooking, updateJobNotes,
  reassignMechanic, updatePendingBooking,
} = require('../controllers/repairBookingController');

const { createReview } = require('../controllers/reviewController');

const {
  getAllGaragesAdmin, verifyGarage, suspendGarage, deleteGarage,
  getAllBookingsAdmin, deleteBooking,
  getPlatformStats,
  getAllUsersAdmin, getUserByIdAdmin, changeUserRole, toggleUserActive,
} = require('../controllers/adminServiceController');

// ── Health check ────────────────────────────────────────────────────────────
router.get('/', (req, res) => {
  res.json({ message: 'Service & Repair API ready', version: '2.0' });
});

// ── Garage registration (public) ────────────────────────────────────────────
router.post('/garages/register', upload.single('logo'), registerGarage);

// ── Garage owner self-service routes (must come before /garages/:id) ────────────
router.get('/garages/me', protect, requireRole('GarageOwner'), getOwnerGarage);
router.put('/garages/me', protect, requireRole('GarageOwner'), upload.single('logo'), updateOwnerGarage);

// ── Public garage browsing ───────────────────────────────────────────────────
router.get('/garages', getAllGarages);
router.get('/garages/:id', getGarageById);
router.get('/garages/:garageId/offerings', getGarageOfferings);

// ── Service offerings ────────────────────────────────────────────────────────
router.post  ('/offerings',             protect, requireRole('GarageOwner'), createOffering);
router.get   ('/offerings/my-offerings',protect, requireRole('GarageOwner'), getMyOfferings);
router.get   ('/offerings/:id',         getOfferingById);                     // public
router.put   ('/offerings/:id',         protect, requireRole('GarageOwner'), updateOffering);
router.delete('/offerings/:id',         protect, requireRole('GarageOwner'), deleteOffering);

// ── Mechanic management (GarageOwner) ───────────────────────────────────────
router.get   ('/mechanics',                protect, requireRole('GarageOwner'), listMechanics);
router.post  ('/mechanics',                protect, requireRole('GarageOwner'), addMechanic);
router.get   ('/mechanics/me',             protect, requireRole('Mechanic'),    getMyMechanicProfile);
router.put   ('/mechanics/me',             protect, requireRole('Mechanic'),    updateMyMechanicProfile);
router.get   ('/mechanics/:id',            protect, requireRole('GarageOwner'), getMechanicById);
router.put   ('/mechanics/:id',            protect, requireRole('GarageOwner'), updateMechanic);
router.put   ('/mechanics/:id/deactivate', protect, requireRole('GarageOwner'), deactivateMechanic);
router.delete('/mechanics/:id',            protect, requireRole('GarageOwner'), removeMechanic);

// ── Repair bookings ──────────────────────────────────────────────────────────
router.post('/bookings',              protect, createBooking);
router.get ('/bookings/my-bookings',  protect, getMyBookings);
router.get ('/bookings/queue',        protect, requireRole('GarageOwner'), getBookingQueue);
router.get ('/bookings/my-jobs',      protect, requireRole('Mechanic'),    getMyJobs);
router.get ('/bookings/:id',          protect, getBookingById);
router.put ('/bookings/:id',          protect, requireRole('User'),        updatePendingBooking);

// Booking lifecycle
router.put('/bookings/:id/confirm',   protect, requireRole('GarageOwner'), confirmBooking);
router.put('/bookings/:id/decline',   protect, requireRole('GarageOwner'), declineBooking);
router.put('/bookings/:id/reassign',  protect, requireRole('GarageOwner'), reassignMechanic);
router.put('/bookings/:id/start',     protect, requireRole('Mechanic'),    startJob);
router.put('/bookings/:id/ready',     protect, requireRole('Mechanic'),    markReadyForPickup);
router.put('/bookings/:id/notes',     protect, requireRole('Mechanic'),    updateJobNotes);
router.put('/bookings/:id/complete',  protect, requireRole('GarageOwner'), completeBooking);
router.put('/bookings/:id/cancel',    protect, cancelBooking);

// Review (after completion)
router.post('/bookings/:id/review',   protect, requireRole('User'), createReview);

// ── Admin routes ─────────────────────────────────────────────────────────────
router.get   ('/admin/garages',                protect, requireRole('Admin'), getAllGaragesAdmin);
router.put   ('/admin/garages/:id/verify',     protect, requireRole('Admin'), verifyGarage);
router.put   ('/admin/garages/:id/suspend',    protect, requireRole('Admin'), suspendGarage);
router.delete('/admin/garages/:id',            protect, requireRole('Admin'), deleteGarage);

router.get   ('/admin/bookings',               protect, requireRole('Admin'), getAllBookingsAdmin);
router.delete('/admin/bookings/:id',           protect, requireRole('Admin'), deleteBooking);

router.get   ('/admin/stats',                  protect, requireRole('Admin'), getPlatformStats);

router.get   ('/admin/users',                  protect, requireRole('Admin'), getAllUsersAdmin);
router.get   ('/admin/users/:id',              protect, requireRole('Admin'), getUserByIdAdmin);
router.put   ('/admin/users/:id/role',         protect, requireRole('Admin'), changeUserRole);
router.put   ('/admin/users/:id/toggle-active',protect, requireRole('Admin'), toggleUserActive);

module.exports = router;
