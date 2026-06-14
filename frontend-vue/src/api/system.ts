import request from '@/utils/request'

export const systemApi = {
  getSettings() {
    return request.get('/settings')
  },
  updateSettings(data: any) {
    return request.put('/settings', data)
  },
  testSmtp(data: any) {
    return request.post('/settings/test-smtp', data)
  },
}
