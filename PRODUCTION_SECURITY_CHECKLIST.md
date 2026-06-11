# Production security checklist

## Before deploy

- [ ] Rotate keys per [SECURITY_KEY_ROTATION.md](SECURITY_KEY_ROTATION.md) if repo was ever shared
- [ ] Apply [supabase/migrations/20260528_security_hardening.sql](supabase/migrations/20260528_security_hardening.sql) on production DB
- [ ] Set `NODE_ENV=production`, `JWT_SECRET` (32+ chars), `CORS_ORIGINS`, `ALLOW_MOCK_PAYMENTS` unset/false
- [ ] Set `VITE_VERIFICATION_GPS_DEV_BYPASS=false` for Frontend build
- [ ] OTP `123456` remains dev-only risk — replace before public launch when ready
- [ ] Widers: `WIDERS_WEBHOOK_SECRET` set; sender URL uses `?token=`; rotate if leaked — see [docs/WIDERS_PHASE7_QA_SECURITY.md](docs/WIDERS_PHASE7_QA_SECURITY.md)
- [ ] Widers: `GET /widers/readiness` → `readyForProduction: true` before `WIDERS_ENABLED=true`
- [ ] Widers: `GET https://YOUR_API/widers/health` returns JSON (backend reachable, not SPA 404)

## Manual pentest (smoke)

- [ ] Unauthenticated access to `/returns/debug-all-disputes` → 404/401
- [ ] Chat IDOR: user A cannot read user B chat by ID
- [ ] `GET /users/:other-id` → 403 for non-admin
- [ ] Audit logs require admin permissions
- [ ] Logout clears `access_token` from localStorage

## Monitoring

- [ ] Review failed auth logs
- [ ] Stripe webhook duplicates return `{ duplicate: true }` without double fulfillment
