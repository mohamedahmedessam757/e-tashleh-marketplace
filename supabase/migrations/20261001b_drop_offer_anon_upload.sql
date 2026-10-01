-- Run only after offer uploads go through POST /uploads/sign in production.
drop policy if exists "Public Upload for Offer Images" on storage.objects;
