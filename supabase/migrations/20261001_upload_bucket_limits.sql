-- Server-side size / mime limits for direct (signed URL) uploads.
update storage.buckets set file_size_limit = 52428800,
  allowed_mime_types = array['image/jpeg','image/png','image/webp','image/gif','application/pdf','video/mp4','video/quicktime','video/webm']
where id in ('marketplace-uploads','offer-attachments','verification-docs','returns-disputes','support-files','chat_media','appeals');

update storage.buckets set file_size_limit = 2097152, allowed_mime_types = array['image/jpeg','image/png','image/webp']
where id = 'profile';

update storage.buckets set file_size_limit = 5242880, allowed_mime_types = array['image/jpeg','image/png','image/webp','application/pdf']
where id = 'vendor-documents';
