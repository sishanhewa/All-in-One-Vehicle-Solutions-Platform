# Service & Repair Module - Comprehensive Audit Report
**Date:** May 3, 2026  
**Auditor:** Cascade AI  
**Scope:** Backend models, controllers, routes, frontend screens, API layer, wiring

---

## Executive Summary

The Service & Repair Management module is **well-architected** and follows good patterns for a multi-sided marketplace. The core implementation is solid with proper role-based access control, comprehensive booking lifecycle, and good separation of concerns.

**Overall Grade: B+ (Good with minor issues to fix)**

---

## Critical Issues Found

### 1. Backend - Model Consistency Issues

#### Issue 1.1: Vehicle Type Enum Mismatch
**Location:** `models/ServiceOffering.js` vs `models/RepairBooking.js`

**Problem:**
- `ServiceOffering.vehicleTypes` allows: `['Car', 'SUV', 'Van', 'Motorcycle', 'Truck', 'Any']`
- `RepairBooking.vehicleInfo.vehicleType` allows: `['Car', 'SUV', 'Van', 'Motorcycle', 'Truck']`

**Impact:** If a booking is created with service offering that accepts 'Any' vehicle type, the booking model will reject 'Any' as invalid.

**Fix:** Add 'Any' to RepairBooking vehicleType enum or handle mapping in controller.

#### Issue 1.2: Missing Database Indexes
**Location:** `models/ServiceProvider.js`, `models/RepairBooking.js`

**Problem:**
- `ServiceProvider.ownerId` is marked `unique: true` but no index defined
- No compound index on `RepairBooking` for common queries (customerId + status, garageId + status)

**Impact:** Performance degradation with large datasets.

**Fix:** Add proper indexes.

---

### 2. Backend - Controller Logic Issues

#### Issue 2.1: Decline/Cancel Status Conflation
**Location:** `controllers/repairBookingController.js` - `declineBooking()` function

**Problem:**
```javascript
// Line 356-358
booking.cancelReason = req.body.reason || 'Declined by garage';
booking.cancelledBy = req.user._id;
addStatusHistory(booking, 'cancelled', req.user._id, booking.cancelReason);
```

The `declineBooking` function sets status to 'cancelled', same as customer cancellation. This loses semantic meaning - garage decline vs customer cancel should be distinguishable.

**Impact:** Can't differentiate between garage declining (capacity issue) vs customer cancelling (changed mind).

**Fix:** Add 'declined' status to enum OR add `declinedByGarage` boolean flag.

#### Issue 2.2: No Transaction in Reassign
**Location:** `controllers/repairBookingController.js` - `reassignMechanic()`

**Problem:** No transaction wrapper around mechanic reassignment.

**Impact:** If failure occurs mid-reassignment, booking could have invalid mechanic reference.

**Fix:** Wrap in transaction or add validation before save.

#### Issue 2.3: Duplicate Review Check Race Condition
**Location:** `controllers/reviewController.js` - `createReview()`

**Problem:**
```javascript
// Lines 35-39
const existing = await Review.findOne({ bookingId: req.params.id });
if (existing) {
  res.status(400);
  throw new Error('You have already reviewed this booking');
}
```

Two simultaneous requests could both pass this check before either creates the review.

**Impact:** Duplicate reviews possible under race condition.

**Fix:** Use compound unique index on `bookingId + customerId` at database level.

---

### 3. Frontend - Hardcoded Data

#### Issue 3.1: Static City Lists
**Location:** `screens/ServiceHome.js` (line 22), `screens/BookService.js` (not present but implied)

**Problem:**
```javascript
const CITIES = ['All Cities', 'Colombo', 'Kandy', 'Gampaha', ...];
```

Cities are hardcoded. If backend adds new cities from different regions, frontend won't show them.

**Impact:** Inflexible, requires code change to add new cities.

**Fix:** Fetch unique cities from `/api/service/garages` aggregation endpoint.

#### Issue 3.2: Static Category Lists
**Location:** `screens/ServiceHome.js` (line 23)

**Problem:** Categories hardcoded in multiple places.

**Impact:** If backend category enum changes, frontend breaks.

**Fix:** Fetch categories from backend or share constant via shared config.

#### Issue 3.3: Time Slots Mismatch
**Location:** `screens/BookService.js` (lines 23-26)

**Problem:**
```javascript
const TIME_SLOTS = [
  '8:00 AM', '9:00 AM', ... '5:00 PM'
];
```

These time slots are not validated by backend. A user could manually send any time string.

**Impact:** Inconsistent time formats in database.

**Fix:** Backend should validate against allowed time slots or normalize format.

---

### 4. Frontend-Backend Wiring Issues

#### Issue 4.1: Mechanic Dashboard Missing Tab Route
**Location:** `frontend/app/(tabs)/_layout.tsx`

**Problem:** No tab route for `MechanicDashboard`. Mechanics must navigate through other screens.

**Current Tabs:**
- index, marketplace, inspections, services, ownerDashboard, bookingQueue, manage, myJobs, adminDashboard, explore

**Impact:** Mechanics have no dedicated tab - they use "myJobs" but dashboard is inaccessible from tabs.

**Fix:** Add mechanicDashboard tab OR redirect myJobs to MechanicDashboard component.

#### Issue 4.2: MyRepairs Navigation Missing
**Location:** `BookService.js` line 184

**Problem:** After booking, redirects to `/MyRepairs` but no tab navigation leads there.

**Impact:** Users can't easily find their bookings without going through Services tab.

**Fix:** Add MyRepairs to tabs or make it accessible from Services screen.

#### Issue 4.3: Admin Screens Not Connected
**Location:** `screens/AdminDashboard.js` exists but...

**Problem:** Admin screens exist but only `adminDashboard` is in tabs. Admin can't access garage verification, user management from mobile UI easily.

**Impact:** Admin must use API or web interface for full management.

**Fix:** Add admin management screens to layout or document admin web interface.

---

### 5. API Layer Issues

#### Issue 5.1: Missing Error Recovery
**Location:** `api/serviceApi.js` - multiple functions

**Problem:** Most API functions just throw errors without retry logic or error categorization.

**Impact:** Network blips cause permanent failures.

**Fix:** Add retry logic for idempotent operations, better error categorization.

#### Issue 5.2: No Request Cancellation
**Location:** `api/serviceApi.js`

**Problem:** No AbortController usage for in-flight requests.

**Impact:** Component unmounting while request pending causes memory leaks and state updates on unmounted components.

**Fix:** Add AbortController support.

---

### 6. Security Issues

#### Issue 6.1: No Rate Limiting
**Location:** `routes/serviceRoutes.js`

**Problem:** Critical endpoints lack rate limiting:
- POST /garages/register
- POST /bookings
- POST /offerings

**Impact:** Could be spammed, causing resource exhaustion.

**Fix:** Add express-rate-limit middleware.

#### Issue 6.2: Image Upload Validation Missing
**Location:** `routes/serviceRoutes.js` - upload middleware

**Problem:** No file type validation, size limits may not be enforced.

**Impact:** Could upload malicious files or extremely large files.

**Fix:** Add file type whitelist, stricter size limits.

---

### 7. Data Integrity Issues

#### Issue 7.1: Parts Used Not Validated
**Location:** `controllers/repairBookingController.js` - `updateJobNotes()`

**Problem:** Parts used array accepts any structure:
```javascript
if (req.body.partsUsed !== undefined) {
  booking.partsUsed = req.body.partsUsed; // No validation!
}
```

**Impact:** Could save invalid data structure.

**Fix:** Add validation for partsUsed schema (name, quantity, price required).

#### Issue 7.2: Invoice Amount Can Be Negative
**Location:** `controllers/repairBookingController.js` - `completeBooking()`

**Problem:** Uses `toNonNegativeNumber` which allows 0 but doesn't strictly validate positive for invoice.

**Impact:** Could complete job with 0 invoice (maybe valid?) but should be explicit.

**Fix:** Add explicit validation for finalInvoiceAmount.

---

## Recommendations by Priority

### HIGH PRIORITY (Fix Immediately)
1. Fix vehicle type enum mismatch (Issue 1.1)
2. Add rate limiting (Issue 6.1)
3. Add unique index on reviews (Issue 2.3)
4. Validate partsUsed structure (Issue 7.1)
5. Add MechanicDashboard tab route (Issue 4.1)

### MEDIUM PRIORITY (Fix This Week)
6. Add database indexes (Issue 1.2)
7. Add transaction to reassign (Issue 2.2)
8. Add file upload validation (Issue 6.2)
9. Fetch dynamic cities/categories (Issue 3.1, 3.2)

### LOW PRIORITY (Nice to Have)
10. Add request cancellation (Issue 5.2)
11. Add retry logic (Issue 5.1)
12. Distinguish decline vs cancel (Issue 2.1)
13. Add Admin screens navigation (Issue 4.3)

---

## Positive Findings

### What Works Well:

1. **Role-based access control** - Properly implemented across all controllers
2. **Status history tracking** - Complete audit trail for bookings
3. **API consistency** - Good error messages, consistent response formats
4. **Frontend state management** - Proper use of useCallback, useFocusEffect
5. **Database relationships** - Proper refs and population
6. **Seed script** - Comprehensive test data
7. **Bruno collection** - Good E2E test coverage
8. **Multi-tenant isolation** - Garages properly scoped to owners
9. **Mechanic assignment flow** - Clean reassignment logic
10. **Review system** - Dual rating with garage rating recalculation

---

## Estimated Fix Time

- High Priority Issues: ~4 hours
- Medium Priority Issues: ~6 hours
- Low Priority Issues: ~4 hours
- **Total: ~14 hours of development work**

---

## Testing Checklist After Fixes

- [ ] Create booking with 'Any' vehicle type service
- [ ] Submit duplicate review (should be blocked)
- [ ] Reassign mechanic mid-booking
- [ ] Add parts with invalid data (should be rejected)
- [ ] Upload non-image file (should be rejected)
- [ ] Navigate as mechanic through all tabs
- [ ] Check MyRepairs from Services tab
- [ ] Verify database indexes are used (explain queries)

