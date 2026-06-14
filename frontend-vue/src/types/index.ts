export interface ApiResponse<T = any> {
  code: number
  data: T
  message: string
}

export interface UserInfo {
  id?: number
  username: string
  nickname?: string
  email?: string
  avatar?: string
  role?: string
  permissions?: string[]
}

export interface TokenData {
  token: string
  refreshToken: string
}

export interface LoginPayload {
  username: string
  password: string
}

export interface LoginResult extends TokenData {
  userInfo: UserInfo
}

export interface Project {
  id: number
  name: string
  description?: string
  repositoryUrl?: string
  defaultBranch?: string
  status?: string
  createdAt?: string
  updatedAt?: string
}

export interface Pipeline {
  id: number
  projectId: number
  name: string
  description?: string
  status?: string
  config?: any
  createdAt?: string
  updatedAt?: string
}

export interface Build {
  id: number
  buildNumber: number
  projectId: number
  pipelineId: number
  pipelineName?: string
  projectName?: string
  status: string
  branch?: string
  commitSha?: string
  commitMessage?: string
  duration?: number
  startedAt?: string
  finishedAt?: string
}

export interface Environment {
  id: number
  name: string
  type?: string
  description?: string
  variables?: Record<string, string>
  createdAt?: string
}

export interface Notification {
  id: number
  title: string
  content?: string
  type?: string
  read?: boolean
  createdAt?: string
}

export interface Role {
  id?: number
  roleCode: string
  roleName: string
  description?: string
  permissions?: string[]
}

export interface Permission {
  id?: number
  code: string
  name: string
  description?: string
  group?: string
}

export interface GitCredential {
  id: number
  name: string
  type?: string
  username?: string
  url?: string
  createdAt?: string
}

export interface AuditLog {
  id: number
  userId?: number
  username?: string
  action: string
  resource?: string
  resourceId?: number
  details?: string
  ip?: string
  createdAt?: string
}
