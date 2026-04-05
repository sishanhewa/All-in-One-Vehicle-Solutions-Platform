const express = require('express');
const router = express.Router();
const upload = require('../middleware/uploadMiddleware');
const { protect } = require('../middleware/authMiddleware');
const { requireRole } = require('../middleware/roleMiddleware');
const { registerGarage, getAllGarages, getGarageById, getOwnerProfile, updateOwnerProfile } = require('../controllers/serviceProviderController');

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

module.exports = router;
