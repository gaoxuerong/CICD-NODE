import request from '@/utils/request'

export const dashboardApi = {
  getStats() {
    return request.get('/dashboard/stats')
  },
}
