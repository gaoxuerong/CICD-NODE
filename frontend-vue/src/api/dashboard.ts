import request from '@/utils/request'

export const dashboardApi = {
  getStats() {
    return request.get('/dashboard/stats')
  },
  getRecentBuilds(params?: { page?: number; pageSize?: number }) {
    return request.get('/dashboard/recent-builds', { params })
  },
  getRecentProjects(params?: { page?: number; pageSize?: number }) {
    return request.get('/dashboard/recent-projects', { params })
  },
}
