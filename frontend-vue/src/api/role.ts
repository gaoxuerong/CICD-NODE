import request from '@/utils/request'

export const roleApi = {
  getList(params?: any) {
    return request.get('/roles', { params })
  },
  getDetail(roleCode: string) {
    return request.get(`/roles/${roleCode}`)
  },
  updatePermissions(roleCode: string, permissions: any) {
    return request.put(`/roles/${roleCode}/permissions`, permissions)
  },
  delete(roleCode: string) {
    return request.delete(`/roles/${roleCode}`)
  },
}
