import { describe, it, expect } from '@jest/globals';
import {
  shouldLockChatOnCompletion,
  isOpenDisputeStatus,
  isOpenReturnStatus,
} from './chat-completion-lock.util';
import {
  isOfferPhaseOrderStatus,
  shouldKeepOrderChatOpen,
  shouldCloseOrderChat,
  CHAT_CLOSE_ORDER_STATUSES,
} from './chat-offer-expiry.util';

/** Mirror of Frontend/utils/orderChatLock.ts — keep in sync. */
const FE_ORDER_CHAT_CLOSED_STATUSES = [
  'CANCELLED',
  'COMPLETED',
  'WARRANTY_ACTIVE',
  'WARRANTY_EXPIRED',
] as const;

describe('shouldLockChatOnCompletion', () => {
  it('locks on COMPLETED', () => {
    expect(shouldLockChatOnCompletion({ orderStatus: 'COMPLETED' })).toEqual({
      shouldLock: true,
      reason: 'ORDER_COMPLETED',
    });
  });

  it('locks on WARRANTY_ACTIVE', () => {
    expect(shouldLockChatOnCompletion({ orderStatus: 'WARRANTY_ACTIVE' })).toEqual({
      shouldLock: true,
      reason: 'ORDER_COMPLETED',
    });
  });

  it('locks on CANCELLED', () => {
    expect(shouldLockChatOnCompletion({ orderStatus: 'CANCELLED' })).toEqual({
      shouldLock: true,
      reason: 'ORDER_COMPLETED',
    });
  });

  it('locks on WARRANTY_EXPIRED', () => {
    expect(shouldLockChatOnCompletion({ orderStatus: 'WARRANTY_EXPIRED' })).toEqual({
      shouldLock: true,
      reason: 'ORDER_COMPLETED',
    });
  });

  it('does not lock when order is DELIVERED (return window)', () => {
    expect(shouldLockChatOnCompletion({ orderStatus: 'DELIVERED' })).toEqual({
      shouldLock: false,
      reason: null,
    });
  });

  it('treats RESOLVED/CLOSED disputes as closed', () => {
    expect(isOpenDisputeStatus('RESOLVED')).toBe(false);
    expect(isOpenDisputeStatus('CLOSED')).toBe(false);
    expect(isOpenDisputeStatus('OPEN')).toBe(true);
  });

  it('treats terminal return statuses as closed', () => {
    expect(isOpenReturnStatus('CANCELLED')).toBe(false);
    expect(isOpenReturnStatus('REJECTED')).toBe(false);
    expect(isOpenReturnStatus('APPROVED')).toBe(true);
  });
});

describe('chat offer-phase expiry helpers', () => {
  it('marks bidding/selection as offer phase', () => {
    expect(isOfferPhaseOrderStatus('AWAITING_OFFERS')).toBe(true);
    expect(isOfferPhaseOrderStatus('COLLECTING_OFFERS')).toBe(true);
    expect(isOfferPhaseOrderStatus('AWAITING_SELECTION')).toBe(true);
    expect(isOfferPhaseOrderStatus('CANCELLED')).toBe(false);
    expect(isOfferPhaseOrderStatus('COMPLETED')).toBe(false);
  });

  it('does not keep chat open for cancelled/completed', () => {
    expect(shouldKeepOrderChatOpen('CANCELLED')).toBe(false);
    expect(shouldKeepOrderChatOpen('COMPLETED')).toBe(false);
    expect(shouldKeepOrderChatOpen('WARRANTY_ACTIVE')).toBe(false);
    expect(shouldKeepOrderChatOpen('AWAITING_OFFERS')).toBe(false);
  });

  it('closes chat for terminal statuses', () => {
    expect(shouldCloseOrderChat('CANCELLED')).toBe(true);
    expect(shouldCloseOrderChat('COMPLETED')).toBe(true);
    expect(shouldCloseOrderChat('WARRANTY_ACTIVE')).toBe(true);
    expect(shouldCloseOrderChat('WARRANTY_EXPIRED')).toBe(true);
    expect(shouldCloseOrderChat('DELIVERED')).toBe(false);
    expect(shouldCloseOrderChat('AWAITING_SELECTION')).toBe(false);
  });

  it('stays in parity with Frontend orderChatLock mirror list', () => {
    expect([...CHAT_CLOSE_ORDER_STATUSES].sort()).toEqual(
      [...FE_ORDER_CHAT_CLOSED_STATUSES].sort(),
    );
  });
});
