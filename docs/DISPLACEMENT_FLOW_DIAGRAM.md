# Displacement Flow Diagram

## Overview

This document provides visual representations of the displacement logic flow for The Last Billboard platform.

---

## 1. New Slot Creation Flow

```
┌──────────────────────────────────────────────────────────────────┐
│                         USER A                                    │
│                    (First Bid: €10)                               │
└───────────────────────────┬──────────────────────────────────────┘
                            │
                            ▼
┌──────────────────────────────────────────────────────────────────┐
│  1. User completes Stripe Checkout                               │
└───────────────────────────┬──────────────────────────────────────┘
                            │
                            ▼
┌──────────────────────────────────────────────────────────────────┐
│  2. Stripe sends checkout.session.completed webhook              │
└───────────────────────────┬──────────────────────────────────────┘
                            │
                            ▼
┌──────────────────────────────────────────────────────────────────┐
│  3. Webhook Handler                                              │
│     - Verify signature                                           │
│     - Check idempotency                                          │
│     - Update transaction with payment_intent_id                  │
└───────────────────────────┬──────────────────────────────────────┘
                            │
                            ▼
┌──────────────────────────────────────────────────────────────────┐
│  4. Call process_bid()                                           │
│     Mode: 'new'                                                  │
│     Parameters: user_id, bid_eur, image_url, etc.               │
└───────────────────────────┬──────────────────────────────────────┘
                            │
                            ▼
        ┌───────────────────────────────────────┐
        │    POSTGRES TRANSACTION BEGINS        │
        └───────────────────┬───────────────────┘
                            │
                            ▼
        ┌───────────────────────────────────────┐
        │  A. Update transaction status         │
        │     SET status = 'completed'          │
        └───────────────────┬───────────────────┘
                            │
                            ▼
        ┌───────────────────────────────────────┐
        │  B. INSERT INTO slots                 │
        │     - current_owner_id = User A       │
        │     - current_bid_eur = €10           │
        │     - status = 'active'               │
        │     RETURNING id → v_slot_id          │
        └───────────────────┬───────────────────┘
                            │
                            ▼
        ┌───────────────────────────────────────┐
        │  C. INSERT INTO slot_history          │
        │     - slot_id = v_slot_id             │
        │     - owner_id = User A               │
        │     - bid_eur = €10                   │
        │     - started_at = NOW()              │
        │     - ended_at = NULL                 │
        └───────────────────┬───────────────────┘
                            │
                            ▼
        ┌───────────────────────────────────────┐
        │    POSTGRES TRANSACTION COMMITS       │
        └───────────────────┬───────────────────┘
                            │
                            ▼
┌──────────────────────────────────────────────────────────────────┐
│  5. Return success                                               │
│     { success: true, mode: 'new', slot_id: [UUID] }             │
└───────────────────────────┬──────────────────────────────────────┘
                            │
                            ▼
┌──────────────────────────────────────────────────────────────────┐
│  6. Process pending refunds (none in this case)                  │
└───────────────────────────┬──────────────────────────────────────┘
                            │
                            ▼
                        ✓ COMPLETE
```

---

## 2. Outbid/Displacement Flow (Normal Case)

```
┌──────────────────────────────────────────────────────────────────┐
│   Slot exists: User A owns, €10 bid                             │
│   User B wants to outbid with €20                                │
└───────────────────────────┬──────────────────────────────────────┘
                            │
                            ▼
┌──────────────────────────────────────────────────────────────────┐
│  1-3. [Same as New Slot: Checkout, Webhook, Verification]       │
└───────────────────────────┬──────────────────────────────────────┘
                            │
                            ▼
┌──────────────────────────────────────────────────────────────────┐
│  4. Call process_bid()                                           │
│     Mode: 'outbid'                                               │
│     slot_id: [existing slot]                                     │
│     bid_eur: €20                                                 │
└───────────────────────────┬──────────────────────────────────────┘
                            │
                            ▼
        ┌───────────────────────────────────────┐
        │    POSTGRES TRANSACTION BEGINS        │
        └───────────────────┬───────────────────┘
                            │
                            ▼
        ┌───────────────────────────────────────┐
        │  A. Update transaction status         │
        └───────────────────┬───────────────────┘
                            │
                            ▼
        ┌───────────────────────────────────────┐
        │  B. SELECT ... FOR UPDATE             │
        │     Lock slot row                     │
        │     Get: v_old_owner_id = User A      │
        │          v_old_bid_eur = €10          │
        └───────────────────┬───────────────────┘
                            │
                            ▼
        ┌───────────────────────────────────────┐
        │  C. Check: €20 > €10? YES ✓           │
        └───────────────────┬───────────────────┘
                            │
                            ▼
        ┌───────────────────────────────────────┐
        │  D. UPDATE slot_history               │
        │     WHERE ended_at IS NULL            │
        │     SET ended_at = NOW()              │
        │         displaced_by_id = User B      │
        └───────────────────┬───────────────────┘
                            │
                            ▼
        ┌───────────────────────────────────────┐
        │  E. Calculate refund                  │
        │     commission = €10 × 0.10 = €1      │
        │     refund = €10 - €1 = €9            │
        └───────────────────┬───────────────────┘
                            │
                            ▼
        ┌───────────────────────────────────────┐
        │  F. INSERT INTO transactions          │
        │     - user_id = User A                │
        │     - type = 'refund'                 │
        │     - amount_eur = €9                 │
        │     - commission_eur = €1             │
        │     - status = 'pending'              │
        └───────────────────┬───────────────────┘
                            │
                            ▼
        ┌───────────────────────────────────────┐
        │  G. UPDATE slots                      │
        │     - current_owner_id = User B       │
        │     - current_bid_eur = €20           │
        │     - updated_at = NOW()              │
        └───────────────────┬───────────────────┘
                            │
                            ▼
        ┌───────────────────────────────────────┐
        │  H. INSERT INTO slot_history          │
        │     - owner_id = User B               │
        │     - bid_eur = €20                   │
        │     - started_at = NOW()              │
        │     - ended_at = NULL                 │
        └───────────────────┬───────────────────┘
                            │
                            ▼
        ┌───────────────────────────────────────┐
        │    POSTGRES TRANSACTION COMMITS       │
        └───────────────────┬───────────────────┘
                            │
                            ▼
┌──────────────────────────────────────────────────────────────────┐
│  5. Return success                                               │
│     { success: true, mode: 'outbid',                            │
│       refund_amount: €9, refund_user_id: User A }               │
└───────────────────────────┬──────────────────────────────────────┘
                            │
                            ▼
┌──────────────────────────────────────────────────────────────────┐
│  6. Process pending refunds                                      │
│     - Find User A's refund transaction                           │
│     - Get original payment_intent_id                             │
│     - Create Stripe refund for €9                                │
│     - Update refund transaction: status = 'completed'            │
└───────────────────────────┬──────────────────────────────────────┘
                            │
                            ▼
                        ✓ COMPLETE

                   User A receives €9 refund
                   User B now owns slot
```

---

## 3. Race Condition Flow

```
┌──────────────────────────────────────────────────────────────────┐
│   Slot: User A owns, €10 bid                                     │
│   User B and User C BOTH bid €15 at same time                    │
└───────────────────────────┬──────────────────────────────────────┘
                            │
                ┌───────────┴───────────┐
                │                       │
                ▼                       ▼
         USER B WEBHOOK           USER C WEBHOOK
         arrives at 10:00:00.000  arrives at 10:00:00.005
                │                       │
                ▼                       │
    ┌──────────────────────┐            │
    │ User B: process_bid  │            │
    │ Acquires FOR UPDATE  │            │
    │ lock on slot         │            │
    └──────────┬───────────┘            │
               │                        │
               ▼                        │
    ┌──────────────────────┐            │
    │ Check: €15 > €10? ✓  │            │
    │ Proceed with         │            │
    │ displacement         │            │
    └──────────┬───────────┘            │
               │                        │
               ▼                        │
    ┌──────────────────────┐            │
    │ Update slot to       │            │
    │ User B, €15          │            │
    │ Create refund for A  │            │
    └──────────┬───────────┘            │
               │                        │
               ▼                        │
    ┌──────────────────────┐            │
    │ TRANSACTION COMMITS  │            │
    │ Lock released        │            │
    └──────────┬───────────┘            │
               │                        │
               ▼                        ▼
            SUCCESS          ┌──────────────────────┐
                             │ User C: process_bid  │
                             │ Waits for lock...    │
                             └──────────┬───────────┘
                                        │
                                        ▼
                             ┌──────────────────────┐
                             │ Lock acquired        │
                             │ SELECT ... FOR UPDATE│
                             │ Get: current_bid = €15│
                             │      owner = User B   │
                             └──────────┬───────────┘
                                        │
                                        ▼
                             ┌──────────────────────┐
                             │ Check: €15 > €15? NO │
                             │ RACE CONDITION! ✗    │
                             └──────────┬───────────┘
                                        │
                                        ▼
                             ┌──────────────────────┐
                             │ INSERT refund for C  │
                             │ amount: €15 (100%)   │
                             │ commission: €0       │
                             │ status: 'pending'    │
                             └──────────┬───────────┘
                                        │
                                        ▼
                             ┌──────────────────────┐
                             │ Return:              │
                             │ { success: false,    │
                             │   reason: 'race_...' │
                             └──────────┬───────────┘
                                        │
                                        ▼
                             ┌──────────────────────┐
                             │ Process refund       │
                             │ User C gets full €15 │
                             │ back                 │
                             └──────────────────────┘
                                        │
                                        ▼
                                   COMPLETE

Result:
- User B owns slot (€15 bid)
- User A received €9 refund (90% of €10)
- User C received €15 refund (100%, platform error)
- Platform keeps €1 commission from User A
```

---

## 4. Refund Processing Flow

```
┌──────────────────────────────────────────────────────────────────┐
│  Trigger: After displacement or manual admin call                │
└───────────────────────────┬──────────────────────────────────────┘
                            │
                            ▼
┌──────────────────────────────────────────────────────────────────┐
│  processRefunds() called                                         │
└───────────────────────────┬──────────────────────────────────────┘
                            │
                            ▼
┌──────────────────────────────────────────────────────────────────┐
│  1. Query pending refunds                                        │
│     SELECT * FROM transactions                                   │
│     WHERE type = 'refund' AND status = 'pending'                 │
└───────────────────────────┬──────────────────────────────────────┘
                            │
                            ▼
        ┌───────────────────────────────────────┐
        │  FOR EACH pending refund:             │
        └───────────────────┬───────────────────┘
                            │
                            ▼
        ┌───────────────────────────────────────┐
        │  2. Find original bid transaction     │
        │     SELECT stripe_payment_intent_id   │
        │     WHERE user_id = refund.user_id    │
        │     AND slot_id = refund.slot_id      │
        │     AND type = 'bid'                  │
        │     ORDER BY created_at DESC          │
        │     LIMIT 1                           │
        └───────────────────┬───────────────────┘
                            │
                            ▼
        ┌───────────────────────────────────────┐
        │  3. Create Stripe refund              │
        │     stripe.refunds.create({           │
        │       payment_intent: [found ID],     │
        │       amount: refund.amount_eur * 100,│
        │       reason: 'requested_by_customer',│
        │       metadata: { ... }               │
        │     })                                │
        └───────────────────┬───────────────────┘
                            │
                ┌───────────┴───────────┐
                │                       │
            SUCCESS                  FAILURE
                │                       │
                ▼                       ▼
    ┌──────────────────────┐  ┌──────────────────────┐
    │ 4a. Update refund    │  │ 4b. Update refund    │
    │     transaction:     │  │     transaction:     │
    │     status =         │  │     status = 'failed'│
    │       'completed'    │  │                      │
    │     stripe_payment_  │  │ Create admin alert   │
    │       intent_id =    │  │ (if enabled)         │
    │       [refund ID]    │  │                      │
    └──────────┬───────────┘  └──────────┬───────────┘
               │                         │
               └────────────┬────────────┘
                            │
                            ▼
        ┌───────────────────────────────────────┐
        │  CONTINUE to next refund              │
        └───────────────────┬───────────────────┘
                            │
                            ▼
┌──────────────────────────────────────────────────────────────────┐
│  5. Return summary                                               │
│     {                                                            │
│       processed: 3,                                              │
│       failed: 1,                                                 │
│       details: [ ... ]                                           │
│     }                                                            │
└──────────────────────────────────────────────────────────────────┘
```

---

## 5. Database State Changes (Outbid Example)

### Before Outbid

```
slots:
┌──────┬─────────┬──────────┬────────┐
│ id   │ owner   │ bid_eur  │ status │
├──────┼─────────┼──────────┼────────┤
│ S1   │ User A  │ 10.00    │ active │
└──────┴─────────┴──────────┴────────┘

slot_history:
┌────┬─────────┬──────────┬────────┬────────────┬────────────┬──────────────┐
│ id │ slot_id │ owner_id │ bid_eur│ started_at │ ended_at   │ displaced_by │
├────┼─────────┼──────────┼────────┼────────────┼────────────┼──────────────┤
│ H1 │ S1      │ User A   │ 10.00  │ 10:00      │ NULL       │ NULL         │
└────┴─────────┴──────────┴────────┴────────────┴────────────┴──────────────┘

transactions:
┌────┬─────────┬─────────┬──────┬────────────┬──────────────┬────────┐
│ id │ user_id │ slot_id │ type │ amount_eur │ commission   │ status │
├────┼─────────┼─────────┼──────┼────────────┼──────────────┼────────┤
│ T1 │ User A  │ S1      │ bid  │ 10.00      │ 0.00         │ complet│
└────┴─────────┴─────────┴──────┴────────────┴──────────────┴────────┘
```

### After User B bids €20

```
slots:
┌──────┬─────────┬──────────┬────────┐
│ id   │ owner   │ bid_eur  │ status │
├──────┼─────────┼──────────┼────────┤
│ S1   │ User B  │ 20.00    │ active │  ← UPDATED
└──────┴─────────┴──────────┴────────┘

slot_history:
┌────┬─────────┬──────────┬────────┬────────────┬────────────┬──────────────┐
│ id │ slot_id │ owner_id │ bid_eur│ started_at │ ended_at   │ displaced_by │
├────┼─────────┼──────────┼────────┼────────────┼────────────┼──────────────┤
│ H1 │ S1      │ User A   │ 10.00  │ 10:00      │ 10:05      │ User B       │  ← UPDATED
│ H2 │ S1      │ User B   │ 20.00  │ 10:05      │ NULL       │ NULL         │  ← NEW
└────┴─────────┴──────────┴────────┴────────────┴────────────┴──────────────┘

transactions:
┌────┬─────────┬─────────┬──────┬────────────┬──────────────┬────────┐
│ id │ user_id │ slot_id │ type │ amount_eur │ commission   │ status │
├────┼─────────┼─────────┼──────┼────────────┼──────────────┼────────┤
│ T1 │ User A  │ S1      │ bid  │ 10.00      │ 0.00         │ complet│
│ T2 │ User B  │ S1      │ bid  │ 20.00      │ 0.00         │ complet│  ← NEW
│ T3 │ User A  │ S1      │refund│  9.00      │ 1.00         │ pending│  ← NEW
└────┴─────────┴─────────┴──────┴────────────┴──────────────┴────────┘
```

### After refund processing

```
transactions:
┌────┬─────────┬─────────┬──────┬────────────┬──────────────┬────────┐
│ id │ user_id │ slot_id │ type │ amount_eur │ commission   │ status │
├────┼─────────┼─────────┼──────┼────────────┼──────────────┼────────┤
│ T1 │ User A  │ S1      │ bid  │ 10.00      │ 0.00         │ complet│
│ T2 │ User B  │ S1      │ bid  │ 20.00      │ 0.00         │ complet│
│ T3 │ User A  │ S1      │refund│  9.00      │ 1.00         │ complet│  ← UPDATED
└────┴─────────┴─────────┴──────┴────────────┴──────────────┴────────┘
```

---

## 6. Locking Mechanism (FOR UPDATE)

```
Timeline of concurrent bids:

Time    User B Thread              Slot Row Lock           User C Thread
─────────────────────────────────────────────────────────────────────────
10:00   BEGIN TRANSACTION          [ unlocked ]            BEGIN TRANSACTION
        ↓
10:01   SELECT ... FOR UPDATE
        → Acquires lock            [ LOCKED by B ]
                                                            SELECT ... FOR UPDATE
                                                            → Waits for lock...
10:02   Check: €15 > €10 ✓         [ LOCKED by B ]         [ waiting... ]
        Update slot to B
        Create refund for A
        ↓
10:03   COMMIT
        → Releases lock            [ unlocked ]
                                                            → Lock acquired!
                                                            SELECT returns:
                                                              owner = B
                                                              bid = €15
10:04                              [ LOCKED by C ]         Check: €15 > €15 ✗
                                                            Race detected!
                                                            Create full refund
                                                            ↓
10:05                              [ unlocked ]            COMMIT

Result: Sequential execution prevents data corruption
```

---

## 7. Error Handling Paths

```
                    ┌───────────────────┐
                    │  Webhook received │
                    └─────────┬─────────┘
                              │
                              ▼
                    ┌───────────────────┐
                    │ Signature valid?  │
                    └─────────┬─────────┘
                              │
                 ┌────────────┴────────────┐
                 │                         │
               YES                        NO
                 │                         │
                 ▼                         ▼
    ┌──────────────────────┐    ┌──────────────────┐
    │ Transaction exists?  │    │ Return 400       │
    └─────────┬────────────┘    │ Invalid signature│
              │                 └──────────────────┘
 ┌────────────┴────────────┐
 │                         │
YES                       NO
 │                         │
 ▼                         ▼
┌──────────────┐  ┌──────────────────┐
│ Already      │  │ Return 400       │
│ completed?   │  │ Unknown txn      │
└──────┬───────┘  └──────────────────┘
       │
  ┌────┴────┐
  │         │
 YES       NO
  │         │
  ▼         ▼
┌───────┐  ┌──────────────────┐
│Return │  │ Call process_bid │
│200    │  └─────────┬────────┘
└───────┘            │
                     ▼
          ┌──────────────────┐
          │ process_bid      │
          │ succeeds?        │
          └─────────┬────────┘
                    │
       ┌────────────┴────────────┐
       │                         │
     YES                        NO
       │                         │
       ▼                         ▼
┌──────────────┐      ┌──────────────────┐
│ Race         │      │ Return 500       │
│ condition?   │      │ Log error        │
└──────┬───────┘      │ Stripe retries   │
       │              └──────────────────┘
  ┌────┴────┐
  │         │
 YES       NO
  │         │
  ▼         ▼
┌──────┐  ┌──────────────┐
│Log   │  │ Process      │
│warn  │  │ refunds      │
└──────┘  └──────┬───────┘
               │         │
               ▼         ▼
          ┌─────────────────┐
          │ Return 200      │
          │ Success         │
          └─────────────────┘
```

---

## Summary

These flow diagrams illustrate:

1. **New Slot Creation**: Simple linear flow creating slot and history
2. **Outbid/Displacement**: Complex flow with locking, refund calculation
3. **Race Condition**: Concurrent bid handling with FOR UPDATE locks
4. **Refund Processing**: Batch processing of pending refunds via Stripe
5. **Database State**: Before/after snapshots showing data changes
6. **Locking Timeline**: How FOR UPDATE prevents race conditions
7. **Error Handling**: Decision tree for webhook error scenarios

All flows ensure:
- Atomicity (single transaction)
- Race condition prevention (row-level locks)
- Data consistency (no orphaned records)
- Complete audit trails (slot_history)
- Proper refund handling (90%/10% split)
