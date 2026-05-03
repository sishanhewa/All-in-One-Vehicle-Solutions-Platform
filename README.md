# All-in-One Vehicle Solutions Platform
### Vehicle Management System (VMS)

> A comprehensive full-stack mobile application that unifies all vehicle-related services — buying, selling, renting, spare parts, inspection, repair, and support — into a single platform built for the Sri Lankan market.

---

## GitHub Repository

**https://github.com/sishanhewa/All-in-One-Vehicle-Solutions-Platform**

---

## Team Details

| | | |
|---|---|---|
| **Group Number** | ITP-SE-03 | |
| **Member 1** | IT24100097 – Sishan Hewapathirana | Vehicle Inspection & Verification, User Authentication, Admin Dashboard & Deployment |
| **Member 2** | IT24103109 – Rashmi | Vehicle Marketplace |
| **Member 3** | IT24102298 – Sadila | Vehicle Rental Management |
| **Member 4** | IT24103553 – Shanuka | Spare Parts Management |
| **Member 5** | IT24100743 – Malaka | Service & Repair Management |
| **Member 6** | IT24101984 – Tharusha | Complaint / Support Management |

---

## Deployment Details

| Service | Details |
|---------|---------|
| **Backend API URL** | https://all-in-one-vehicle-solutions-platform.onrender.com |
| **Backend Port** | 5000 |
| **Database** | MongoDB Atlas — Cluster: `ac-yis5rgw.qgipjae.mongodb.net` — DB: `vehicle_marketplace` |
| **File Storage** | Cloudinary — Cloud Name: `ddpplpsy1` |
| **Frontend** | React Native (Expo) — run via Expo Go app or emulator |

---

## Tech Stack

### Frontend
- **React Native** (Expo SDK 54)
- **Expo Router** — file-based navigation
- **React Navigation** — Stack & Tab navigators
- **Expo SecureStore** — encrypted JWT token storage
- **AsyncStorage** — persistent session data

### Backend
- **Node.js** with **Express 5**
- **Mongoose** — MongoDB ODM
- **JSON Web Tokens (JWT)** — authentication
- **bcryptjs** — password hashing
- **Multer + Cloudinary** — file & image upload
- **CORS** — cross-origin request handling

### Database
- **MongoDB Atlas** — 3-node replica set cloud cluster

---

## Features & Modules

### 1. User Authentication & Security
- User registration and login with JWT-based session management
- bcryptjs password hashing
- Role-based access control (RBAC) — User, Admin, InspectionCompany
- Shared auth middleware across all modules

### 2. Vehicle Marketplace
- Browse, search, and filter vehicle listings (make, fuel type, transmission, price range, year, condition)
- Create, edit, and delete own listings with image uploads (up to 5 images)
- Seller dashboard and public seller profiles

### 3. Vehicle Rental Management
- List vehicles for rent with pricing (daily/monthly), mileage limits, and deposit details
- Submit rental booking requests with required document uploads (driving licence, ID proof, billing proof, guarantor details)
- Owner booking management — accept, reject, or complete bookings
- Automatic vehicle availability toggling based on booking status

### 4. Spare Parts Management
- Browse and search spare parts with vehicle compatibility filters (make, model, year range, engine type)
- Create and manage parts listings with category classification and condition grading
- Seller dashboard and public seller profiles specific to spare parts

### 5. Service & Repair Management
- Browse garage and mechanic service listings
- Book repair appointments with service selection and scheduling
- Booking lifecycle management with mechanic assignment
- Customer review and rating system for completed bookings

### 6. Vehicle Inspection & Verification
- Register as an inspection company with a full company profile
- Create and manage inspection packages (checklists, pricing, vehicle type support)
- Book inspections — select company, package, appointment date/time, and vehicle details
- Full booking lifecycle: Pending → Confirmed → In Progress → Completed
- Record inspection results with scored checklists (Excellent/Good/Fair/Poor/N/A per item), overall score (0–100), Pass/Fail/Conditional result, and report image uploads

### 7. Complaint / Support Management
- Submit support tickets with category, priority level, description, and evidence images
- Threaded response system — users and admins can exchange messages within a ticket
- Ticket status workflow: Open → In Progress → Resolved → Closed
- Cross-module issue linking (associate tickets with specific listings, bookings, or parts)

### 8. Admin Dashboard
- Platform-wide oversight for admin users
- Manage all registered users, marketplace listings, inspection companies, and support tickets

---

## Project Structure

```
Vehicle-Management-System/
├── backend/
│   ├── config/           # Database connection (db.js)
│   ├── controllers/      # Business logic for each module
│   ├── middleware/        # JWT auth, RBAC, file upload (Multer/Cloudinary)
│   ├── models/           # Mongoose schemas
│   ├── routes/           # Express route definitions
│   ├── server.js         # Entry point — dynamic route loading
│   └── .env              # Environment variables (not committed)
│
└── frontend/
    ├── app/              # Expo Router file-based navigation layout
    └── src/
        ├── api/          # API service files (one per module)
        ├── context/      # AuthContext — global auth state
        └── screens/      # All UI screens
```

---

## API Overview

| Module | Base Path | Endpoints |
|--------|-----------|-----------|
| Authentication | `/api/auth` | 3 |
| Vehicle Marketplace | `/api/marketplace` | 6 |
| Vehicle Rental | `/api/rentals` | 11 |
| Spare Parts | `/api/spare-parts` | 6 |
| Vehicle Inspection | `/api/inspection` | 18 |
| Complaint / Support | `/api/support` | 8 |
| Service & Repair | `/api/service-repair` | *(in progress)* |

---

## Environment Variables

Create a `.env` file inside `backend/` with the following:

```env
NODE_ENV=development
PORT=5000
MONGO_URI=your_mongodb_atlas_connection_string
JWT_SECRET=your_jwt_secret_key
CLOUDINARY_CLOUD_NAME=your_cloudinary_cloud_name
CLOUDINARY_API_KEY=your_cloudinary_api_key
CLOUDINARY_API_SECRET=your_cloudinary_api_secret
```

---

## Getting Started

### Prerequisites
- Node.js >= 18
- npm >= 9
- Expo CLI: `npm install -g expo-cli`
- MongoDB Atlas account
- Cloudinary account

### Run the Backend

```bash
cd Vehicle-Management-System/backend
npm install
# Add your .env file with the variables above
npm run dev
# Server starts at http://localhost:5000
```

### Run the Frontend

```bash
cd Vehicle-Management-System/frontend
npm install
npx expo start
# Scan the QR code with Expo Go (iOS/Android)
# Or press 'a' for Android emulator / 'i' for iOS simulator
```

> **Note:** If running on a physical device, update the API base URL in `frontend/src/api/` files to point to your machine's local IP address (e.g. `http://192.168.x.x:5000`).

---

## Git Branches

| Branch | Owner | Module |
|--------|-------|--------|
| `master` | All | Production-ready integrated codebase |
| `IT24100097-Sishan` | Sishan | Inspection, Auth, Admin, Deployment |
| `IT24103109-Rashmi` | Rashmi | Vehicle Marketplace |
| `IT24102298-Sadila` | Sadila | Vehicle Rental |
| `IT24103553-Shanuka` | Shanuka | Spare Parts |
| `IT24100743-Malaka` | Malaka | Service & Repair |
| `IT24101984-Tharusha` | Tharusha | Complaint / Support |

---

## License

This project was developed as part of the **SE2020 — Web and Mobile Technologies** module.  
Group: **ITP-SE-03**
