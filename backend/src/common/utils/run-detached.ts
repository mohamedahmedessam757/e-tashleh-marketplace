import { Logger } from '@nestjs/common';

const logger = new Logger('Detached');

/**
 * Runs side-effects (notifications / WhatsApp) after the HTTP response is sent.
 * Failures are logged, never thrown. The work still completes in-process, so
 * awaited WhatsApp dispatch inside NotificationsService is preserved.
 */
export function runDetached(label: string, fn: () => Promise<unknown>): void {
    setImmediate(() => {
        fn().catch((err) => {
            logger.error(`${label} failed: ${err instanceof Error ? err.message : String(err)}`);
        });
    });
}
