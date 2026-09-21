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
    }, 10_000);
    return () => {
      unsub?.();
      window.clearInterval(poll);
    };
  }, [fetchProfile, subscribeToProfile]);

  // Keep admin session mirror in sync with live profile (ban / unban realtime).
  useEffect(() => {
    if (audience !== 'admin' || !user) return;
    const admin = useAdminStore.getState().currentAdmin;
    if (!admin || admin.id !== user.id) return;
    const nextBlocked = Boolean(
      user.accountAccessBlocked ||
        user.adminInactive ||
        user.status === 'SUSPENDED' ||
        user.status === 'BLOCKED',
    );
    if (
      admin.status === user.status &&
      admin.accountAccessBlocked === nextBlocked &&
      admin.suspendReason === user.suspendReason &&
      admin.suspendedUntil === user.suspendedUntil
    ) {
      return;
    }
    useAdminStore.setState({
      currentAdmin: {
        ...admin,
        status: user.status,
        suspendReason: user.suspendReason,
        suspendedUntil: user.suspendedUntil,
        accountAccessBlocked: nextBlocked,
        adminInactive: user.adminInactive,
      },
    });
  }, [
    audience,
    user?.id,
    user?.status,
    user?.suspendReason,
    user?.suspendedUntil,
    user?.accountAccessBlocked,
    user?.adminInactive,
  ]);

  const source =
    audience === 'admin'
      ? {
          status: user?.status || currentAdmin?.status,
          reason: user?.suspendReason || currentAdmin?.suspendReason,
          until: user?.suspendedUntil || currentAdmin?.suspendedUntil,
          blocked:
            user?.accountAccessBlocked === true ||
            user?.adminInactive === true ||
            currentAdmin?.accountAccessBlocked === true ||
            currentAdmin?.adminInactive === true,
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
    status === 'BLOCKED'
      ? 'PERMANENT'
      : status === 'SUSPENDED' && source.until
        ? 'TEMPORARY'
        : status === 'SUSPENDED'
          ? 'TEMPORARY'
          : 'PERMANENT';

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
