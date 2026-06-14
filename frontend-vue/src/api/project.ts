import request from '@/utils/request'

export const projectApi = {
  getList(params?: any) {
    return request.get('/projects', { params })
  },
  getDetail(id: number) {
    return request.get(`/projects/${id}`)
  },
  create(data: any) {
    return request.post('/projects', data)
  },
  update(id: number, data: any) {
    return request.put(`/projects/${id}`, data)
  },
  delete(id: number) {
    return request.delete(`/projects/${id}`)
  },
  getMembers(projectId: number) {
    return request.get(`/projects/${projectId}/members`)
  },
  addMember(projectId: number, data: any) {
    return request.post(`/projects/${projectId}/members`, data)
  },
  batchAddMembers(projectId: number, members: any[]) {
    return request.post(`/projects/${projectId}/members/batch`, { members })
  },
  updateMember(projectId: number, userId: number, data: any) {
    return request.put(`/projects/${projectId}/members/${userId}`, data)
  },
  removeMember(projectId: number, userId: number) {
    return request.delete(`/projects/${projectId}/members/${userId}`)
  },
  transferOwnership(projectId: number, data: any) {
    return request.post(`/projects/${projectId}/transfer-ownership`, data)
  },
}
