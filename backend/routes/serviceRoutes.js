const express = require('express');
const router = express.Router();

// Test route
router.get('/', (req, res) => {
  res.json({ message: 'Service & Repair API ready', version: '1.0' });
});

module.exports = router;
