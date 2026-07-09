import { BadRequestException } from '@nestjs/common';

// SVG is intentionally NOT allowed: SVGs can embed <script> and become stored XSS
// when served inline from storage. Use raster/pdf/video formats only.
const ALLOWED_MIME = new Set([
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
  'image/gif',
  'application/pdf',
  'video/mp4',
  'video/webm',
]);

const MAX_BYTES_DEFAULT = 10 * 1024 * 1024;
const MAX_BYTES_AVATAR = 2 * 1024 * 1024;
const MAX_BYTES_VERIFICATION = 50 * 1024 * 1024;
const MAX_BYTES_PLATFORM_ASSET = 5 * 1024 * 1024;

export type UploadProfile = 'default' | 'avatar' | 'verification' | 'platform-asset';

/**
 * Detect the real content type from the file's magic bytes. Never trust the
 * client-supplied mimetype/extension — those are attacker-controlled.
 * Returns a canonical mime string or null if unrecognized.
 */
function sniffMime(buf: Buffer): string | null {
  if (buf.length < 12) return null;

  // JPEG: FF D8 FF
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return 'image/jpeg';

  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (
    buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47 &&
    buf[4] === 0x0d && buf[5] === 0x0a && buf[6] === 0x1a && buf[7] === 0x0a
  ) return 'image/png';

  // GIF: "GIF87a" / "GIF89a"
  if (buf.slice(0, 6).toString('ascii') === 'GIF87a' || buf.slice(0, 6).toString('ascii') === 'GIF89a') {
    return 'image/gif';
  }

  // WEBP: "RIFF"...."WEBP"
  if (buf.slice(0, 4).toString('ascii') === 'RIFF' && buf.slice(8, 12).toString('ascii') === 'WEBP') {
    return 'image/webp';
  }

  // PDF: "%PDF-"
  if (buf.slice(0, 5).toString('ascii') === '%PDF-') return 'application/pdf';

  // MP4 / ISO base media: bytes 4-8 == "ftyp"
  if (buf.slice(4, 8).toString('ascii') === 'ftyp') return 'video/mp4';

  // WEBM / Matroska (EBML): 1A 45 DF A3
  if (buf[0] === 0x1a && buf[1] === 0x45 && buf[2] === 0xdf && buf[3] === 0xa3) return 'video/webm';

  return null;
}

// Sniffed type -> the client mimes we consider compatible with it.
const COMPATIBLE: Record<string, string[]> = {
  'image/jpeg': ['image/jpeg', 'image/jpg'],
  'image/png': ['image/png'],
  'image/gif': ['image/gif'],
  'image/webp': ['image/webp'],
  'application/pdf': ['application/pdf'],
  'video/mp4': ['video/mp4'],
  'video/webm': ['video/webm'],
};

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
  const allowedExt = ['jpg', 'jpeg', 'png', 'webp', 'gif', 'pdf', 'mp4', 'webm'];
  if (ext && !allowedExt.includes(ext)) {
    throw new BadRequestException(`File extension not allowed: .${ext}`);
  }

  // Verify the real content matches what the client claims (anti content-spoofing / polyglot).
  const sniffed = sniffMime(file.buffer);
  if (!sniffed) {
    throw new BadRequestException('File content type could not be verified');
  }
  const compatible = COMPATIBLE[sniffed] || [];
  if (!compatible.includes(mime)) {
    throw new BadRequestException('File content does not match its declared type');
  }
}
