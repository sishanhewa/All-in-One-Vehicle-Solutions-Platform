const express = require('express');
const router = express.Router();

const upload = require('../middleware/uploadMiddleware');
const { protect } = require('../middleware/authMiddleware');

const {
  getAllParts,
  getPartById,
  createPart,
  updatePart,
  deletePart,
  getMyParts,
} = require('../controllers/sparePartsController');

// Public: Browse all available spare parts (supports query filters)
router.get('/', getAllParts);

// Private: Get logged-in user's own spare parts (must be before /:id)
router.get('/my-parts', protect, getMyParts);

// Public: Get single spare part by ID
router.get('/:id', getPartById);

// Private: Create a new spare part listing with image upload
router.post('/', protect, upload.array('images', 5), createPart);

// Private: Update a spare part (owner only) with optional image upload
router.put('/:id', protect, upload.array('images', 5), updatePart);

// Private: Delete a spare part (owner only)
router.delete('/:id', protect, deletePart);

module.exports = router;
