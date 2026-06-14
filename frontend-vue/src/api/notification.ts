import request from '@/utils/request'

export const notificationApi = {
  getList(params?: any) {
    return request.get('/notifications', { params })
  },
  getUnreadCount() {
    return request.get('/notifications/unread-count')
  },
  markAsRead(id: number) {
    return request.put(`/notifications/${id}/read`)
  },
  markAllAsRead() {
    return request.put('/notifications/read-all')
  },
}
