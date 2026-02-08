# Performance Playbook

## Hot-Path Indexes

Apply `scripts/036_add_hot_path_indexes.sql` to improve:

- webhook payment lookup by `stripe_payment_intent_id`
- booking list filters by sitter/listing/status
- points ledger balance/refund scans
- safety report moderation queue ordering

## Explain Plan Validation

Run in staging after migration:

```sql
explain analyze
select id
from bookings
where stripe_payment_intent_id = 'pi_example';
```

```sql
explain analyze
select points_delta
from points_ledger
where user_id = '00000000-0000-4000-8000-000000000001'
order by created_at desc
limit 100;
```

## Cache TTL Policy

- Geocode success TTL: 30 days.
- Geocode miss TTL: 12 hours.
- Authenticated search result TTL: 45 seconds.

Configured in `lib/cache/policies.ts`.

## Load Testing

Run smoke load test against staging/prod candidate:

```bash
npm run loadtest:smoke -- --base-url https://staging.example.com
```

Optional authenticated API scenario:

```bash
LOAD_TEST_AUTH_COOKIE='sb-access-token=...' npm run loadtest:api -- --base-url https://staging.example.com
```

`loadtest:api` includes webhook ingestion route pressure (`/api/stripe/webhook`) with intentionally invalid signatures to benchmark endpoint handling.

Target baseline:

- overall failure rate <= 2%
- health/geocode P95 <= 1200ms
