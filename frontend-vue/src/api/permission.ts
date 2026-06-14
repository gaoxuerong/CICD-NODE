import request from '@/utils/request'

export const permissionApi = {
  getList(params?: any) {
    return request.get('/permissions', { params })
  },
  getListGrouped(params?: any) {
    return request.get('/permissions/grouped', { params })
  },
  check(data: any) {
    return request.post('/permissions/check', data)
  },
}
