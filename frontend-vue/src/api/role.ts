import request from '@/utils/request'

export const roleApi = {
  getList(params?: any) {
    return request.get('/roles', { params })
  },
  getDetail(id: number) {
    return request.get(`/roles/${id}`)
  },
  update(id: number, data: any) {
    return request.put(`/roles/${id}`, data)
  },
  delete(id: number) {
    return request.delete(`/roles/${id}`)
  },
}
