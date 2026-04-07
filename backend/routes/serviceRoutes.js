const express = require('express');
const router = express.Router();
const upload = require('../middleware/uploadMiddleware');
const { protect } = require('../middleware/authMiddleware');
const { requireRole } = require('../middleware/roleMiddleware');
const { registerGarage, getAllGarages, getGarageById, getOwnerProfile, updateOwnerProfile } = require('../controllers/serviceProviderController');
const { createOffering, getMyOfferings, getGarageOfferings, updateOffering, deleteOffering } = require('../controllers/serviceOfferingController');
const { addMechanic, listMechanics, removeMechanic } = require('../controllers/mechanicController');

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

module.exports = router;
