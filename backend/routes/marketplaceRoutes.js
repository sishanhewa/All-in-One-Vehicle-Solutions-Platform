const express = require('express');
const router = express.Router();

const { upload } = require('../middleware/uploadMiddleware');
const { protect } = require('../middleware/authMiddleware');

const {
  getListings,
  getListingById,
  createListing,
  updateListing,
  deleteListing,
  getMyListings,
} = require('../controllers/marketplaceController');

// Public: Browse all active listings (supports query filters)
router.get('/', getListings);

// Private: Get logged-in user's own listings (must be before /:id)
router.get('/my-listings', protect, getMyListings);

// Public: Get single listing by ID
router.get('/:id', getListingById);

// Private: Create a new listing with image upload
router.post('/', protect, upload.array('images', 5), createListing);

// Private: Update a listing (owner only) with optional image upload
router.put('/:id', protect, upload.array('images', 5), updateListing);

// Private: Delete a listing (owner only)
router.delete('/:id', protect, deleteListing);

module.exports = router;
