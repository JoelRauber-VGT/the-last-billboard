# Displacement Logic Test Cases

This document outlines test scenarios for the atomic bid processing system implemented in `process_bid` Postgres function.

## Overview

The displacement logic handles two main scenarios:
1. **New Slot Creation**: First bid on the billboard
2. **Outbid/Displacement**: Taking over an existing slot

## Critical Requirements Tested

- **Atomicity**: All operations occur in a single Postgres transaction
- **Race Condition Prevention**: `FOR UPDATE` lock prevents concurrent bids on same slot
- **Refund Processing**: Displaced users receive 90% refund (10% commission)
- **History Tracking**: Complete audit trail of all slot ownership changes
- **Idempotency**: Same webhook event never processed twice

## Test Scenarios

### 1. New Slot Creation

**Scenario**: User A creates the first bid on the billboard

**Setup**:
- Empty billboard (no slots)
- User A has completed payment for €10 bid

**Test Steps**:
1. Stripe webhook receives `checkout.session.completed` event
2. Webhook calls `process_bid` with:
   - `p_mode = 'new'`
   - `p_bid_eur = 10.00`
   - `p_user_id = [User A ID]`
   - Display name, image URL, link URL, brand color

**Expected Results**:
- New slot created in `slots` table
  - `current_owner_id = [User A ID]`
  - `current_bid_eur = 10.00`
  - `status = 'active'`
- New entry in `slot_history` table
  - `owner_id = [User A ID]`
  - `bid_eur = 10.00`
  - `started_at = [current timestamp]`
  - `ended_at = NULL` (still active)
- Transaction marked as `status = 'completed'`
- Function returns: `{ success: true, mode: 'new', slot_id: [UUID] }`

**Verification Query**:
```sql
SELECT
  s.id as slot_id,
  s.current_owner_id,
  s.current_bid_eur,
  sh.started_at,
  sh.ended_at
FROM slots s
JOIN slot_history sh ON sh.slot_id = s.id
WHERE s.current_owner_id = '[User A ID]';
```

---

### 2. Simple Outbid

**Scenario**: User B outbids User A

**Setup**:
- Slot exists with User A as owner (€10 bid)
- User B has completed payment for €20 bid

**Test Steps**:
1. Stripe webhook receives `checkout.session.completed` event
2. Webhook calls `process_bid` with:
   - `p_mode = 'outbid'`
   - `p_slot_id = [Slot ID]`
   - `p_bid_eur = 20.00`
   - `p_user_id = [User B ID]`

**Expected Results**:
- Slot updated:
  - `current_owner_id = [User B ID]`
  - `current_bid_eur = 20.00`
  - `updated_at = [current timestamp]`
- Previous history entry updated:
  - `ended_at = [current timestamp]`
  - `displaced_by_id = [User B ID]`
- New history entry created:
  - `owner_id = [User B ID]`
  - `bid_eur = 20.00`
  - `started_at = [current timestamp]`
  - `ended_at = NULL`
- Refund transaction created for User A:
  - `user_id = [User A ID]`
  - `type = 'refund'`
  - `amount_eur = 9.00` (90% of €10)
  - `commission_eur = 1.00` (10% retained)
  - `status = 'pending'`
- Function returns: `{ success: true, mode: 'outbid', slot_id: [UUID], refund_amount: 9.00, refund_user_id: [User A ID] }`

**Verification Query**:
```sql
-- Check slot ownership
SELECT current_owner_id, current_bid_eur FROM slots WHERE id = '[Slot ID]';

-- Check history (should have 2 entries)
SELECT owner_id, bid_eur, started_at, ended_at, displaced_by_id
FROM slot_history
WHERE slot_id = '[Slot ID]'
ORDER BY started_at;

-- Check refund transaction
SELECT user_id, type, amount_eur, commission_eur, status
FROM transactions
WHERE user_id = '[User A ID]' AND type = 'refund';
```

---

### 3. Race Condition

**Scenario**: Two users (C and D) try to outbid the same slot simultaneously

**Setup**:
- Slot exists with User B as owner (€20 bid)
- User C and User D both initiate checkout for €25 at nearly same time

**Test Steps**:
1. User C's webhook arrives first, calls `process_bid`:
   - Acquires `FOR UPDATE` lock on slot
   - Checks `current_bid_eur = 20.00`
   - €25 > €20, proceeds with displacement
   - Updates slot to User C, creates refund for User B
2. User D's webhook arrives second, calls `process_bid`:
   - Waits for lock (User C's transaction to complete)
   - Acquires lock after User C commits
   - Checks `current_bid_eur = 25.00` (now User C's bid)
   - €25 <= €25, race condition detected
   - Creates **full refund** transaction for User D (platform error)

**Expected Results for User C**:
- Slot updated to User C (€25 bid)
- Refund created for User B (€18 = 90% of €20)
- Returns: `{ success: true, mode: 'outbid', ... }`

**Expected Results for User D**:
- Slot NOT changed (still User C)
- Full refund created for User D:
  - `amount_eur = 25.00` (100% refund, no commission)
  - `commission_eur = 0.00`
  - `status = 'pending'`
- Returns: `{ success: false, reason: 'race_condition', message: 'This slot was outbid by someone else while you were bidding' }`

**Verification Query**:
```sql
-- Check final slot owner (should be User C)
SELECT current_owner_id, current_bid_eur FROM slots WHERE id = '[Slot ID]';

-- Check all transactions
SELECT user_id, type, amount_eur, commission_eur, status
FROM transactions
WHERE slot_id = '[Slot ID]'
ORDER BY created_at;
```

---

### 4. Self-Outbid Prevention

**Scenario**: User tries to outbid their own slot

**Setup**:
- Slot exists with User E as owner (€30 bid)
- User E tries to bid €35 on their own slot

**Expected Behavior**:
- **Frontend Prevention**: Bid form should detect self-ownership and prevent bid submission
- **Backend Handling**: If somehow bypassed, `process_bid` will still process it (no harm, but wasteful)
  - User E will displace themselves
  - Will receive 90% refund of old bid
  - Effectively paying 10% for no reason

**Best Practice**: Prevent in UI with:
```typescript
if (slot.current_owner_id === user.id) {
  // Show "You already own this slot" message
  // Disable bid button
}
```

**Test Steps**:
1. Verify frontend prevents self-bids
2. Test edge case: User opens two browser windows, bids in both
   - Second bid should fail at payment stage (metadata validation)

---

### 5. Multiple Outbids (Ownership Chain)

**Scenario**: Slot changes hands 5 times in rapid succession

**Setup**:
- Start with User A (€10)
- User B bids €20
- User C bids €30
- User D bids €40
- User E bids €50

**Test Steps**:
Execute 4 sequential `process_bid` calls (B, C, D, E outbidding in order)

**Expected Results**:
- Slot final owner: User E (€50)
- History entries: 5 total
  - User A: €10, ended
  - User B: €20, ended
  - User C: €30, ended
  - User D: €40, ended
  - User E: €50, active (ended_at = NULL)
- Refunds created:
  - User A: €9.00 (90% of €10)
  - User B: €18.00 (90% of €20)
  - User C: €27.00 (90% of €30)
  - User D: €36.00 (90% of €40)
- Total commission collected: €1 + €2 + €3 + €4 = €10

**Verification Query**:
```sql
-- Check complete history
SELECT
  owner_id,
  bid_eur,
  started_at,
  ended_at,
  displaced_by_id
FROM slot_history
WHERE slot_id = '[Slot ID]'
ORDER BY started_at;

-- Check all refunds
SELECT
  user_id,
  amount_eur,
  commission_eur
FROM transactions
WHERE slot_id = '[Slot ID]' AND type = 'refund'
ORDER BY created_at;

-- Verify commission total
SELECT
  SUM(commission_eur) as total_commission
FROM transactions
WHERE slot_id = '[Slot ID]' AND type = 'refund';
```

---

## Refund Processing Tests

### 6. Automatic Refund Processing

**Scenario**: Webhook triggers refund processing after displacement

**Test Steps**:
1. User B outbids User A
2. Webhook calls `process_bid` (creates pending refund for User A)
3. Webhook immediately calls `processRefunds()`
4. Refund utility:
   - Finds pending refund for User A
   - Locates original payment intent from User A's bid transaction
   - Creates Stripe refund
   - Updates refund transaction to `status = 'completed'`

**Expected Results**:
- Refund transaction: `status = 'completed'`
- Stripe refund created and linked
- User A receives funds back to original payment method

**Verification**:
```sql
SELECT
  id,
  user_id,
  amount_eur,
  status,
  stripe_payment_intent_id
FROM transactions
WHERE user_id = '[User A ID]' AND type = 'refund';
```

---

### 7. Manual Refund Processing (Admin)

**Scenario**: Admin manually triggers refund processing

**Test Steps**:
1. Create pending refunds (from displacement)
2. Admin calls `POST /api/admin/process-refunds`
3. Endpoint verifies admin status
4. Calls `processRefunds()`
5. Returns summary

**Expected Response**:
```json
{
  "success": true,
  "processed": 3,
  "failed": 0,
  "details": [
    { "transaction_id": "...", "status": "success" },
    { "transaction_id": "...", "status": "success" },
    { "transaction_id": "...", "status": "success" }
  ]
}
```

---

### 8. Failed Refund Handling

**Scenario**: Stripe refund fails (e.g., payment method expired)

**Test Steps**:
1. Create displacement that triggers refund
2. Mock Stripe API to return error
3. `processRefunds()` catches error
4. Marks transaction as `status = 'failed'`

**Expected Results**:
- Transaction: `status = 'failed'`
- Admin alert created (if using migration 003):
  ```sql
  SELECT * FROM admin_alerts WHERE type = 'refund_failed';
  ```
- Admin can manually resolve via Stripe dashboard

---

## Performance Tests

### 9. Concurrent Load Test

**Scenario**: 10 users bid on 10 different slots simultaneously

**Test Steps**:
1. Create 10 slots with different owners
2. Prepare 10 users with completed payments
3. Send 10 webhook events concurrently
4. All call `process_bid` at same time

**Expected Results**:
- All 10 bids process successfully (no conflicts)
- Each slot updates independently
- All refunds created correctly
- No deadlocks or timeouts

**Performance Target**:
- Each `process_bid` call: < 100ms
- Total processing time: < 500ms

---

### 10. Execution Time Benchmark

**Scenario**: Measure `process_bid` performance

**Test Query**:
```sql
EXPLAIN ANALYZE
SELECT process_bid(
  '[transaction_id]'::uuid,
  '[user_id]'::uuid,
  'outbid',
  '[slot_id]'::uuid,
  25.00,
  'https://example.com/image.jpg',
  'https://example.com',
  'Test Brand',
  '#FF6B00'
);
```

**Expected Results**:
- Execution time: < 50ms (typical)
- Plan: Sequential scan + index lookups
- No full table scans

---

## Security Tests

### 11. Idempotency Check

**Scenario**: Same webhook event received twice (network retry)

**Test Steps**:
1. Process `checkout.session.completed` event
2. Re-send exact same event (same `session.id`)
3. Webhook checks for existing completed transaction
4. Returns early without calling `process_bid`

**Expected Results**:
- First request: Creates slot/displacement
- Second request: Returns `{ received: true }` immediately
- No duplicate slots or refunds created

---

### 12. RLS Policy Verification

**Scenario**: Verify Row Level Security prevents unauthorized access

**Test Steps**:
1. Regular user queries `transactions` table
2. Should only see their own transactions
3. Admin user queries same table
4. Should see all transactions

**Verification**:
```sql
-- As regular user
SET LOCAL role TO authenticated;
SET LOCAL request.jwt.claims TO '{"sub": "[regular_user_id]"}';
SELECT COUNT(*) FROM transactions; -- Should match user's transaction count

-- As admin
SET LOCAL request.jwt.claims TO '{"sub": "[admin_user_id]"}';
SELECT COUNT(*) FROM transactions; -- Should see all
```

---

## Error Handling Tests

### 13. Invalid Mode

**Scenario**: Call `process_bid` with invalid mode

**Test Steps**:
```sql
SELECT process_bid(
  '[transaction_id]'::uuid,
  '[user_id]'::uuid,
  'invalid_mode',  -- Invalid!
  NULL,
  10.00,
  NULL,
  'https://example.com',
  'Test',
  '#FF6B00'
);
```

**Expected Results**:
- Exception raised: `Invalid mode: invalid_mode`
- Transaction rolled back
- No changes to database

---

### 14. Missing Required Fields

**Scenario**: Call with NULL required parameters

**Test Steps**:
```sql
SELECT process_bid(
  NULL,  -- Missing transaction_id
  '[user_id]'::uuid,
  'new',
  NULL,
  10.00,
  NULL,
  'https://example.com',
  'Test',
  '#FF6B00'
);
```

**Expected Results**:
- Postgres NOT NULL constraint violation
- Transaction rolled back

---

## Integration Tests

### 15. End-to-End Flow

**Scenario**: Complete user journey from checkout to refund

**Test Steps**:
1. User A creates checkout session via `/api/create-checkout`
2. User A completes payment on Stripe
3. Stripe sends webhook
4. Webhook processes bid, creates slot
5. User B creates checkout to outbid User A
6. User B completes payment
7. Stripe sends webhook
8. Webhook processes displacement
9. Refund created for User A
10. `processRefunds()` executes
11. User A receives Stripe refund

**Expected Results**:
- Complete audit trail in database
- Stripe payments and refunds match database records
- No missing or duplicate transactions
- History correctly shows ownership chain

---

## Monitoring & Alerts

### 16. Admin Alert Creation

**Scenario**: Race condition creates admin alert

**Setup**:
- Admin alerts migration applied (003_admin_alerts.sql)

**Test Steps**:
1. Trigger race condition (Test Scenario 3)
2. Check for admin alert

**Expected Results**:
```sql
SELECT * FROM admin_alerts
WHERE type = 'race_condition'
AND status = 'open'
ORDER BY created_at DESC
LIMIT 1;
```

Should show alert with metadata containing:
- Transaction ID
- User ID
- Slot ID
- Bid amount

---

## Summary

These test cases cover:
- Happy paths (new slot, simple outbid)
- Edge cases (race conditions, self-outbid)
- Error handling (invalid input, failed refunds)
- Performance (concurrent load, execution time)
- Security (idempotency, RLS)
- Integration (end-to-end flow)

**Testing Tools**:
- Supabase SQL Editor for direct function testing
- Stripe CLI for webhook testing (`stripe trigger checkout.session.completed`)
- Jest/Vitest for automated integration tests
- Artillery/k6 for load testing

**Success Criteria**:
- All atomic operations succeed or rollback completely
- No orphaned records or inconsistent state
- Race conditions handled gracefully
- Refunds processed correctly (90% user, 10% commission)
- Performance targets met (< 100ms per bid)
- Complete audit trail in `slot_history`
