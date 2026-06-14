import request from '@/utils/request'

export const authApi = {
  login(data: { username: string; password: string }) {
    return request.post('/auth/login', data)
  },
  register(data: any) {
    return request.post('/auth/register', data)
  },
  getProfile() {
    return request.get('/auth/profile')
  },
  updateProfile(data: any) {
    return request.put('/auth/profile', data)
  },
  logout() {
    return request.post('/auth/logout')
  },
}
