# Service & Repair Management API Endpoint Table

**Base URL:** `/api/service`  
**Module:** Service & Repair Management  
**Version:** 2.0

---

## Table of Contents
1. [Public Routes (Garage Browsing)](#public-routes)
2. [Garage Owner Routes](#garage-owner-routes)
3. [Mechanic Routes](#mechanic-routes)
4. [Customer Routes (Bookings)](#customer-routes)
5. [Admin Routes](#admin-routes)
6. [Health Check](#health-check)

---

## Public Routes

| Method | Endpoint | Description | Auth | Request Body / Params |
|--------|----------|-------------|------|----------------------|
| GET | `/api/service/` | Health check - API status | Public | None |
| GET | `/api/service/garages` | Browse all verified, active garages | Public | Query params: `city`, `search`, `category`, `page`, `limit` |
| GET | `/api/service/garages/:id` | Get single garage details with offerings and reviews | Public | URL param: `id` (garage ID) |
| GET | `/api/service/garages/:garageId/offerings` | Get all active service offerings for a garage | Public | URL param: `garageId` |
| GET | `/api/service/offerings/:id` | Get single service offering by ID | Public | URL param: `id` (offering ID) |
| POST | `/api/service/garages/register` | Register a new garage owner and garage | Public | multipart/form-data: `name`, `email`, `password`, `phone`, `garageName`, `city`, `description`, `address`, `operatingHours`, `website`, `logo` (file) |

---

## Garage Owner Routes

**Authentication:** Private (JWT) + Role: `GarageOwner`

| Method | Endpoint | Description | Auth | Request Body / Params |
|--------|----------|-------------|------|----------------------|
| GET | `/api/service/garages/me` | Get own garage details | Private (JWT) | None - uses token |
| PUT | `/api/service/garages/me` | Update own garage profile | Private (JWT) | multipart/form-data: `garageName`, `description`, `address`, `city`, `operatingHours`, `website`, `phone`, `logo` (file, optional) |
| GET | `/api/service/offerings/my-offerings` | Get all service offerings for own garage | Private (JWT) | None - uses token |
| POST | `/api/service/offerings` | Create a new service offering | Private (JWT) | JSON: `name`, `description`, `category`, `estimatedPrice`, `estimatedDuration` (minutes), `vehicleTypes` (array), `images` (optional array) |
| PUT | `/api/service/offerings/:id` | Update own service offering | Private (JWT) | URL param: `id` + body: fields to update (same as create) |
| DELETE | `/api/service/offerings/:id` | Delete own service offering | Private (JWT) | URL param: `id` |
| GET | `/api/service/mechanics` | List all mechanics in own garage | Private (JWT) | None - uses token |
| POST | `/api/service/mechanics` | Add a new mechanic to garage | Private (JWT) | JSON: `name`, `email`, `phone`, `password` |
| GET | `/api/service/mechanics/:id` | Get single mechanic details | Private (JWT) | URL param: `id` (mechanic ID) |
| PUT | `/api/service/mechanics/:id` | Update mechanic (name, phone, password reset) | Private (JWT) | URL param: `id` + body: `name`, `phone`, `newPassword` (optional) |
| PUT | `/api/service/mechanics/:id/deactivate` | Deactivate/reactivate a mechanic | Private (JWT) | URL param: `id` + body: `isActive` (boolean) |
| DELETE | `/api/service/mechanics/:id` | Hard-delete a mechanic | Private (JWT) | URL param: `id` |
| GET | `/api/service/bookings/queue` | Get booking queue for own garage | Private (JWT) | Query params: `status`, `mechanicId`, `dateFrom`, `dateTo` |
| PUT | `/api/service/bookings/:id/confirm` | Confirm a booking and assign mechanic | Private (JWT) | URL param: `id` + body: `assignedMechanicId`, `ownerNotes` (optional) |
| PUT | `/api/service/bookings/:id/decline` | Decline a pending booking | Private (JWT) | URL param: `id` + body: `reason` (optional) |
| PUT | `/api/service/bookings/:id/reassign` | Reassign mechanic on confirmed/in-progress booking | Private (JWT) | URL param: `id` + body: `assignedMechanicId`, `note` (optional) |
| PUT | `/api/service/bookings/:id/complete` | Mark booking as completed | Private (JWT) | URL param: `id` + body: `finalInvoiceAmount` (number) |

---

## Mechanic Routes

**Authentication:** Private (JWT) + Role: `Mechanic`

| Method | Endpoint | Description | Auth | Request Body / Params |
|--------|----------|-------------|------|----------------------|
| GET | `/api/service/mechanics/me` | Get own mechanic profile (with populated garage info) | Private (JWT) | None - uses token |
| PUT | `/api/service/mechanics/me` | Update own profile (name, phone, password) | Private (JWT) | JSON: `name`, `phone`, `password` OR `currentPassword` + `newPassword` |
| GET | `/api/service/bookings/my-jobs` | Get all jobs assigned to mechanic | Private (JWT) | Query param: `status` (All, confirmed, in_progress, ready_for_pickup) |
| PUT | `/api/service/bookings/:id/start` | Start work on a confirmed booking | Private (JWT) | URL param: `id` |
| PUT | `/api/service/bookings/:id/ready` | Mark booking as ready for pickup | Private (JWT) | URL param: `id` |
| PUT | `/api/service/bookings/:id/notes` | Update job notes and parts used | Private (JWT) | URL param: `id` + body: `mechanicNotes`, `partsUsed` (array: `{name, quantity, price}`) |

---

## Customer Routes (Bookings)

**Authentication:** Private (JWT) + Role: `User` (Customer)

| Method | Endpoint | Description | Auth | Request Body / Params |
|--------|----------|-------------|------|----------------------|
| POST | `/api/service/bookings` | Create a new repair booking | Private (JWT) | JSON: `garageId`, `serviceOfferingIds` (array), `preferredDate`, `preferredTime`, `vehicleInfo` (`{make, model, year, plateNumber, vehicleType}`), `customerNotes` (optional) |
| GET | `/api/service/bookings/my-bookings` | Get all bookings made by logged-in customer | Private (JWT) | Query param: `status` (optional filter) |
| GET | `/api/service/bookings/:id` | Get single booking details (scoped by role) | Private (JWT) | URL param: `id` |
| PUT | `/api/service/bookings/:id` | Update pending booking (date/time/vehicle/notes) | Private (JWT) | URL param: `id` + body: `preferredDate`, `preferredTime`, `vehicleInfo`, `customerNotes` |
| PUT | `/api/service/bookings/:id/cancel` | Cancel own booking | Private (JWT) | URL param: `id` + body: `reason` (optional) |
| POST | `/api/service/bookings/:id/review` | Leave a review for completed booking | Private (JWT) | URL param: `id` + body: `garageRating` (1-5), `mechanicRating` (1-5, optional), `comment` (optional) |

---

## Admin Routes

**Authentication:** Private (JWT) + Role: `Admin`

| Method | Endpoint | Description | Auth | Request Body / Params |
|--------|----------|-------------|------|----------------------|
| GET | `/api/service/admin/garages` | Get all garages (including unverified) | Private (JWT) | None |
| PUT | `/api/service/admin/garages/:id/verify` | Verify or unverify a garage | Private (JWT) | URL param: `id` + body: `isVerified` (boolean) |
| PUT | `/api/service/admin/garages/:id/suspend` | Suspend or activate a garage | Private (JWT) | URL param: `id` (toggles `isActive`) |
| DELETE | `/api/service/admin/garages/:id` | Hard-delete a garage and cascade data | Private (JWT) | URL param: `id` |
| GET | `/api/service/admin/bookings` | Get all bookings (platform-wide) | Private (JWT) | Query params: `status`, `garageId`, `customerId`, `page`, `limit` |
| DELETE | `/api/service/admin/bookings/:id` | Hard-delete a booking | Private (JWT) | URL param: `id` |
| GET | `/api/service/admin/stats` | Get platform statistics | Private (JWT) | None |
| GET | `/api/service/admin/users` | Get all users (filterable by role) | Private (JWT) | Query params: `role`, `search`, `page`, `limit` |
| GET | `/api/service/admin/users/:id` | Get single user details | Private (JWT) | URL param: `id` |
| PUT | `/api/service/admin/users/:id/role` | Change user role | Private (JWT) | URL param: `id` + body: `role` (User, Admin, GarageOwner, Mechanic, InspectionCompany) |
| PUT | `/api/service/admin/users/:id/toggle-active` | Activate/deactivate a user | Private (JWT) | URL param: `id` (toggles `isActive`) |

---

## Health Check

| Method | Endpoint | Description | Auth | Response |
|--------|----------|-------------|------|----------|
| GET | `/api/service/` | API health check | Public | `{ message: 'Service & Repair API ready', version: '2.0' }` |

---

## Authentication & Authorization Summary

| Role | Permissions |
|------|-------------|
| **Public** | Browse garages, view garage details, view service offerings, register as garage owner |
| **User (Customer)** | Create/view/cancel bookings, update pending bookings, leave reviews |
| **GarageOwner** | Manage garage profile, manage service offerings, manage mechanics, manage booking queue (confirm/decline/complete/reassign) |
| **Mechanic** | View assigned jobs, start work, mark ready, update job notes |
| **Admin** | Full platform control - manage all garages, bookings, users; view statistics; verify/suspend garages |

---

## Request/Response Examples

### Create Booking (Customer)
```http
POST /api/service/bookings
Authorization: Bearer <JWT_TOKEN>
Content-Type: application/json

{
  "garageId": "60d5eca4...",
  "serviceOfferingIds": ["60d5ecb5...", "60d5ecb6..."],
  "preferredDate": "2025-06-15",
  "preferredTime": "10:00 AM",
  "vehicleInfo": {
    "make": "Toyota",
    "model": "Corolla",
    "year": 2020,
    "plateNumber": "CAB-1234",
    "vehicleType": "Car"
  },
  "customerNotes": "Please check the brakes carefully"
}
```

### Confirm Booking (Garage Owner)
```http
PUT /api/service/bookings/60d5ecc7.../confirm
Authorization: Bearer <JWT_TOKEN>
Content-Type: application/json

{
  "assignedMechanicId": "60d5ecd0...",
  "ownerNotes": "Customer will drop off at 9:30 AM"
}
```

### Update Job Notes (Mechanic)
```http
PUT /api/service/bookings/60d5ecc7.../notes
Authorization: Bearer <JWT_TOKEN>
Content-Type: application/json

{
  "mechanicNotes": "Brake pads replaced, rotors resurfaced",
  "partsUsed": [
    { "name": "Brake Pads (Front)", "quantity": 2, "price": 4500 },
    { "name": "Brake Fluid", "quantity": 1, "price": 1200 }
  ]
}
```

---

## Error Response Format

```json
{
  "message": "Error description",
  "stack": "..." // Only in development mode
}
```

Common HTTP Status Codes:
- `200` - Success
- `201` - Created
- `400` - Bad Request (validation error)
- `401` - Unauthorized (no token)
- `403` - Forbidden (wrong role)
- `404` - Not Found
- `409` - Conflict (duplicate booking)
- `500` - Server Error

---

## Notes

1. **JWT Token:** Must be included in `Authorization: Bearer <token>` header for all private routes
2. **Role Middleware:** Some routes require specific roles (GarageOwner, Mechanic, Admin)
3. **File Uploads:** Garage logo and service offering images use `multipart/form-data`
4. **Category Filter:** When filtering by category, the backend finds garages that have active offerings in that category
5. **Booking Status Flow:** `pending_confirmation` → `confirmed` → `in_progress` → `ready_for_pickup` → `completed`
6. **Cancellation:** Can occur at `pending_confirmation` or `confirmed` stages by either customer or garage owner

---

*Document generated from backend route analysis - All endpoints verified against `serviceRoutes.js`*
