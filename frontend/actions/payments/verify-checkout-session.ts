'use server';

import { serverTry } from '@/lib/api/server';

export const verifyCheckoutSession = async (sessionId: string) => {
  if (!sessionId) {
    return { error: 'Session not found' };
  }

  // Django verifies with Stripe and upserts the subscription/payment
  // (a fallback to the webhook).
  const res = await serverTry<{ success: boolean; alreadyExists?: boolean }>(
    '/api/billing/verify-session/',
    { query: { session_id: sessionId } },
  );

  if ('error' in res) {
    if (res.error.toLowerCase().includes('not authenticated')) return { error: 'Unauthorized' };
    return { error: res.error || 'Failed to verify checkout session' };
  }
  return { success: true, alreadyExists: res.data.alreadyExists };
};
