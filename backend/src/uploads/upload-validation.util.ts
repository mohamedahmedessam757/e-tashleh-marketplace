import { BadRequestException } from '@nestjs/common';

const ALLOWED_MIME = new Set([
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
  'image/gif',
  'application/pdf',
  'image/svg+xml',
  'video/mp4',
  'video/webm',
]);

const MAX_BYTES_DEFAULT = 10 * 1024 * 1024;
const MAX_BYTES_AVATAR = 2 * 1024 * 1024;
const MAX_BYTES_VERIFICATION = 50 * 1024 * 1024;
const MAX_BYTES_PLATFORM_ASSET = 5 * 1024 * 1024;

export type UploadProfile = 'default' | 'avatar' | 'verification' | 'platform-asset';

export function validateUploadedFile(
  file: Express.Multer.File,
  profile: UploadProfile = 'default',
): void {
  if (!file?.buffer?.length) {
    throw new BadRequestException('No file provided');
  }

  const maxBytes =
    profile === 'avatar'
      ? MAX_BYTES_AVATAR
      : profile === 'verification'
        ? MAX_BYTES_VERIFICATION
        : profile === 'platform-asset'
          ? MAX_BYTES_PLATFORM_ASSET
        : MAX_BYTES_DEFAULT;

  if (file.size > maxBytes || file.buffer.length > maxBytes) {
    throw new BadRequestException(`File exceeds maximum size (${maxBytes / 1024 / 1024}MB)`);
  }

  const mime = (file.mimetype || '').toLowerCase();
  if (!ALLOWED_MIME.has(mime)) {
    throw new BadRequestException(`File type not allowed: ${mime || 'unknown'}`);
  }

  const ext = (file.originalname?.split('.').pop() || '').toLowerCase();
  const allowedExt = ['jpg', 'jpeg', 'png', 'webp', 'gif', 'pdf', 'mp4', 'webm', 'svg'];
  if (ext && !allowedExt.includes(ext)) {
    throw new BadRequestException(`File extension not allowed: .${ext}`);
  }
}
