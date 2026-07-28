import { create } from 'zustand';
import { supabase } from '../services/supabase';
import { API_URL } from '../services/api/config';

// 2026: Robust boolean parser for Supabase jsonb values
// Handles: true, 'true', "true", 1, { value: true }, and their false equivalents
const parseBool = (val: any, defaultVal = false): boolean => {
    if (val === undefined || val === null) return defaultVal;
    if (typeof val === 'boolean') return val;
    if (typeof val === 'string') return val.toLowerCase() === 'true';
    if (typeof val === 'number') return val !== 0;
    if (val && typeof val === 'object' && 'value' in val) return parseBool(val.value, defaultVal);
    return defaultVal;
};

interface PlatformSettingsState {
    isAttachmentsEnabled: boolean;
    isAccountDeletionEnabled: boolean;
    isPreferencesStepEnabled: boolean;
    isLoading: boolean;
    fetchSettings: () => Promise<void>;
    subscribeToSettings: () => () => void;
    setAttachmentsEnabled: (val: boolean) => void;
    setAccountDeletionEnabled: (val: boolean) => void;
    setPreferencesStepEnabled: (val: boolean) => void;
}

/**
 * 2026 High-Performance Platform Settings Store
 * Manages global system toggles with Supabase Realtime synchronization.
 */
export const usePlatformSettingsStore = create<PlatformSettingsState>((set) => ({
    isAttachmentsEnabled: true,
    isAccountDeletionEnabled: true,
    isPreferencesStepEnabled: true,
    isLoading: true,
    setAttachmentsEnabled: (val) => set({ isAttachmentsEnabled: val }),
    setAccountDeletionEnabled: (val) => set({ isAccountDeletionEnabled: val }),
    setPreferencesStepEnabled: (val) => set({ isPreferencesStepEnabled: val }),

    fetchSettings: async () => {
        try {
            const res = await fetch(`${API_URL}/system/feature-flags`, { cache: 'no-store' });

            if (res.ok) {
                const data = await res.json();

                const attachVal = parseBool(data.CHAT_ATTACHMENTS_ENABLED, true);
                const delVal = parseBool(data.ALLOW_CUSTOMER_ACCOUNT_DELETION, true);
                const prefsVal = parseBool(data.ENABLE_PREFERENCES_STEP, true);

                set({
                    isAttachmentsEnabled: attachVal,
                    isAccountDeletionEnabled: delVal,
                    isPreferencesStepEnabled: prefsVal,
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
        const channel = supabase
            .channel('platform_settings_realtime')
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'platform_settings',
                },
                (payload) => {
                    const data = payload.new as any;
                    if (!data || !data.setting_key) return;

                    const { setting_key, setting_value } = data;

                    if (setting_key === 'CHAT_ATTACHMENTS_ENABLED') {
                        set({ isAttachmentsEnabled: parseBool(setting_value, true) });
                    } else if (setting_key === 'ALLOW_CUSTOMER_ACCOUNT_DELETION') {
                        set({ isAccountDeletionEnabled: parseBool(setting_value, true) });
                    } else if (setting_key === 'ENABLE_PREFERENCES_STEP') {
                        set({ isPreferencesStepEnabled: parseBool(setting_value, true) });
                    } else if (setting_key === 'system_config') {
                        void import('../stores/useAdminStore').then(({ useAdminStore }) => {
                            useAdminStore.getState().fetchPublicConfig();
                        });
                    }
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    },
}));
