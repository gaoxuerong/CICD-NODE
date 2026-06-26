import request from '@/utils/request'

export const systemApi = {
  getSettings() {
    return request.get('/settings', {
      params: { _t: Date.now() },
      headers: { 'Cache-Control': 'no-cache' },
    })
  },
  updateSettings(data: any) {
    return request.put('/settings', { settings: data })
  },
  updateSetting(key: string, value: any) {
    return request.put(`/settings/${key}`, { value })
  },
  sendTestEmail() {
    return request.post('/settings/test-email')
  },
  resetSetting(key: string) {
    return request.delete(`/settings/${key}`)
  },
}
