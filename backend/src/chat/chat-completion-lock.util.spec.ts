import { describe, it, expect } from '@jest/globals';
import {
  shouldLockChatOnCompletion,
  isOpenDisputeStatus,
  isOpenReturnStatus,
} from './chat-completion-lock.util';
import {
  isOfferPhaseOrderStatus,
  shouldKeepOrderChatOpen,
} from './chat-offer-expiry.util';

describe('shouldLockChatOnCompletion', () => {
  it('never auto-locks on COMPLETED (chat stays open)', () => {
    expect(
      shouldLockChatOnCompletion({
        orderStatus: 'COMPLETED',
        disputeStatuses: [],
        returnStatuses: [],
      }),
    ).toEqual({ shouldLock: false, reason: null });
  });

  it('never auto-locks on WARRANTY_ACTIVE', () => {
    expect(
      shouldLockChatOnCompletion({
        orderStatus: 'WARRANTY_ACTIVE',
        disputeStatuses: ['RESOLVED'],
        returnStatuses: ['CLOSED'],
      }),
    ).toEqual({ shouldLock: false, reason: null });
  });

  it('does not lock when order is not completed', () => {
    expect(
      shouldLockChatOnCompletion({
        orderStatus: 'DELIVERED',
        disputeStatuses: [],
        returnStatuses: [],
      }),
    ).toEqual({ shouldLock: false, reason: null });
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

  it('keeps chat open for cancelled/completed', () => {
    expect(shouldKeepOrderChatOpen('CANCELLED')).toBe(true);
    expect(shouldKeepOrderChatOpen('COMPLETED')).toBe(true);
    expect(shouldKeepOrderChatOpen('WARRANTY_ACTIVE')).toBe(true);
    expect(shouldKeepOrderChatOpen('AWAITING_OFFERS')).toBe(false);
  });
});
