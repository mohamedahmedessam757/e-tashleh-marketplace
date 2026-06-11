
import { create } from 'zustand';
import { useOrderStore } from './useOrderStore';
import { useVendorStore } from './useVendorStore';
import { useResolutionStore } from './useResolutionStore';
import { useNotificationStore } from './useNotificationStore';
import { useAuditStore } from './useAuditStore';

interface AutomationState {
    isRunning: boolean;
    lastRun: string | null;
    logs: string[];
    startAutomation: () => void;
    stopAutomation: () => void;
    runOnce: () => void; // For manual triggering
}

let automationInterval: ReturnType<typeof setInterval> | null = null;

export const useSystemAutomation = create<AutomationState>((set, get) => ({
    isRunning: false,
    lastRun: null,
    logs: [],

    startAutomation: () => {
        if (get().isRunning) return;

        console.log("⚙️ System Automation Engine Started");
        set({ isRunning: true });

        // Run immediately then every 60 seconds (simulating cron jobs)
        get().runOnce();

        automationInterval = setInterval(() => {
            get().runOnce();
        }, 60000); // Check every minute for demo purposes
    },

    stopAutomation: () => {
        if (automationInterval) clearInterval(automationInterval);
        set({ isRunning: false });
        console.log("🛑 System Automation Engine Stopped");
    },

    runOnce: () => {
        const now = new Date();
        set({ lastRun: now.toISOString() });
        const logMsg = (msg: string) => set(s => ({ logs: [`[${now.toLocaleTimeString()}] ${msg}`, ...s.logs].slice(0, 50) }));

        const { orders, transitionOrder } = useOrderStore.getState();
        const { documents, vendorStatus, setVendorStatus } = useVendorStore.getState();
        const { cases } = useResolutionStore.getState();
        const { addNotification } = useNotificationStore.getState();
        const { logAction } = useAuditStore.getState();

        // 1. AUTO-CANCEL UNPAID ORDERS (> 24 Hours)
        // Rule: If status is AWAITING_PAYMENT and offerAcceptedAt > 24h
        orders.forEach(order => {
            if (order.status === 'AWAITING_PAYMENT' && order.offerAcceptedAt) {
                const acceptedTime = new Date(order.offerAcceptedAt).getTime();
                const diffHours = (now.getTime() - acceptedTime) / (1000 * 60 * 60);

                if (diffHours > 24) {
                    transitionOrder(order.id, 'CANCELLED', 'SYSTEM_BOT', { reason: 'Auto-cancel: Unpaid for 24h' });
                    logMsg(`Auto-cancelled Order #${order.id} (Unpaid > 24h)`);

                    addNotification({
                        type: 'system',
                        titleKey: 'adminAlert',
                        message: `System: Order #${order.id} cancelled due to non-payment.`,
                        linkTo: 'orders',
                        priority: 'normal'
                    });
                }
            }
        });

        // 2. ALERT DELAYED PREPARATION (> 48 Hours)
        // Rule: If status is PREPARATION and offerAcceptedAt > 48h (Assuming payment was immediate)
        orders.forEach(order => {
            if (order.status === 'PREPARATION' && order.offerAcceptedAt) {
                const acceptedTime = new Date(order.offerAcceptedAt).getTime();
                const diffHours = (now.getTime() - acceptedTime) / (1000 * 60 * 60);

                if (diffHours > 48) {
                    // Send alert to admin (simulated via console/notification)
                    // In a real app, check if we already alerted to avoid spam
                    logMsg(`Alert: Order #${order.id} stuck in preparation for ${diffHours.toFixed(1)}h`);
                }
            }
        });

        // 3. CHECK EXPIRED LICENSES
        // Rule: If license expiry date passed, change vendor status to LICENSE_EXPIRED
        if (documents.license.expiryDate && vendorStatus !== 'LICENSE_EXPIRED' && vendorStatus !== 'BLOCKED') {
            const expiry = new Date(documents.license.expiryDate).getTime();
            if (now.getTime() > expiry) {
                setVendorStatus('LICENSE_EXPIRED');
                logMsg(`CRITICAL: Merchant License Expired. Account Restricted.`);

                logAction({
                    action: 'STATUS_CHANGE',
                    entity: 'Vendor',
                    actorType: 'SYSTEM',
                    actorId: 'BOT',
                    actorName: 'License Bot',
                    newState: 'LICENSE_EXPIRED',
                    reason: 'Document Expiry Date Reached'
                });

                addNotification({
                    type: 'docExpiry',
                    titleKey: 'docExpiry',
                    message: 'CRITICAL: Your Municipality License has expired. Account functionality restricted.',
                    linkTo: 'docs',
                    priority: 'urgent',
                    channels: ['app', 'email']
                });
            }
        }

        // 4. ESCALATE STAGNANT DISPUTES (> 72 Hours)
        // Rule: If case status is AWAITING_MERCHANT and createdAt > 3 days
        cases.forEach(c => {
            if (c.status === 'AWAITING_MERCHANT') {
                const created = new Date(c.createdAt).getTime();
                const diffHours = (now.getTime() - created) / (1000 * 60 * 60);

                if (diffHours > 72) {
                    // Logic to update case status would go here (requires action in ResolutionStore)
                    logMsg(`Escalated Dispute #${c.id} to Admin (No Merchant Response > 72h)`);
                }
            }
        });
    }
}));
