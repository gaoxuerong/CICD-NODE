import request from '@/utils/request'

export const userApi = {
  getPermissions() {
    return request.get('/users/permissions')
  },
  getList(params?: any) {
    return request.get('/users', { params })
  },
  getDetail(id: number) {
    return request.get(`/users/${id}`)
  },
  create(data: any) {
    return request.post('/users', data)
  },
  update(id: number, data: any) {
    return request.put(`/users/${id}`, data)
  },
  delete(id: number) {
    return request.delete(`/users/${id}`)
  },
  resetPassword(id: number, data: any) {
    return request.post(`/users/${id}/reset-password`, data)
  },
}
