import request from '@/utils/request'

export const environmentApi = {
  getList(params?: any) {
    return request.get('/environments', { params })
  },
  getDetail(id: number) {
    return request.get(`/environments/${id}`)
  },
  create(data: any) {
    return request.post('/environments', data)
  },
  update(id: number, data: any) {
    return request.put(`/environments/${id}`, data)
  },
  delete(id: number) {
    return request.delete(`/environments/${id}`)
  },
}
