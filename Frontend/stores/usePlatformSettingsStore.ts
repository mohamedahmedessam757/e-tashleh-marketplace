import { create } from 'zustand';
import { supabase } from '../services/supabase';
import { API_URL } from '../services/api/config';

// 2026: Robust boolean parser for Supabase jsonb values
// Handles: true, 'true', "true", 1, and their false equivalents
const parseBool = (val: any): boolean => {
    if (typeof val === 'boolean') return val;
    if (typeof val === 'string') return val.toLowerCase() === 'true';
    if (typeof val === 'number') return val !== 0;
    return false;
};

interface PlatformSettingsState {
    isAttachmentsEnabled: boolean;
    isAccountDeletionEnabled: boolean;
    isLoading: boolean;
    fetchSettings: () => Promise<void>;
    subscribeToSettings: () => () => void;
    setAttachmentsEnabled: (val: boolean) => void;
    setAccountDeletionEnabled: (val: boolean) => void;
}

/**
 * 2026 High-Performance Platform Settings Store
 * Manages global system toggles with Supabase Realtime synchronization.
 */
export const usePlatformSettingsStore = create<PlatformSettingsState>((set) => ({
    isAttachmentsEnabled: true, 
    isAccountDeletionEnabled: true, // Default to enabled
    isLoading: true,
    setAttachmentsEnabled: (val) => set({ isAttachmentsEnabled: val }),
    setAccountDeletionEnabled: (val) => set({ isAccountDeletionEnabled: val }),

    fetchSettings: async () => {
        try {
            const res = await fetch(`${API_URL}/system/feature-flags`);
            
            if (res.ok) {
                const data = await res.json();
                
                const attachVal = parseBool(data.CHAT_ATTACHMENTS_ENABLED);
                const delVal = parseBool(data.ALLOW_CUSTOMER_ACCOUNT_DELETION);

                console.log('[PlatformSettingsStore] Fetched via API → Attachments:', attachVal, '| Deletion:', delVal);

                set({ 
                    isAttachmentsEnabled: attachVal,
                    isAccountDeletionEnabled: delVal
                });
            } else {
                console.error('[PlatformSettingsStore] API returned error:', res.status);
            }
        } catch (err) {
            console.error('[PlatformSettingsStore] Fetch failed:', err);
        } finally {
            set({ isLoading: false });
        }
    },

    subscribeToSettings: () => {
        // 2026 Robust Real-time: Listen to all events to catch first-time INSERTs
        const channel = supabase
            .channel('platform_settings_realtime')
            .on(
                'postgres_changes',
                {
                    event: '*', // Listen to INSERT, UPDATE, and DELETE
                    schema: 'public',
                    table: 'platform_settings',
                },
                (payload) => {
                    const data = payload.new as any;
                    if (!data || !data.setting_key) return;

                    const { setting_key, setting_value } = data;
                    const boolValue = parseBool(setting_value);
                    
                    console.log(`[PlatformSettingsStore] Realtime → key: ${setting_key}, raw: ${setting_value} (${typeof setting_value}), parsed: ${boolValue}`);

                    if (setting_key === 'CHAT_ATTACHMENTS_ENABLED') {
                        set({ isAttachmentsEnabled: boolValue });
                    } else if (setting_key === 'ALLOW_CUSTOMER_ACCOUNT_DELETION') {
                        set({ isAccountDeletionEnabled: boolValue });
                    }
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    },
}));
