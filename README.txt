================================================================================
  README — Vehicle Management System (VMS)
  All-in-One Vehicle Solutions Platform
================================================================================

--------------------------------------------------------------------------------
01. GITHUB REPOSITORY
--------------------------------------------------------------------------------

  GitHub Repository: https://github.com/sishanhewa/All-in-One-Vehicle-Solutions-Platform

--------------------------------------------------------------------------------
02. TEAM DETAILS
--------------------------------------------------------------------------------

  Group Number  : ITP-SE-03
  Project Title : Vehicle Management System — All-in-One Vehicle Solutions Platform

  Member 1 : IT24100097 – Sishan Hewapathirana – Vehicle Inspection & Verification,
                           User Authentication, Admin Dashboard & Deployment
  Member 2 : IT24103109 – Rashmi              – Vehicle Marketplace
  Member 3 : IT24102298 – Sadila              – Vehicle Rental Management
  Member 4 : IT24103553 – Shanuka             – Spare Parts Management
  Member 5 : IT24100743 – Malaka              – Service & Repair Management
  Member 6 : IT24101984 – Tharusha            – Complaint / Support Management

--------------------------------------------------------------------------------
03. DEPLOYMENT DETAILS
--------------------------------------------------------------------------------

  Backend API URL  : https://all-in-one-vehicle-solutions-platform.onrender.com
  Backend Port     : 5000
  Frontend         : React Native (Expo) — run locally via Expo Go or emulator

  Cloud Services:
    Database       : MongoDB Atlas (3-node replica set)
                     Cluster : ac-yis5rgw.qgipjae.mongodb.net
                     DB Name : vehicle_marketplace
    File Storage   : Cloudinary (images & documents for all modules)
                     Cloud Name : ddpplpsy1

--------------------------------------------------------------------------------
04. TECH STACK
--------------------------------------------------------------------------------

  Frontend  : React Native (Expo SDK 54), Expo Router, React Navigation,
              AsyncStorage, Expo SecureStore
  Backend   : Node.js, Express 5, Mongoose, JWT (jsonwebtoken),
              bcryptjs, Multer, Cloudinary, CORS
  Database  : MongoDB Atlas

--------------------------------------------------------------------------------
05. HOW TO RUN LOCALLY
--------------------------------------------------------------------------------

  Prerequisites:
    - Node.js >= 18
    - npm >= 9
    - Expo CLI  (npm install -g expo-cli)
    - MongoDB Atlas account (or use the shared URI above)

  BACKEND:
    cd Vehicle-Management-System/backend
    npm install
    # Create a .env file with the values above
    npm run dev
    # Server starts at http://localhost:5000

  FRONTEND:
    cd Vehicle-Management-System/frontend
    npm install
    npx expo start
    # Scan QR code with Expo Go app, or press 'a' for Android emulator

  NOTE: Update the API base URL in frontend/src/api/*.js files to match
        your backend server IP if running on a physical device.

--------------------------------------------------------------------------------
06. FEATURE MODULES
--------------------------------------------------------------------------------

  1. User Authentication          — Register, Login, JWT auth, RBAC
  2. Vehicle Marketplace          — Buy & sell vehicles with image listings
  3. Vehicle Rental Management    — Rent vehicles with document verification
  4. Spare Parts Management       — Buy & sell spare parts with compatibility
  5. Service & Repair Management  — Book mechanics and garage services
  6. Complaint / Support          — Submit and track support tickets
  7. Admin Dashboard              — Platform-wide management for admins

--------------------------------------------------------------------------------
07. GIT BRANCHES
--------------------------------------------------------------------------------

  master                  — Production-ready integrated codebase
  IT24100097-Sishan       — Inspection, Auth, Admin, Deployment
  IT24103109-Rashmi       — Vehicle Marketplace
  IT24102298-Sadila       — Vehicle Rental
  IT24103553-Shanuka      — Spare Parts
  IT24100743-Malaka       — Service & Repair
  IT24101984-Tharusha     — Complaint / Support

================================================================================
