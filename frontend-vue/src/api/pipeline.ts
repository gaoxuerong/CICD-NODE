import request from '@/utils/request'

export const pipelineApi = {
  getList(params?: any) {
    return request.get('/pipelines', { params })
  },
  getDetail(id: number) {
    return request.get(`/pipelines/${id}`)
  },
  create(data: any) {
    return request.post('/pipelines', data)
  },
  update(id: number, data: any) {
    return request.put(`/pipelines/${id}`, data)
  },
  delete(id: number) {
    return request.delete(`/pipelines/${id}`)
  },
  toggle(id: number, status: string) {
    return request.put(`/pipelines/${id}`, { status })
  },
}
