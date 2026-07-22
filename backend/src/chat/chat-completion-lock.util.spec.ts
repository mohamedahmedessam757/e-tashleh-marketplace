import { describe, it, expect } from '@jest/globals';
import {
  shouldLockChatOnCompletion,
  isOpenDisputeStatus,
  isOpenReturnStatus,
} from './chat-completion-lock.util';

describe('shouldLockChatOnCompletion', () => {
  it('locks when COMPLETED with no disputes/returns', () => {
    expect(
      shouldLockChatOnCompletion({
        orderStatus: 'COMPLETED',
        disputeStatuses: [],
        returnStatuses: [],
      }),
    ).toEqual({ shouldLock: true, reason: 'ORDER_COMPLETED' });
  });

  it('locks when WARRANTY_ACTIVE (completion with warranty)', () => {
    expect(
      shouldLockChatOnCompletion({
        orderStatus: 'WARRANTY_ACTIVE',
        disputeStatuses: ['RESOLVED'],
        returnStatuses: ['CLOSED'],
      }),
    ).toEqual({ shouldLock: true, reason: 'ORDER_COMPLETED' });
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

  it('does not lock when an open dispute exists', () => {
    expect(
      shouldLockChatOnCompletion({
        orderStatus: 'COMPLETED',
        disputeStatuses: ['OPEN'],
        returnStatuses: [],
      }),
    ).toEqual({ shouldLock: false, reason: null });
  });

  it('does not lock when an open return exists', () => {
    expect(
      shouldLockChatOnCompletion({
        orderStatus: 'COMPLETED',
        disputeStatuses: [],
        returnStatuses: ['PENDING'],
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
