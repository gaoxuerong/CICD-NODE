import request from '@/utils/request'

export const gitCredentialApi = {
  getList(params?: any) {
    return request.get('/git-credentials', { params })
  },
  getDetail(id: number) {
    return request.get(`/git-credentials/${id}`)
  },
  create(data: any) {
    return request.post('/git-credentials', data)
  },
  update(id: number, data: any) {
    return request.put(`/git-credentials/${id}`, data)
  },
  delete(id: number) {
    return request.delete(`/git-credentials/${id}`)
  },
}
