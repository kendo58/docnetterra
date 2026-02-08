# Booking + Payment Lifecycle

Current production flow across booking creation, status transitions, payment finalization, refunds, and reviews.

## End-to-end system map

```mermaid
flowchart TD
  A[Listing created] --> B[Match + request sent]
  B --> C[createBooking server action]
  C --> D[Validate auth/dates/no self-booking/no overlap]
  D --> E[Insert booking status=pending payment_status=unpaid]
  E --> F[Notify homeowner + sitter]

  F --> G{Homeowner decision}
  G -->|accepted/confirmed| H[Booking active]
  G -->|declined| I[Terminal declined]
  G -->|cancelled| J[Release availability]

  H --> K[Sitter opens /bookings/:id/payment]
  K --> L[Server computes fees + points clamp]
  L --> M{Cash due > 0?}

  M -->|no (points-only)| N[completeBookingPayment]
  N --> O[pay_booking_with_points RPC]
  O --> P[Mark paid + debit points atomically]

  M -->|yes| Q[createBookingPaymentCheckoutSession]
  Q --> R[Stripe Embedded Checkout]
  R --> S[payment_intent.succeeded webhook]
  S --> T[/api/stripe/webhook]
  T --> U[Verify signature + idempotency record]
  U --> V[Link booking to payment_intent]
  V --> W[Validate flow=booking_fee_payment]
  W --> X[Validate currency=usd + amount >= expected cash due]
  X --> Y[pay_booking_with_points RPC with p_cash_paid]
  Y --> Z[Set payment_method=stripe + mark paid]

  P --> AA[booking_paid notifications + email jobs]
  Z --> AA

  J --> AB{Was already paid?}
  AB -->|yes| AC[Mark refunded + reverse points if needed]
  AB -->|no| AD[No payment reversal]

  AA --> AE{End date passed and paid?}
  AE -->|yes| AF[Mark completed]
  AF --> AG[Award homeowner points]
  AG --> AH[Enable mutual reviews]
```

## Booking state machine

```text
pending   -> accepted | declined | confirmed | cancelled
accepted  -> confirmed | cancelled | completed
confirmed -> cancelled | completed

Terminal booking statuses: declined, cancelled, completed, refunded
```

## Guardrails and integrity controls

- Database constraints:
  - `bookings_start_before_end` CHECK for valid date range.
  - `bookings_no_overlap_active` exclusion constraint for active booking overlap prevention.
- `pay_booking_with_points` RPC:
  - `FOR UPDATE` lock on booking row.
  - Per-sitter advisory lock to serialize points spending.
  - Authorization gate: only `service_role` or booking sitter.
  - Supports `p_cash_paid` for webhook-side cash sufficiency enforcement.
- Stripe webhook pipeline:
  - Signature verification with `STRIPE_WEBHOOK_SECRET`.
  - Durable dedupe via `stripe_webhook_events` (`event_id` uniqueness).
  - Production fails closed if dedupe table is unavailable.
  - Booking-fee finalization only on `payment_intent.succeeded`.
  - Amount and currency validation before marking a booking paid.
- RPC permissions are restricted to `service_role` in `scripts/034_harden_internal_rpc_permissions.sql`.

## Operational dependencies

- Apply migrations through `scripts/034_harden_internal_rpc_permissions.sql` (includes `scripts/033_add_atomic_booking_payment_rpc.sql` assumptions).
- Required Stripe env:
  - `STRIPE_SECRET_KEY`
  - `STRIPE_WEBHOOK_SECRET`
  - `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`
- Payment safety env:
  - `ALLOW_MANUAL_BOOKING_PAYMENTS=false` in production (recommended)
- Webhook endpoint:
  - `POST /api/stripe/webhook`
