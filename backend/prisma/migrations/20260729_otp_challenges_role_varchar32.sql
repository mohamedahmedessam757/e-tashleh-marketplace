-- Fix: VERIFICATION_OFFICER (20 chars) overflowed otp_challenges.role VARCHAR(16)
-- causing POST /auth/otp/send → 500 Internal Server Error for verification officers.
ALTER TABLE public.otp_challenges
  ALTER COLUMN role TYPE VARCHAR(32);
