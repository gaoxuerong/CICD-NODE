import request from '@/utils/request'

export const buildApi = {
  getList(params?: any) {
    return request.get('/builds', { params })
  },
  getDetail(id: number) {
    return request.get(`/builds/${id}`)
  },
  trigger(data: any) {
    return request.post('/builds', data)
  },
  cancel(id: number) {
    return request.post(`/builds/${id}/cancel`)
  },
  retry(id: number) {
    return request.post(`/builds/${id}/retry`)
  },
  getLogs(id: number) {
    return request.get(`/builds/${id}/logs`)
  },
}
