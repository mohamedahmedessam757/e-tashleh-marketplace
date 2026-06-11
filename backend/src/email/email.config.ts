import { existsSync, readFileSync } from 'fs';
import { join } from 'path';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export const EMAIL_LOGO_CID = 'brand-logo';

@Injectable()
export class EmailConfig {
    readonly enabled: boolean;
    readonly apiKey: string | undefined;
    readonly fromEmail: string;
    readonly siteUrl: string;
    readonly logoUrl: string;
    readonly useEmbeddedLogo: boolean;
    readonly embeddedLogoBuffer: Buffer | null;

    constructor(private readonly config: ConfigService) {
        this.enabled = this.config.get<string>('RESEND_ENABLED') === 'true';
        this.apiKey = this.config.get<string>('RESEND_API_KEY')?.trim();
        this.fromEmail =
            this.config.get<string>('RESEND_FROM_EMAIL')?.trim() ||
            'E-Tshaleh <noreply@e-tashleh.net>';

        const configuredSite =
            this.config.get<string>('RESEND_SITE_URL')?.trim() ||
            this.config.get<string>('FRONTEND_URL')?.trim()?.replace(/\/$/, '');
        const isLocal =
            !configuredSite ||
            configuredSite.includes('localhost') ||
            configuredSite.includes('127.0.0.1');
        this.siteUrl = isLocal
            ? 'https://e-tashleh.net'
            : configuredSite.replace(/^["']|["']$/g, '');

        this.embeddedLogoBuffer = loadEmbeddedLogo();
        const externalLogo = this.config.get<string>('RESEND_LOGO_URL')?.trim();
        if (externalLogo) {
            this.logoUrl = externalLogo;
            this.useEmbeddedLogo = false;
        } else if (this.embeddedLogoBuffer) {
            this.logoUrl = `cid:${EMAIL_LOGO_CID}`;
            this.useEmbeddedLogo = true;
        } else {
            this.logoUrl = `${this.siteUrl}/logo.png`;
            this.useEmbeddedLogo = false;
        }
    }

    isConfigured(): boolean {
        return Boolean(this.apiKey);
    }
}

function loadEmbeddedLogo(): Buffer | null {
    const candidates = [
        join(process.cwd(), 'assets', 'logo-email.png'),
        join(process.cwd(), 'dist', 'assets', 'logo-email.png'),
        join(__dirname, '..', '..', 'assets', 'logo-email.png'),
    ];
    for (const filePath of candidates) {
        if (existsSync(filePath)) {
            return readFileSync(filePath);
        }
    }
    return null;
}
