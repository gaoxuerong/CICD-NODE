import request from '@/utils/request'

export const auditLogApi = {
  getList(params?: any) {
    return request.get('/audit-logs', { params })
  },
}
