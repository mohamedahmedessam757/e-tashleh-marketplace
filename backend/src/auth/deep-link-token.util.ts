import { createHmac, randomBytes, timingSafeEqual } from 'crypto';

export type DeepLinkAudienceRole = 'CUSTOMER' | 'VENDOR';

export interface DeepLinkTokenPayload {
    sub: string;
    role: DeepLinkAudienceRole;
    orderId: string;
    path: string;
    search?: string;
    exp: number;
    jti: string;
}

export function signDeepLinkToken(
    secret: string,
    params: {
        userId: string;
        role: DeepLinkAudienceRole;
        orderId: string;
        path: string;
        search?: string;
        ttlHours?: number;
    },
): string {
    const ttlHours = params.ttlHours ?? 72;
    const exp = Math.floor(Date.now() / 1000) + ttlHours * 3600;
    const payload: DeepLinkTokenPayload = {
        sub: params.userId,
        role: params.role,
        orderId: params.orderId,
        path: params.path,
        search: params.search,
        exp,
        jti: randomBytes(16).toString('hex'),
    };
    const payloadB64 = Buffer.from(JSON.stringify(payload)).toString('base64url');
    const sig = createHmac('sha256', secret).update(payloadB64).digest('base64url');
    return `${payloadB64}.${sig}`;
}

export function verifyDeepLinkToken(secret: string, token: string): DeepLinkTokenPayload {
    const parts = token.split('.');
    if (parts.length !== 2) {
        throw new Error('Invalid deep link token');
    }
    const [payloadB64, sig] = parts;
    const expected = createHmac('sha256', secret).update(payloadB64).digest('base64url');
    const sigBuf = Buffer.from(sig);
    const expectedBuf = Buffer.from(expected);
    if (sigBuf.length !== expectedBuf.length || !timingSafeEqual(sigBuf, expectedBuf)) {
        throw new Error('Invalid deep link token');
    }

    let payload: DeepLinkTokenPayload;
    try {
        payload = JSON.parse(Buffer.from(payloadB64, 'base64url').toString('utf8')) as DeepLinkTokenPayload;
    } catch {
        throw new Error('Invalid deep link token');
    }

    if (!payload.sub || !payload.orderId || !payload.path || !payload.role) {
        throw new Error('Invalid deep link token');
    }
    if (typeof payload.exp !== 'number' || payload.exp <= Math.floor(Date.now() / 1000)) {
        throw new Error('Deep link token expired');
    }
    return payload;
}

export function appendDeepLinkParam(baseUrl: string, dl: string): string {
    const encoded = encodeURIComponent(dl);
    return baseUrl.includes('?') ? `${baseUrl}&dl=${encoded}` : `${baseUrl}?dl=${encoded}`;
}
