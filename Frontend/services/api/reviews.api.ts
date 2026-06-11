import { client } from './client';

export interface SubmitReviewPayload {
  orderId: string;
  storeId: string;
  rating: number;
  comment: string;
  offerId?: string;
}

export interface ReviewSubmitResult {
  id: string;
  orderId: string;
  storeId: string;
  rating: number;
  comment: string;
  adminStatus: string;
  createdAt: string;
}

export const reviewsApi = {
  submit: (payload: SubmitReviewPayload) =>
    client
      .post<ReviewSubmitResult>('/reviews', payload, { timeout: 12_000 })
      .then((r) => r.data),

  listImpactRules: () =>
    client.get('/reviews/impact-rules').then((r) => r.data),
};
