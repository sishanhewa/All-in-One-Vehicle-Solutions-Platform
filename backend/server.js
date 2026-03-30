const express = require('express');
const dotenv = require('dotenv');
const path = require('path');
const cors = require('cors');
const connectDB = require('./config/db');

// Import Routes
const marketplaceRoutes = require('./routes/marketplaceRoutes');
const authRoutes = require('./routes/authRoutes');
// const inspectionRoutes = require('./routes/inspectionRoutes');

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
app.use('/api/marketplace', marketplaceRoutes);
app.use('/api/auth', authRoutes);
// app.use('/api/inspection', inspectionRoutes);

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
