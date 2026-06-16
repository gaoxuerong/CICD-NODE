# CI/CD Platform Backend

Node.js 后端服务，提供 CI/CD 平台的 API 接口。

## 技术栈

| 技术 | 用途 |
|------|------|
| Express | Web 框架 |
| TypeScript | 类型安全 |
| Sequelize | ORM（MySQL） |
| Zod | 请求参数校验 |
| JWT | 认证鉴权 |
| WebSocket | 实时通知 |

## 目录结构

```
backend-node/
├── src/
│   ├── app.ts              # Express 应用配置，挂载所有路由
│   ├── server.ts           # 启动入口，监听端口
│   ├── config.ts           # 环境变量配置
│   ├── common/             # 公共模块
│   │   ├── auth.ts         # JWT 生成/验证/黑名单
│   │   ├── auth-middleware.ts # 认证中间件
│   │   ├── crypto.ts       # 加密工具
│   │   ├── rate-limiter.ts # 登录限流
│   │   ├── response.ts     # 统一响应格式
│   │   └── types.ts        # 公共类型定义
│   ├── db/                 # 数据库相关
│   │   ├── sequelize.ts    # 数据库连接配置
│   │   ├── migrate.ts      # 数据库迁移脚本
│   │   ├── seed.ts         # 初始数据填充
│   │   └── models/         # 数据模型
│   │       ├── index.ts        # 模型导出
│   │       ├── user.ts         # 用户
│   │       ├── role.ts         # 角色
│   │       ├── permission.ts   # 权限
│   │       ├── project.ts      # 项目
│   │       ├── pipeline.ts     # 流水线
│   │       ├── build.ts        # 构建记录
│   │       ├── environment.ts  # 环境
│   │       ├── notification.ts # 通知
│   │       ├── audit-log.ts    # 审计日志
│   │       ├── git-credential.ts # Git 凭证
│   │       ├── project-member.ts # 项目成员
│   │       ├── invite-code.ts    # 邀请码
│   │       ├── token-blacklist.ts # Token 黑名单
│   │       └── system-setting.ts  # 系统设置
│   └── modules/            # 业务模块
│       ├── auth/           # 认证模块
│       │   └── routes.ts       # 登录/注册/刷新Token
│       ├── users/          # 用户管理
│       │   └── routes.ts       # CRUD + 分页查询
│       ├── roles/          # 角色管理
│       │   └── routes.ts       # CRUD + 权限分配
│       ├── permissions/    # 权限管理
│       │   └── routes.ts       # 权限列表/树形结构
│       ├── projects/       # 项目管理
│       │   └── routes.ts       # 项目 CRUD + 成员管理
│       ├── pipelines/      # 流水线
│       │   └── routes.ts       # 流水线配置/执行
│       ├── builds/         # 构建管理
│       │   └── routes.ts       # 构建记录/日志
│       ├── environments/   # 环境管理
│       │   └── routes.ts       # 多环境配置
│       ├── notifications/  # 通知模块
│       │   └── routes.ts       # 通知查询/已读
│       ├── dashboard/      # 仪表盘
│       │   └── routes.ts       # 统计数据聚合
│       ├── audit-logs/     # 审计日志
│       │   └── routes.ts       # 操作日志查询
│       ├── git-credentials/ # Git 凭证
│       │   └── routes.ts       # 凭证 CRUD
│       ├── settings/       # 系统设置
│       │   └── routes.ts       # 全局配置
│       └── health/         # 健康检查
│           └── routes.ts       # GET /api/health
├── dist/                   # 编译输出
├── .env                    # 环境变量（不提交）
├── .env.example            # 环境变量模板
├── package.json
└── tsconfig.json
```

## 模块作用

| 模块 | API 前缀 | 功能 |
|------|----------|------|
| auth | `/api/auth` | 登录、登出、刷新 Token、获取用户信息 |
| users | `/api/users` | 用户增删改查、分页、状态管理 |
| roles | `/api/roles` | 角色管理、权限分配 |
| permissions | `/api/permissions` | 权限列表、树形结构 |
| projects | `/api/projects` | 项目管理、成员管理 |
| pipelines | `/api/pipelines` | CI/CD 流水线配置与执行 |
| builds | `/api/builds` | 构建记录、日志查看 |
| environments | `/api/environments` | 多环境（dev/staging/prod）配置 |
| notifications | `/api/notifications` | 系统通知、操作通知 |
| dashboard | `/api/dashboard` | 统计数据聚合展示 |
| audit-logs | `/api/audit-logs` | 操作审计日志 |
| git-credentials | `/api/git-credentials` | Git 仓库凭证管理 |
| settings | `/api/settings` | 全局系统设置 |
| health | `/api/health` | 服务健康检查 |

## 数据模型关系

```
User (用户)
  ├── belongs to Role (角色)
  └── belongs to many Project (项目) via ProjectMember

Role (角色)
  └── has many Permission (权限) [JSON 字段]

Project (项目)
  ├── has many Pipeline (流水线)
  ├── has many Environment (环境)
  └── has many ProjectMember (成员)

Pipeline (流水线)
  └── has many Build (构建记录)

Build (构建记录)
  └── belongs to Pipeline
```

## API 文档

启动服务后访问：http://localhost:3000/api-docs

- Swagger UI 提供交互式 API 文档
- JSON 格式文档：http://localhost:3000/api-docs.json

### Swagger 文档模块

| 模块 | 接口数 |
|------|--------|
| Auth | 5 |
| Users | 7 |
| Projects | 8 |
| Roles | 5 |
| Permissions | 4 |
| Pipelines | 5 |
| Builds | 6 |
| Environments | 5 |
| Notifications | 6 |
| Dashboard | 3 |
| AuditLogs | 2 |
| GitCredentials | 6 |
| Settings | 5 |
| Health | 1 |
| **合计** | **68** |

## 快速开始

### 1. 安装依赖

```bash
npm install
```

### 2. 配置环境变量

```bash
cp .env.example .env
# 编辑 .env，填入数据库连接信息
```

### 3. 初始化数据库

```bash
npm run migrate   # 创建表结构
npm run seed      # 填充初始数据（管理员账号等）
```

### 4. 启动开发服务

```bash
npm run dev       # 开发模式（热重载）
```

### 5. 构建部署

```bash
npm run build     # 编译 TypeScript
npm start         # 启动生产服务
```

## 常用命令

| 命令 | 说明 |
|------|------|
| `npm run dev` | 开发模式启动（热重载） |
| `npm run build` | 编译 TypeScript |
| `npm start` | 启动生产服务 |
| `npm run migrate` | 执行数据库迁移 |
| `npm run seed` | 填充初始数据 |
| `npm run lint` | TypeScript 类型检查 |

## 项目特点

1. **模块化架构**：每个业务模块独立目录，职责清晰
2. **统一响应格式**：`ok()` / `fail()` / `message()` 封装
3. **参数校验**：Zod 验证所有请求输入
4. **认证鉴权**：JWT + 权限中间件
5. **审计日志**：关键操作自动记录
