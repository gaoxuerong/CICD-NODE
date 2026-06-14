import { defineStore } from 'pinia'
import { ref } from 'vue'
import { authApi } from '@/api/auth'
import { userApi } from '@/api/user'
import {
  getToken,
  setToken,
  setRefreshToken,
  getRefreshToken,
  removeToken,
  getPermissions,
  setPermissions,
  getUserInfo,
  setUserInfo,
  clearStorage,
} from '@/utils/storage'
import type { UserInfo } from '@/types'

export const useUserStore = defineStore('user', () => {
  const token = ref<string | null>(getToken())
  const userInfo = ref<UserInfo | null>(getUserInfo())
  const permissions = ref<string[]>(getPermissions())

  async function login(username: string, password: string) {
    const res = await authApi.login({ username, password })
    if (res.data.code === 0) {
      const { token: newToken, refreshToken, userInfo: info } = res.data.data
      token.value = newToken
      setToken(newToken)
      setRefreshToken(refreshToken)
      userInfo.value = info
      setUserInfo(info)

      try {
        const permRes = await userApi.getPermissions()
        if (permRes.data.code === 0) {
          permissions.value = permRes.data.data?.permissions || permRes.data.data || []
          setPermissions(permissions.value)
        }
      } catch {
        permissions.value = []
      }

      return true
    }
    return false
  }

  async function fetchUserInfo() {
    try {
      const [profileRes, permRes] = await Promise.all([
        authApi.getProfile(),
        userApi.getPermissions(),
      ])
      if (profileRes.data.code === 0) {
        userInfo.value = profileRes.data.data
        setUserInfo(profileRes.data.data)
      }
      if (permRes.data.code === 0) {
        permissions.value = permRes.data.data?.permissions || permRes.data.data || []
        setPermissions(permissions.value)
      }
    } catch {
      // ignore
    }
  }

  async function logout() {
    try {
      await authApi.logout()
    } catch {
      // ignore
    }
    token.value = null
    userInfo.value = null
    permissions.value = []
    clearStorage()
    window.location.href = '/login'
  }

  function hasPermission(_permission: string): boolean {
    if (!permissions.value || permissions.value.length === 0) return false
    if (permissions.value.includes('*')) return true
    return permissions.value.includes(_permission)
  }

  return {
    token,
    userInfo,
    permissions,
    login,
    fetchUserInfo,
    logout,
    hasPermission,
  }
})
