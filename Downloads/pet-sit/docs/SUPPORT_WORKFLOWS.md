# Support Workflows

Define support triage standards for commercial operations.

## Ticket Taxonomy

Use labels:

- `area:payments`
- `area:booking`
- `area:auth`
- `area:admin`
- `area:notifications`
- `severity:s1` (production outage)
- `severity:s2` (major degradation)
- `severity:s3` (normal defect/request)

## SLA Targets

- `severity:s1`: acknowledge within 15 minutes, hourly updates.
- `severity:s2`: acknowledge within 1 hour, updates every 4 hours.
- `severity:s3`: acknowledge within 1 business day.

## Escalation Path

1. Support triage creates/labels incident ticket.
2. On-call engineer is paged for `s1` and `s2`.
3. Product + operations notified for customer-impacting payment/auth issues.
4. Engineering lead approves mitigation/rollback decisions.

## Standard Playbooks

- Payments: `docs/runbooks/payments-outage.md`
- Auth: `docs/runbooks/auth-outage.md`

## Post-Resolution

1. Confirm customer-visible resolution.
2. Link root-cause issue/PR.
3. Add regression test and update runbook/checklist as needed.

