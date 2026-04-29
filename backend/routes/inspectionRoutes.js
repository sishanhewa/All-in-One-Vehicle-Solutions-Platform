const express = require('express');
const router = express.Router();

const { upload } = require('../middleware/uploadMiddleware');
const { protect } = require('../middleware/authMiddleware');
const { requireRole } = require('../middleware/roleMiddleware');

// Import Controllers
const {
  registerCompany,
  getCompanyProfile,
  updateCompanyProfile,
  getAllCompanies,
  getCompanyById,
  createPackage,
  updatePackage,
  deletePackage,
  getMyPackages,
  getPackagesByCompany,
} = require('../controllers/inspectionCompanyController');

const {
  createBooking,
  getMyBookings,
  getBookingById,
  cancelBooking,
  getCompanyQueue,
  confirmBooking,
  startInspection,
  completeInspection,
  uploadReportImages,
} = require('../controllers/inspectionBookingController');

// ==========================================
// COMPANY ROUTES
// ==========================================

// Public: Register as an inspection company
router.post('/companies/register', registerCompany);

// Public: Browse all companies
router.get('/companies', getAllCompanies);

// Private: Get/Update own company profile (must be before /:id route)
router.get('/companies/profile', protect, requireRole('InspectionCompany'), getCompanyProfile);
router.put('/companies/profile', protect, requireRole('InspectionCompany'), upload.array('logo', 1), updateCompanyProfile);

// Public: Get single company by ID
router.get('/companies/:id', getCompanyById);

// Public: Get all active packages for a specific company
router.get('/companies/:id/packages', getPackagesByCompany);

// ==========================================
// PACKAGE ROUTES
// ==========================================

// Private: Company manages their own packages
router.get('/packages/my-packages', protect, requireRole('InspectionCompany'), getMyPackages);
router.post('/packages', protect, requireRole('InspectionCompany'), upload.array('images', 5), createPackage);
router.put('/packages/:id', protect, requireRole('InspectionCompany'), upload.array('images', 5), updatePackage);
router.delete('/packages/:id', protect, requireRole('InspectionCompany'), deletePackage);

// ==========================================
// BOOKING ROUTES
// ==========================================

// Private (User): Create a booking and view own bookings
router.post('/bookings', protect, createBooking);
router.get('/bookings/my-bookings', protect, getMyBookings);

// Private (InspectionCompany): Company queue management
router.get('/bookings/queue', protect, requireRole('InspectionCompany'), getCompanyQueue);

// Private (Auth): View single booking (user or company)
router.get('/bookings/:id', protect, getBookingById);

// Private (User or Company): Cancel booking
router.put('/bookings/:id/cancel', protect, cancelBooking);

// Private (InspectionCompany): Booking lifecycle actions
router.put('/bookings/:id/confirm', protect, requireRole('InspectionCompany'), confirmBooking);
router.put('/bookings/:id/start', protect, requireRole('InspectionCompany'), startInspection);
router.put('/bookings/:id/complete', protect, requireRole('InspectionCompany'), completeInspection);
router.post('/bookings/:id/images', protect, requireRole('InspectionCompany'), upload.array('reportImages', 10), uploadReportImages);

module.exports = router;
