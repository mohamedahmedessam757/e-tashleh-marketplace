import { client } from './client';

export const notificationsApi = {
  list: () => client.get<unknown[]>('/notifications').then((r) => r.data),
  unreadCount: () => client.get<number>('/notifications/unread-count').then((r) => r.data),
  markRead: (id: string) => client.patch(`/notifications/${id}/read`),
  markAllRead: () => client.patch('/notifications/read-all'),
};
