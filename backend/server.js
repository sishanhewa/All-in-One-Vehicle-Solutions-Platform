const express = require('express');
const dotenv = require('dotenv');
const path = require('path');
const cors = require('cors');
const fs = require('fs');
const connectDB = require('./config/db');


// Import Routes
const authRoutes = require('./routes/authRoutes');

// Load enviornment variables
dotenv.config();

// Connect to MongoDB
connectDB();

// Initialize Express App
const app = express();

// Middleware
app.use(express.json()); // Parses incoming JSON requests
app.use(cors()); // Enables Cross-Origin Resource Sharing

// Make 'public/uploads' static so the mobile app can request the images over Http
app.use('/uploads', express.static(path.join(__dirname, 'public/uploads')));

// Mount the API Routes
app.use('/api/auth', authRoutes);

// Dynamically load feature routes depending on which branch you are on
if (fs.existsSync(path.join(__dirname, 'routes/marketplaceRoutes.js'))) {
  const marketplaceRoutes = require('./routes/marketplaceRoutes');
  app.use('/api/marketplace', marketplaceRoutes);
}

if (fs.existsSync(path.join(__dirname, 'routes/inspectionRoutes.js'))) {
  const inspectionRoutes = require('./routes/inspectionRoutes');
  app.use('/api/inspection', inspectionRoutes);
}

if (fs.existsSync(path.join(__dirname, 'routes/sparePartsRoutes.js'))) {
  const sparePartsRoutes = require('./routes/sparePartsRoutes');
  app.use('/api/spare-parts', sparePartsRoutes);
}

// Test Route
app.get('/', (req, res) => {
  res.status(200).json({ message: 'Vehicle Management API is up and running!' });
});

// JSON Error Handling Middleware (Catches errors from express-async-handler)
app.use((err, req, res, next) => {
  const statusCode = res.statusCode === 200 ? 500 : res.statusCode;
  res.status(statusCode).json({
    message: err.message,
    stack: process.env.NODE_ENV === 'production' ? null : err.stack,
  });
});

// Configure Port
const PORT = process.env.PORT || 5000;

// Start Server securely binding to all network interfaces (0.0.0.0)
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running in ${process.env.NODE_ENV} mode on port ${PORT}`);
});
