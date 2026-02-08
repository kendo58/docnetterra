# Dashboard Metrics and Queries

Use these queries to back dashboards for booking/payment funnel and worker reliability.

## Booking and Payment Funnel

### Daily booking lifecycle counts

```sql
select
  date_trunc('day', created_at) as day,
  count(*) filter (where status = 'pending') as pending,
  count(*) filter (where status in ('accepted', 'confirmed')) as accepted_or_confirmed,
  count(*) filter (where status = 'completed') as completed,
  count(*) filter (where status = 'cancelled') as cancelled
from bookings
where created_at >= now() - interval '30 days'
group by 1
order by 1;
```

### Payment completion and refund rates

```sql
select
  date_trunc('day', coalesce(paid_at, created_at)) as day,
  count(*) filter (where payment_status = 'paid') as paid,
  count(*) filter (where payment_status = 'refunded') as refunded,
  count(*) filter (where payment_status = 'unpaid') as unpaid
from bookings
where created_at >= now() - interval '30 days'
group by 1
order by 1;
```

### Stripe webhook volume and duplicates

```sql
select
  date_trunc('hour', processed_at) as hour,
  count(*) as total_events,
  count(*) filter (where event_type = 'payment_intent.succeeded') as payment_success_events
from stripe_webhook_events
where processed_at >= now() - interval '7 days'
group by 1
order by 1;
```

## Jobs and Email Reliability

### Job queue depth by status

```sql
select status, count(*) as jobs
from jobs
group by status
order by status;
```

### Queue latency (queued/retry oldest age)

```sql
select
  extract(epoch from (now() - min(run_at))) as oldest_queue_age_seconds
from jobs
where status in ('queued', 'retry');
```

### Email send success/failure over time

```sql
select
  date_trunc('hour', updated_at) as hour,
  count(*) filter (where task = 'email.send' and status = 'succeeded') as email_success,
  count(*) filter (where task = 'email.send' and status = 'failed') as email_failed
from jobs
where updated_at >= now() - interval '7 days'
group by 1
order by 1;
```

## Suggested Dashboard Panels

- Booking funnel (`pending -> accepted/confirmed -> completed`).
- Payment outcomes (`paid`, `refunded`, `unpaid`).
- Webhook throughput and error count.
- Queue depth and oldest queued job age.
- Email send success vs failure trend.

