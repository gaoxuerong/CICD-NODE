const TOKEN_KEY = 'cicd_token'
const REFRESH_TOKEN_KEY = 'cicd_refresh_token'
const PERMISSIONS_KEY = 'cicd_permissions'
const USER_INFO_KEY = 'cicd_user_info'

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY)
}

export function setToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token)
}

export function getRefreshToken(): string | null {
  return localStorage.getItem(REFRESH_TOKEN_KEY)
}

export function setRefreshToken(token: string): void {
  localStorage.setItem(REFRESH_TOKEN_KEY, token)
}

export function removeToken(): void {
  localStorage.removeItem(TOKEN_KEY)
  localStorage.removeItem(REFRESH_TOKEN_KEY)
}

export function getPermissions(): string[] {
  const stored = localStorage.getItem(PERMISSIONS_KEY)
  return stored ? JSON.parse(stored) : []
}

export function setPermissions(permissions: string[]): void {
  localStorage.setItem(PERMISSIONS_KEY, JSON.stringify(permissions))
}

export function getUserInfo() {
  const stored = localStorage.getItem(USER_INFO_KEY)
  if (!stored || stored === 'undefined') return null
  return JSON.parse(stored)
}

export function setUserInfo(userInfo: any): void {
  localStorage.setItem(USER_INFO_KEY, JSON.stringify(userInfo))
}

export function clearStorage(): void {
  localStorage.removeItem(TOKEN_KEY)
  localStorage.removeItem(REFRESH_TOKEN_KEY)
  localStorage.removeItem(PERMISSIONS_KEY)
  localStorage.removeItem(USER_INFO_KEY)
}
