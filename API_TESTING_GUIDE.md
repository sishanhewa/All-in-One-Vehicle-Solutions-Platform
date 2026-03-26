# Vehicle Marketplace — Postman API Testing Guide

> **Base URL:** `http://localhost:5000`
>
> Make sure the backend server is running before testing: `cd backend && npm run dev`

---

## Table of Contents

1. [Setup Postman](#1-setup-postman)
2. [Authentication APIs](#2-authentication-apis)
3. [Marketplace APIs (Public)](#3-marketplace-apis-public)
4. [Marketplace APIs (Protected)](#4-marketplace-apis-protected)
5. [Testing Workflow](#5-complete-testing-workflow)

---

## 1. Setup Postman

### Step 1: Create Environment Variables

In Postman, go to **Environments** → **Create New** and add these variables:

| Variable     | Initial Value                  |
|-------------|-------------------------------|
| `base_url`  | `http://localhost:5000`       |
| `token`     | *(leave empty — auto-filled)* |

### Step 2: Set Headers for Protected Routes

For any route marked **🔒 Protected**, you must add this header:

| Key             | Value              |
|-----------------|-------------------|
| `Authorization` | `Bearer {{token}}` |

### Step 3: Content-Type

- For **JSON** requests: Set `Content-Type` to `application/json`
- For **FormData** requests (image upload): Do **NOT** set Content-Type — Postman will auto-set it with the boundary

---

## 2. Authentication APIs

### 2.1 Register a New Seller Account

| Setting     | Value                                 |
|------------|---------------------------------------|
| **Method** | `POST`                                |
| **URL**    | `{{base_url}}/api/auth/register`      |
| **Body**   | `raw` → `JSON`                        |

**Request Body:**
```json
{
  "name": "Sishan Hewapathirana",
  "email": "sishanhewa4@gmail.com",
  "password": "password123",
  "phone": "+94771234567"
}
```

**Expected Response (201 Created):**
```json
{
  "_id": "69c913048eac2f3093fe3b5f",
  "name": "Sishan Hewapathirana",
  "email": "sishanhewa4@gmail.com",
  "phone": "+94771234567",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6..."
}
```

> **⚡ Important:** Copy the `token` value from the response and paste it into your Postman environment variable `token`. All protected routes need this.

**Possible Errors:**

| Status | Message                                              |
|--------|------------------------------------------------------|
| 400    | `Please append all required fields to create a Seller Account` |
| 400    | `Seller Account already exists with this email`      |

---

### 2.2 Login to Existing Account

| Setting     | Value                            |
|------------|----------------------------------|
| **Method** | `POST`                           |
| **URL**    | `{{base_url}}/api/auth/login`    |
| **Body**   | `raw` → `JSON`                   |

**Request Body:**
```json
{
  "email": "sishanhewa4@gmail.com",
  "password": "password123"
}
```

**Expected Response (200 OK):**
```json
{
  "_id": "69c913048eac2f3093fe3b5f",
  "name": "Sishan Hewapathirana",
  "email": "sishanhewa4@gmail.com",
  "phone": "+94771234567",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6..."
}
```

> **⚡ Copy the `token` into your environment variable again** (tokens might differ between sessions).

**Possible Errors:**

| Status | Message                        |
|--------|--------------------------------|
| 401    | `Invalid email or password`    |

---

### 2.3 Get Current User Profile 🔒

| Setting     | Value                             |
|------------|-----------------------------------|
| **Method** | `GET`                             |
| **URL**    | `{{base_url}}/api/auth/profile`   |
| **Headers**| `Authorization: Bearer {{token}}` |

**Expected Response (200 OK):**
```json
{
  "_id": "69c913048eac2f3093fe3b5f",
  "name": "Sishan Hewapathirana",
  "email": "sishanhewa4@gmail.com",
  "phone": "+94771234567",
  "role": "User",
  "createdAt": "2026-03-29T..."
}
```

---

## 3. Marketplace APIs (Public)

These endpoints do **NOT** require authentication.

### 3.1 Get All Listings (No Filters)

| Setting     | Value                              |
|------------|-------------------------------------|
| **Method** | `GET`                               |
| **URL**    | `{{base_url}}/api/marketplace`      |

**Expected Response (200 OK):** Array of vehicle listing objects.

---

### 3.2 Get All Listings (With Filters)

| Setting     | Value                              |
|------------|-------------------------------------|
| **Method** | `GET`                               |
| **URL**    | `{{base_url}}/api/marketplace`      |
| **Params** | See query parameters below          |

Add any combination of these as **Query Params** in Postman (Params tab):

| Key            | Example Value | Description                      |
|----------------|--------------|----------------------------------|
| `make`         | `Toyota`     | Case-insensitive make search     |
| `model`        | `Prius`      | Case-insensitive model search    |
| `location`     | `Colombo`    | Exact district match             |
| `condition`    | `Used`       | `New`, `Used`, or `Reconditioned`|
| `fuelType`     | `Hybrid`     | `Petrol`, `Diesel`, `Hybrid`, `Electric` |
| `transmission` | `Automatic`  | `Automatic`, `Manual`, `Tiptronic` |
| `bodyType`     | `SUV`        | `Sedan`, `Hatchback`, `SUV`, etc. |
| `minPrice`     | `5000000`    | Minimum price (Rs.)              |
| `maxPrice`     | `15000000`   | Maximum price (Rs.)              |
| `yearMin`      | `2018`       | Minimum year of manufacture      |
| `yearMax`      | `2023`       | Maximum year of manufacture      |
| `sellerId`     | `69c91304...`| Filter by specific seller        |

**Example URL with filters:**
```
{{base_url}}/api/marketplace?make=Toyota&location=Colombo&minPrice=5000000&maxPrice=15000000
```

---

### 3.3 Get Single Listing by ID

| Setting     | Value                                       |
|------------|----------------------------------------------|
| **Method** | `GET`                                        |
| **URL**    | `{{base_url}}/api/marketplace/:id`           |

Replace `:id` with an actual listing ID, e.g.:
```
{{base_url}}/api/marketplace/67e813a8b1c2d3e4f5a6b7c8
```

**Expected Response (200 OK):** Single listing object with seller details populated:
```json
{
  "_id": "67e813a8b1c2d3e4f5a6b7c8",
  "title": "2021 Toyota Prius for Sale in Colombo",
  "make": "Toyota",
  "model": "Prius",
  "sellerId": {
    "_id": "69c913048eac2f3093fe3b5f",
    "name": "Sishan Hewapathirana",
    "phone": "+94771234567",
    "email": "sishanhewa4@gmail.com"
  },
  ...
}
```

---

## 4. Marketplace APIs (Protected)

> **🔒 All these routes require the `Authorization: Bearer {{token}}` header.**

### 4.1 Create New Listing 🔒

| Setting     | Value                              |
|------------|-------------------------------------|
| **Method** | `POST`                              |
| **URL**    | `{{base_url}}/api/marketplace`      |
| **Headers**| `Authorization: Bearer {{token}}`   |
| **Body**   | `form-data`                         |

**Form-Data Fields:**

| Key              | Type   | Value                                      | Required |
|-----------------|--------|---------------------------------------------|----------|
| `title`         | Text   | `2023 Toyota Aqua for Sale in Colombo`     | ✅       |
| `make`          | Text   | `Toyota`                                    | ✅       |
| `model`         | Text   | `Aqua`                                      | ✅       |
| `year`          | Text   | `2023`                                      | ✅       |
| `price`         | Text   | `8500000`                                   | ✅       |
| `mileage`       | Text   | `25000`                                     | ✅       |
| `transmission`  | Text   | `Automatic`                                 | ✅       |
| `fuelType`      | Text   | `Hybrid`                                    | ✅       |
| `engineCapacity`| Text   | `1500`                                      | ✅       |
| `bodyType`      | Text   | `Hatchback`                                 | ✅       |
| `location`      | Text   | `Colombo`                                   | ✅       |
| `condition`     | Text   | `Reconditioned`                             | ❌       |
| `isNegotiable`  | Text   | `true`                                      | ❌       |
| `description`   | Text   | `Single owner, mint condition...`           | ❌       |
| `images`        | File   | *(Select image file from your computer)*    | ❌       |

> **How to add images in Postman:**
> 1. Set the key name to `images`
> 2. Change the type dropdown from "Text" to **"File"**
> 3. Click "Select Files" and choose up to 5 images
> 4. You can add multiple `images` keys for multiple files

**Expected Response (201 Created):**
```json
{
  "_id": "newly-generated-id",
  "title": "2023 Toyota Aqua for Sale in Colombo",
  "make": "Toyota",
  "sellerId": "69c913048eac2f3093fe3b5f",
  "images": ["/uploads/1711789200000-image.jpg"],
  ...
}
```

---

### 4.2 Update Existing Listing 🔒

| Setting     | Value                                       |
|------------|----------------------------------------------|
| **Method** | `PUT`                                        |
| **URL**    | `{{base_url}}/api/marketplace/:id`           |
| **Headers**| `Authorization: Bearer {{token}}`            |
| **Body**   | `raw` → `JSON`                               |

Replace `:id` with the listing ID you want to update.

**Request Body (include only fields to update):**
```json
{
  "price": 7900000,
  "mileage": 30000,
  "description": "Updated description - price slightly reduced",
  "status": "Sold",
  "isNegotiable": false
}
```

**Expected Response (200 OK):** The updated listing object.

**Possible Errors:**

| Status | Message                           |
|--------|-----------------------------------|
| 404    | `Listing not found`               |
| 401    | `Not authorized to edit this ad`  |

> **Note:** You can only update listings that belong to your account. Attempting to update another seller's listing will return a 401 error.

---

### 4.3 Delete a Listing 🔒

| Setting     | Value                                       |
|------------|----------------------------------------------|
| **Method** | `DELETE`                                     |
| **URL**    | `{{base_url}}/api/marketplace/:id`           |
| **Headers**| `Authorization: Bearer {{token}}`            |

Replace `:id` with the listing ID you want to delete.

**Expected Response (200 OK):**
```json
{
  "message": "Listing removed successfully"
}
```

**Possible Errors:**

| Status | Message                              |
|--------|--------------------------------------|
| 404    | `Listing not found`                  |
| 401    | `Not authorized to delete this Ad`   |

---

### 4.4 Get My Listings (Seller Dashboard) 🔒

| Setting     | Value                                          |
|------------|------------------------------------------------|
| **Method** | `GET`                                          |
| **URL**    | `{{base_url}}/api/marketplace/my-listings`     |
| **Headers**| `Authorization: Bearer {{token}}`              |

**Expected Response (200 OK):** Array of listings where `sellerId` matches the authenticated user.

---

## 5. Complete Testing Workflow

Follow this exact order to test the full system end-to-end:

### Step 1: Register
```
POST {{base_url}}/api/auth/register
```
Copy the `token` from the response → Set it in your environment variables.

### Step 2: Login (Alternative to Step 1)
```
POST {{base_url}}/api/auth/login
```
Copy the `token` from the response.

### Step 3: View Profile
```
GET {{base_url}}/api/auth/profile
Headers: Authorization: Bearer {{token}}
```
Verify your user details are returned.

### Step 4: Create a Listing
```
POST {{base_url}}/api/marketplace
Headers: Authorization: Bearer {{token}}
Body: form-data with vehicle details + image
```
Copy the `_id` from the response for the next steps.

### Step 5: View All Listings
```
GET {{base_url}}/api/marketplace
```
Verify your new listing appears in the results.

### Step 6: View Single Listing
```
GET {{base_url}}/api/marketplace/{id}
```
Verify all details including populated seller information.

### Step 7: Search with Filters
```
GET {{base_url}}/api/marketplace?make=Toyota&location=Colombo&fuelType=Hybrid
```
Verify only matching listings are returned.

### Step 8: View My Listings
```
GET {{base_url}}/api/marketplace/my-listings
Headers: Authorization: Bearer {{token}}
```
Verify only your own listings appear.

### Step 9: Update a Listing
```
PUT {{base_url}}/api/marketplace/{id}
Headers: Authorization: Bearer {{token}}
Body: {"price": 7500000, "status": "Sold"}
```
Verify the listing is updated.

### Step 10: Delete a Listing
```
DELETE {{base_url}}/api/marketplace/{id}
Headers: Authorization: Bearer {{token}}
```
Verify the listing is removed.

---

## API Summary Table

| # | Method   | Endpoint                              | Auth   | Description                    |
|---|----------|---------------------------------------|--------|--------------------------------|
| 1 | `POST`   | `/api/auth/register`                  | ❌     | Register new seller account    |
| 2 | `POST`   | `/api/auth/login`                     | ❌     | Login to existing account      |
| 3 | `GET`    | `/api/auth/profile`                   | 🔒     | Get current user profile       |
| 4 | `GET`    | `/api/marketplace`                    | ❌     | Get all listings (with filters)|
| 5 | `GET`    | `/api/marketplace/:id`               | ❌     | Get single listing details     |
| 6 | `POST`   | `/api/marketplace`                    | 🔒     | Create new listing             |
| 7 | `PUT`    | `/api/marketplace/:id`               | 🔒     | Update existing listing        |
| 8 | `DELETE` | `/api/marketplace/:id`               | 🔒     | Delete a listing               |
| 9 | `GET`    | `/api/marketplace/my-listings`       | 🔒     | Get logged-in user's listings  |

---

## Valid Enum Values Reference

Use these exact values in your requests:

| Field          | Accepted Values                                    |
|----------------|---------------------------------------------------|
| `transmission` | `Manual`, `Automatic`, `Tiptronic`                |
| `fuelType`     | `Petrol`, `Diesel`, `Hybrid`, `Electric`          |
| `condition`    | `New`, `Used`, `Reconditioned`                    |
| `status`       | `Available`, `Sold`                               |
| `bodyType`     | `Sedan`, `Hatchback`, `SUV`, `Coupé`, `Van`, `Pickup`, `Jeep` |
| `location`     | `Colombo`, `Kandy`, `Gampaha`, `Kurunegala`, `Kalutara`, `Galle`, `Matara`, `Ratnapura`, `Anuradhapura`, `Jaffna`, `Batticaloa`, `Badulla` |

---

## 6. Vehicle Inspection APIs

> **Base Path:** `{{base_url}}/api/inspection`
>
> This is a **standalone module** — completely independent from the Marketplace. Inspection companies register, create packages, and manage booking queues. Users browse companies, book inspections, and track status.

### 6.1 Register an Inspection Company

| Setting     | Value                                              |
|------------|-----------------------------------------------------|
| **Method** | `POST`                                              |
| **URL**    | `{{base_url}}/api/inspection/companies/register`    |
| **Body**   | `raw` → `JSON`                                      |

**Request Body:**
```json
{
  "name": "John Inspector",
  "email": "john@autoinspect.lk",
  "password": "password123",
  "phone": "+94771234567",
  "companyName": "AutoInspect Lanka",
  "description": "Professional vehicle inspection services since 2010",
  "address": "No. 45, Galle Road, Colombo 03",
  "city": "Colombo",
  "operatingHours": "Mon-Sat 8:00 AM - 6:00 PM",
  "website": "https://autoinspect.lk"
}
```

**Expected Response (201 Created):**
```json
{
  "_id": "...",
  "name": "John Inspector",
  "email": "john@autoinspect.lk",
  "role": "InspectionCompany",
  "companyProfile": {
    "companyName": "AutoInspect Lanka",
    "city": "Colombo",
    "isVerified": false,
    ...
  },
  "token": "eyJhbGciOi..."
}
```

> **⚡ Copy the `token`** — this is the company token needed for all company-protected routes.

---

### 6.2 Browse All Companies

| Setting     | Value                                         |
|------------|------------------------------------------------|
| **Method** | `GET`                                          |
| **URL**    | `{{base_url}}/api/inspection/companies`        |

**Optional Query Params:**

| Key      | Example   | Description             |
|----------|-----------|-------------------------|
| `city`   | `Colombo` | Filter by city          |
| `search` | `Auto`    | Search by company name  |

---

### 6.3 Get Company Details + Packages

| Setting     | Value                                              |
|------------|-----------------------------------------------------|
| **Method** | `GET`                                               |
| **URL**    | `{{base_url}}/api/inspection/companies/:id`         |

Returns company profile AND all their active packages.

---

### 6.4 Create Inspection Package 🔒 Company

| Setting     | Value                                          |
|------------|--------------------------------------------------|
| **Method** | `POST`                                           |
| **URL**    | `{{base_url}}/api/inspection/packages`           |
| **Headers**| `Authorization: Bearer {{company_token}}`        |
| **Body**   | `form-data`                                      |

**Form-Data Fields:**

| Key              | Type | Value                                                     |
|-----------------|------|------------------------------------------------------------|
| `name`          | Text | `Full Vehicle Inspection`                                  |
| `description`   | Text | `Comprehensive 50-point vehicle inspection...`             |
| `price`         | Text | `15000`                                                    |
| `duration`      | Text | `60`                                                       |
| `vehicleTypes`  | Text | `["Car","SUV","Van"]`                                      |
| `checklistItems`| Text | `["Engine","Transmission","Brakes","Suspension","Electrical","Exterior Body","Interior","Tires"]` |
| `images`        | File | *(optional — select package image)*                        |

---

### 6.5 Get My Packages 🔒 Company

| Setting     | Value                                                   |
|------------|----------------------------------------------------------|
| **Method** | `GET`                                                    |
| **URL**    | `{{base_url}}/api/inspection/packages/my-packages`       |
| **Headers**| `Authorization: Bearer {{company_token}}`                |

---

### 6.6 Update Package 🔒 Company

| Setting     | Value                                          |
|------------|--------------------------------------------------|
| **Method** | `PUT`                                            |
| **URL**    | `{{base_url}}/api/inspection/packages/:id`       |
| **Headers**| `Authorization: Bearer {{company_token}}`        |
| **Body**   | `form-data` (include only fields to update)      |

---

### 6.7 Delete Package 🔒 Company

| Setting     | Value                                          |
|------------|--------------------------------------------------|
| **Method** | `DELETE`                                         |
| **URL**    | `{{base_url}}/api/inspection/packages/:id`       |
| **Headers**| `Authorization: Bearer {{company_token}}`        |

---

### 6.8 Create Inspection Booking 🔒 User

| Setting     | Value                                          |
|------------|--------------------------------------------------|
| **Method** | `POST`                                           |
| **URL**    | `{{base_url}}/api/inspection/bookings`           |
| **Headers**| `Authorization: Bearer {{user_token}}`           |
| **Body**   | `raw` → `JSON`                                   |

**Request Body:**
```json
{
  "companyId": "COMPANY_USER_ID",
  "packageId": "PACKAGE_ID",
  "make": "Toyota",
  "model": "Corolla",
  "year": 2021,
  "plateNumber": "CAB-1234",
  "vehicleType": "Car",
  "appointmentDate": "2026-04-15",
  "appointmentTime": "10:00 AM",
  "notes": "Please check the AC as well"
}
```

---

### 6.9 Get My Bookings 🔒 User

| Setting     | Value                                                    |
|------------|-----------------------------------------------------------|
| **Method** | `GET`                                                     |
| **URL**    | `{{base_url}}/api/inspection/bookings/my-bookings`        |
| **Headers**| `Authorization: Bearer {{user_token}}`                    |

**Optional Query Params:** `?status=Pending` (or Confirmed, In Progress, Completed, Cancelled)

---

### 6.10 Get Company Queue 🔒 Company

| Setting     | Value                                                |
|------------|-------------------------------------------------------|
| **Method** | `GET`                                                 |
| **URL**    | `{{base_url}}/api/inspection/bookings/queue`           |
| **Headers**| `Authorization: Bearer {{company_token}}`              |

**Optional Query Params:** `?status=Pending&date=today` (date: `today`, `week`, or omit for all)

---

### 6.11 Confirm Booking 🔒 Company

| Setting     | Value                                                    |
|------------|-----------------------------------------------------------|
| **Method** | `PUT`                                                     |
| **URL**    | `{{base_url}}/api/inspection/bookings/:id/confirm`        |
| **Headers**| `Authorization: Bearer {{company_token}}`                 |

Changes status: `Pending` → `Confirmed`

---

### 6.12 Start Inspection 🔒 Company

| Setting     | Value                                                  |
|------------|----------------------------------------------------------|
| **Method** | `PUT`                                                    |
| **URL**    | `{{base_url}}/api/inspection/bookings/:id/start`          |
| **Headers**| `Authorization: Bearer {{company_token}}`                |

Changes status: `Confirmed` → `In Progress`

---

### 6.13 Complete Inspection 🔒 Company

| Setting     | Value                                                    |
|------------|-----------------------------------------------------------|
| **Method** | `PUT`                                                     |
| **URL**    | `{{base_url}}/api/inspection/bookings/:id/complete`       |
| **Headers**| `Authorization: Bearer {{company_token}}`                 |
| **Body**   | `raw` → `JSON`                                            |

**Request Body:**
```json
{
  "inspectionResult": "Pass",
  "overallScore": 87,
  "checklist": [
    { "item": "Engine", "condition": "Good", "notes": "Running smoothly" },
    { "item": "Brakes", "condition": "Fair", "notes": "Pads worn 60%" },
    { "item": "Tires", "condition": "Excellent", "notes": "New tires" }
  ],
  "resultRemarks": "Vehicle is in good overall condition. Recommend brake pad replacement within 10,000 km."
}
```

Changes status: `In Progress` → `Completed`

---

### 6.14 Upload Report Images 🔒 Company

| Setting     | Value                                                    |
|------------|-----------------------------------------------------------|
| **Method** | `POST`                                                    |
| **URL**    | `{{base_url}}/api/inspection/bookings/:id/images`         |
| **Headers**| `Authorization: Bearer {{company_token}}`                 |
| **Body**   | `form-data`                                               |

Add keys named `reportImages` of type **File** (up to 10 images).

---

### 6.15 Cancel Booking 🔒 User/Company

| Setting     | Value                                                    |
|------------|-----------------------------------------------------------|
| **Method** | `PUT`                                                     |
| **URL**    | `{{base_url}}/api/inspection/bookings/:id/cancel`         |
| **Headers**| `Authorization: Bearer {{token}}`                         |
| **Body**   | `raw` → `JSON`                                            |

```json
{ "reason": "Schedule conflict" }
```

---

### 6.16 Complete Inspection Testing Workflow

1. **Register Company** → `POST /api/inspection/companies/register` → Save `company_token`
2. **Create Package** → `POST /api/inspection/packages` (with company_token)
3. **Register User** → `POST /api/auth/register` (regular user) → Save `user_token`
4. **Browse Companies** → `GET /api/inspection/companies`
5. **View Company** → `GET /api/inspection/companies/:companyId`
6. **Book Inspection** → `POST /api/inspection/bookings` (with user_token)
7. **View Queue** → `GET /api/inspection/bookings/queue` (with company_token)
8. **Confirm** → `PUT /api/inspection/bookings/:id/confirm` (with company_token)
9. **Start** → `PUT /api/inspection/bookings/:id/start` (with company_token)
10. **Complete** → `PUT /api/inspection/bookings/:id/complete` (with company_token + results)
11. **Upload Images** → `POST /api/inspection/bookings/:id/images` (with company_token)
12. **View Results** → `GET /api/inspection/bookings/:id` (with user_token)

---

## Updated API Summary Table

| # | Method   | Endpoint                                          | Auth              | Description                      |
|---|----------|---------------------------------------------------|-------------------|----------------------------------|
| 1 | `POST`   | `/api/auth/register`                              | ❌                | Register new seller account      |
| 2 | `POST`   | `/api/auth/login`                                 | ❌                | Login to existing account        |
| 3 | `GET`    | `/api/auth/profile`                               | 🔒                | Get current user profile         |
| 4 | `GET`    | `/api/marketplace`                                | ❌                | Get all listings (with filters)  |
| 5 | `GET`    | `/api/marketplace/:id`                            | ❌                | Get single listing details       |
| 6 | `POST`   | `/api/marketplace`                                | 🔒                | Create new listing               |
| 7 | `PUT`    | `/api/marketplace/:id`                            | 🔒                | Update existing listing          |
| 8 | `DELETE` | `/api/marketplace/:id`                            | 🔒                | Delete a listing                 |
| 9 | `GET`    | `/api/marketplace/my-listings`                    | 🔒                | Get logged-in user's listings    |
| 10| `POST`   | `/api/inspection/companies/register`              | ❌                | Register inspection company      |
| 11| `GET`    | `/api/inspection/companies`                       | ❌                | Browse all companies             |
| 12| `GET`    | `/api/inspection/companies/:id`                   | ❌                | Get company + packages           |
| 13| `GET`    | `/api/inspection/companies/profile`               | 🔒 Company        | Get own company profile          |
| 14| `PUT`    | `/api/inspection/companies/profile`               | 🔒 Company        | Update company profile           |
| 15| `POST`   | `/api/inspection/packages`                        | 🔒 Company        | Create inspection package        |
| 16| `GET`    | `/api/inspection/packages/my-packages`            | 🔒 Company        | Get own packages                 |
| 17| `PUT`    | `/api/inspection/packages/:id`                    | 🔒 Company        | Update package                   |
| 18| `DELETE` | `/api/inspection/packages/:id`                    | 🔒 Company        | Delete package                   |
| 19| `POST`   | `/api/inspection/bookings`                        | 🔒 User           | Book an inspection               |
| 20| `GET`    | `/api/inspection/bookings/my-bookings`            | 🔒 User           | Get user's bookings              |
| 21| `GET`    | `/api/inspection/bookings/queue`                  | 🔒 Company        | Get company's booking queue      |
| 22| `GET`    | `/api/inspection/bookings/:id`                    | 🔒 Auth           | Get booking details              |
| 23| `PUT`    | `/api/inspection/bookings/:id/confirm`            | 🔒 Company        | Confirm booking                  |
| 24| `PUT`    | `/api/inspection/bookings/:id/start`              | 🔒 Company        | Start inspection                 |
| 25| `PUT`    | `/api/inspection/bookings/:id/complete`           | 🔒 Company        | Complete + record results        |
| 26| `POST`   | `/api/inspection/bookings/:id/images`             | 🔒 Company        | Upload report images             |
| 27| `PUT`    | `/api/inspection/bookings/:id/cancel`             | 🔒 User/Company   | Cancel booking                   |

---

## Inspection Enum Values Reference

| Field              | Accepted Values                                        |
|--------------------|-------------------------------------------------------|
| `status` (booking) | `Pending`, `Confirmed`, `In Progress`, `Completed`, `Cancelled` |
| `inspectionResult` | `Pass`, `Fail`, `Conditional`                         |
| `condition` (checklist) | `Excellent`, `Good`, `Fair`, `Poor`, `N/A`        |
| `vehicleType`      | `Car`, `SUV`, `Van`, `Motorcycle`, `Truck`            |
| `role` (user)       | `User`, `Admin`, `InspectionCompany`                  |
