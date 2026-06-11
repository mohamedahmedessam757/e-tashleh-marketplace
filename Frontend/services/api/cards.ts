import { client } from './client';

export interface UserCard {
  id: string;
  last4: string;
  brand: string;
  expiryMonth: number;
  expiryYear: number;
  cardHolderName?: string;
  isDefault: boolean;
  stripePaymentMethodId?: string;
}

export const cardsApi = {
  getUserCards: async () => {
    const response = await client.get<UserCard[]>('/cards');
    return response.data;
  },
  
  addCard: async (data: Partial<UserCard>) => {
    const response = await client.post<UserCard>('/cards', data);
    return response.data;
  },

  deleteCard: async (id: string) => {
    await client.delete(`/cards/${id}`);
  },

  setDefault: async (id: string) => {
    await client.patch(`/cards/${id}/default`);
  },

  syncFromIntent: async (paymentIntentId: string) => {
    const response = await client.post<UserCard>('/cards/sync-intent', { paymentIntentId });
    return response.data;
  },
};
