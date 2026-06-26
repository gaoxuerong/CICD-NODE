# CI/CD 管理平台

这是一个基于 Docker Compose 运行的 CI/CD 管理平台，用来统一管理项目、流水线、构建记录、环境、用户权限、系统配置、通知和监控日志。当前构建执行侧主要接入 GitHub Actions：平台负责触发构建、保存构建记录、同步构建状态和展示结果，实际构建任务由 GitHub Actions 执行。

## 核心功能

- **认证与权限**：支持用户登录、JWT access token / refresh token、退出登录 token 黑名单、平台角色权限和项目级成员权限。
- **项目管理**：支持项目创建、编辑、归档、删除、项目成员管理、项目 owner / maintainer / developer 角色控制。
- **Git 凭据管理**：支持维护 GitHub Token 等 Git 凭据，并将凭据绑定到项目；敏感凭据加密存储。
- **环境管理**：每个项目支持 development、testing、production 三类环境，流水线和构建记录可以绑定具体环境。
- **流水线管理**：支持项目流水线创建、编辑、删除、环境绑定和权限校验。
- **构建管理**：支持手动触发构建、保存构建记录、展示构建状态、构建耗时、GitHub Actions Run 地址和构建日志。
- **GitHub Actions 接入**：后端调用 GitHub API 触发 workflow_dispatch，并通过后台任务定时同步 GitHub Actions 构建状态。
- **系统配置中心**：支持后端按分组返回配置项，前端动态渲染 string、number、boolean、select、password 等配置类型。
- **通知中心**：支持站内通知、SMTP 邮件通知、构建失败通知、构建最终状态通知和测试邮件发送。
- **AI 帮助中心**：接入 AI Chat，支持 SSE 流式响应、Markdown 渲染、代码高亮和 IndexedDB 24 小时本地缓存。
- **审计与可观测性**：支持审计日志、Prometheus 指标、Grafana 仪表盘、Loki 日志聚合、Promtail 日志采集和 Alertmanager 告警。
- **部署安全**：生产环境默认关闭 API 文档、隐藏监控端口、禁止公网暴露 `/metrics`，并提供 MySQL 备份脚本和阿里云部署文档。

## 技术栈

### 前端

- **Vue 3**：主应用框架，负责后台管理系统页面开发。
- **Vite 5**：前端构建工具和开发服务器。
- **TypeScript**：前端类型约束和接口类型定义。
- **Vue Router 4**：路由管理、页面跳转和权限路由控制。
- **Pinia**：全局状态管理，用于用户信息、权限、菜单等状态。
- **Element Plus**：主要后台 UI 组件库，用于表单、表格、弹窗、分页、菜单等管理端组件。
- **@element-plus/icons-vue**：Element Plus 图标体系。
- **Axios**：前端 HTTP 请求封装，统一处理 token、错误提示和接口响应。
- **React 18 / React DOM**：用于在 Vue 帮助中心页面中挂载 AI Chat React island。
- **@ant-design/x**：AI Chat 对话组件能力。
- **@ant-design/x-markdown**：AI 回复内容 Markdown 渲染。
- **Ant Design 6**：配合 Ant Design X 使用的 React UI 能力。
- **idb-keyval**：基于 IndexedDB 保存 AI 聊天记录，实现 24 小时本地缓存。
- **unplugin-auto-import / unplugin-vue-components**：自动导入 Vue、Element Plus API 和组件，减少重复 imports。
- **vue-tsc**：Vue + TypeScript 类型检查。

### 后端

- **Node.js 22**：后端运行环境。
- **Express 4**：REST API 服务框架。
- **TypeScript**：后端类型约束、接口模型和业务模块开发。
- **Sequelize 6**：ORM 框架，管理 MySQL 表模型和数据访问。
- **mysql2**：MySQL 驱动。
- **Zod**：接口入参校验。
- **jsonwebtoken**：JWT access token / refresh token 签发和校验。
- **bcryptjs**：用户密码哈希。
- **ws**：WebSocket 服务，用于实时连接和消息推送能力。
- **Nodemailer**：SMTP 邮件发送。
- **prom-client**：Prometheus 指标采集。
- **swagger-jsdoc / swagger-ui-express**：接口文档生成和 Swagger UI，生产环境默认关闭。
- **helmet**：安全响应头增强。
- **cors**：跨域控制。
- **dotenv**：环境变量加载。
- **Node crypto**：敏感系统配置加密，例如 SMTP 密码和 AI API Key。

### AI 与外部服务

- **GitHub REST API**：触发 GitHub Actions、查询 workflow run 状态。
- **GitHub Actions**：实际执行构建任务。
- **SSE**：AI Chat 流式输出通道。
- **SMTP**：邮件通知发送。

### 基础设施与运维

- **Docker / Docker Compose**：本地开发和生产部署编排。
- **MySQL 8.4**：业务数据库。
- **Nginx**：前端静态资源服务和 API 反向代理。
- **Prometheus**：指标采集和存储。
- **Grafana**：监控仪表盘。
- **Loki**：日志聚合。
- **Promtail**：容器日志采集。
- **Alertmanager**：告警通知。
- **Docker json-file logging**：容器日志大小和文件数量限制。
- **mysqldump + gzip**：MySQL 备份脚本。

## 本地开发启动

本项目推荐只使用 Docker dev 方式运行，不使用本机 `npm run dev`。

```sh
docker compose -f docker-compose.yml -f docker-compose.dev.yml up -d --build
```

默认访问地址：

- 前端：http://localhost:3000
- 后端：http://localhost:8080
- MySQL：127.0.0.1:13306
