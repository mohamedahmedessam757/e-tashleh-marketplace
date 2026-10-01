import { Injectable, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { validateUploadedFile, UploadProfile, sniffMime, COMPATIBLE } from './upload-validation.util';
import { EXT_MIME } from './upload-policy';

export const VERIFICATION_FIELD_PHOTOS_BUCKET = 'verification-field-photos';

export const PLATFORM_ASSETS_BUCKET = 'marketplace-uploads';

@Injectable()
export class UploadsService {
    private supabase: SupabaseClient;

    constructor(private configService: ConfigService) {
        const supabaseUrl = this.configService.get<string>('SUPABASE_URL');
        const supabaseServiceRoleKey = this.configService.get<string>('SUPABASE_SERVICE_ROLE_KEY');

        if (!supabaseUrl || !supabaseServiceRoleKey) {
            throw new Error('Supabase URL or Service Role Key is missing. Check environment variables.');
        }

        this.supabase = createClient(supabaseUrl, supabaseServiceRoleKey, {
            auth: {
                persistSession: false, // No session needed for backend
                autoRefreshToken: false,
            }
        });
    }

    async uploadFile(
        file: Express.Multer.File,
        pathPrefix: string,
        bucket: string = 'returns-disputes',
        profile: UploadProfile = 'default',
    ): Promise<string> {
        validateUploadedFile(file, profile);

        const fileExt = file.originalname.split('.').pop();
        const fileName = `${pathPrefix}/${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;

        // Upload using Service Role (Bypasses RLS)
        const { data, error } = await this.supabase.storage
            .from(bucket)
            .upload(fileName, file.buffer, {
                contentType: file.mimetype,
                upsert: false
            });

        if (error) {
            console.error('Supabase Upload Error:', error.message);
            throw new BadRequestException('Upload failed');
        }

        // Get Public URL
        const { data: publicUrlData } = this.supabase.storage
            .from(bucket)
            .getPublicUrl(fileName);

        return publicUrlData.publicUrl;
    }

    /** Field verification officer photos — returns public URL and storage path for DB row. */
    async uploadVerificationFieldPhoto(
        file: Express.Multer.File,
        taskId: string,
    ): Promise<{ url: string; storagePath: string }> {
        validateUploadedFile(file, 'verification');

        let ext = (file.originalname?.split('.').pop() || 'jpg').toLowerCase();
        if (!/^(jpe?g|png|webp|mp4|webm|mov)$/.test(ext)) {
            if (file.mimetype?.startsWith('video/')) {
                ext = file.mimetype.includes('webm')
                    ? 'webm'
                    : file.mimetype.includes('quicktime')
                      ? 'mov'
                      : 'mp4';
            } else {
                ext = file.mimetype?.includes('png')
                    ? 'png'
                    : file.mimetype?.includes('webp')
                      ? 'webp'
                      : 'jpg';
            }
        }

        const storagePath = `tasks/${taskId}/${Date.now()}_${Math.random().toString(36).substring(2, 10)}.${ext}`;

        const { error } = await this.supabase.storage
            .from(VERIFICATION_FIELD_PHOTOS_BUCKET)
            .upload(storagePath, file.buffer, {
                contentType:
                    file.mimetype ||
                    (ext === 'mp4' || ext === 'mov' || ext === 'webm'
                        ? `video/${ext === 'mov' ? 'quicktime' : ext}`
                        : `image/${ext}`),
                upsert: false,
            });

        if (error) {
            console.error('Supabase field photo upload:', error);
            throw new BadRequestException(`Upload failed: ${error.message}`);
        }

        const { data: urlData } = this.supabase.storage
            .from(VERIFICATION_FIELD_PHOTOS_BUCKET)
            .getPublicUrl(storagePath);

        return { url: urlData.publicUrl, storagePath };
    }

    /**
     * Generate a short-lived signed URL for a private-bucket object. Use this for sensitive
     * documents (KYC, verification, appeals) instead of permanent public URLs.
     */
    async createSignedUrl(bucket: string, path: string, expiresInSeconds = 300): Promise<string> {
        const { data, error } = await this.supabase.storage
            .from(bucket)
            .createSignedUrl(path, expiresInSeconds);

        if (error || !data?.signedUrl) {
            throw new BadRequestException('Could not create signed URL');
        }
        return data.signedUrl;
    }

    /** Signed upload URL so the client streams the file straight to storage. */
    async createSignedUpload(
        bucket: string,
        path: string,
    ): Promise<{ signedUrl: string; path: string; publicUrl: string }> {
        const { data, error } = await this.supabase.storage.from(bucket).createSignedUploadUrl(path);
        if (error || !data?.signedUrl) {
            console.error('Supabase signed upload error:', error?.message);
            throw new BadRequestException('Could not prepare upload');
        }
        const { data: publicUrlData } = this.supabase.storage.from(bucket).getPublicUrl(path);
        return { signedUrl: data.signedUrl, path: data.path, publicUrl: publicUrlData.publicUrl };
    }

    /** Verifies the uploaded object's magic bytes match its extension; deletes it otherwise. */
    async confirmUpload(bucket: string, path: string): Promise<string> {
        const ext = (path.split('.').pop() || '').toLowerCase();
        const expected = EXT_MIME[ext];
        if (!expected) throw new BadRequestException('File type not allowed');

        const { data: publicUrlData } = this.supabase.storage.from(bucket).getPublicUrl(path);
        const publicUrl = publicUrlData.publicUrl;

        const readHead = async (url: string): Promise<Response | null> => {
            try {
                const res = await fetch(url, {
                    headers: { Range: 'bytes=0-63' },
                    signal: AbortSignal.timeout(10_000),
                });
                return res.ok ? res : null;
            } catch {
                return null;
            }
        };

        let res = await readHead(publicUrl);
        if (!res) {
            const signed = await this.createSignedUrl(bucket, path, 60).catch(() => null);
            if (signed) res = await readHead(signed);
        }
        if (!res) throw new BadRequestException('Upload not found');

        const sniffed = sniffMime(Buffer.from(await res.arrayBuffer()));
        if (!sniffed || !(COMPATIBLE[sniffed] || []).includes(expected)) {
            await this.supabase.storage.from(bucket).remove([path]).catch(() => undefined);
            throw new BadRequestException('File content does not match its declared type');
        }
        return publicUrl;
    }

    async uploadPlatformAsset(
        file: Express.Multer.File,
        assetType: 'logo' | 'logo-dark' | 'earn-income-icon' | 'nomo-document',
    ): Promise<string> {
        const profile = assetType === 'nomo-document' ? 'verification' : 'platform-asset';
        validateUploadedFile(file, profile as any);

        const allowed = new Set(['logo', 'logo-dark', 'earn-income-icon', 'nomo-document']);
        const safeType = allowed.has(assetType) ? assetType : 'logo';
        const prefix = `platform-assets/${safeType}`;

        return this.uploadFile(file, prefix, PLATFORM_ASSETS_BUCKET, profile as any);
    }
}
