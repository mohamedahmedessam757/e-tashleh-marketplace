import React, { useEffect, useRef } from 'react';
import { useProfileStore } from '../../../stores/useProfileStore';
import { useAdminStore } from '../../../stores/useAdminStore';
import { AccountAccessBanner } from '../shared/AccountAccessBanner';

interface AccountAccessGuardProps {
  children: React.ReactNode;
  audience?: 'customer' | 'admin';
}

/**
 * Full-screen access banner for suspended/blocked users.
 * Keeps the session alive; does not force logout.
 */
export const AccountAccessGuard: React.FC<AccountAccessGuardProps> = ({
  children,
  audience = 'customer',
}) => {
  const user = useProfileStore((s) => s.user);
  const currentAdmin = useAdminStore((s) => s.currentAdmin);
  const fetchProfile = useProfileStore((s) => s.fetchProfile);
  const subscribeToProfile = useProfileStore((s) => s.subscribeToProfile);
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    void fetchProfile();
    const unsub = subscribeToProfile();
    const poll = window.setInterval(() => {
      void useProfileStore.getState().fetchProfile();
    }, 12_000);
    return () => {
      unsub?.();
      window.clearInterval(poll);
    };
  }, [fetchProfile, subscribeToProfile]);

  const source =
    audience === 'admin'
      ? {
          status: currentAdmin?.status || user?.status,
          reason: currentAdmin?.suspendReason || user?.suspendReason,
          until: currentAdmin?.suspendedUntil || user?.suspendedUntil,
          blocked:
            currentAdmin?.accountAccessBlocked === true ||
            currentAdmin?.adminInactive === true ||
            user?.accountAccessBlocked === true ||
            user?.adminInactive === true,
        }
      : {
          status: user?.status,
          reason: user?.suspendReason,
          until: user?.suspendedUntil,
          blocked: user?.accountAccessBlocked === true,
        };

  const status = (source.status || '').toUpperCase();
  const blocked =
    source.blocked || status === 'SUSPENDED' || status === 'BLOCKED';

  if (!blocked) {
    return <>{children}</>;
  }

  const resolvedKind =
    status === 'SUSPENDED' && source.until
      ? 'TEMPORARY'
      : status === 'BLOCKED'
        ? 'PERMANENT'
        : 'TEMPORARY';

  return (
    <AccountAccessBanner
      kind={resolvedKind}
      reason={source.reason}
      suspendedUntil={source.until}
      audience={audience}
      lockInteraction
    >
      {children}
    </AccountAccessBanner>
  );
};
