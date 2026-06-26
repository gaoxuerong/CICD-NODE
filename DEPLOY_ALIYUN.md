# 阿里云部署说明

本文档面向轻量应用服务器 / ECS 的单机 Docker 部署。生产环境不要使用 `docker-compose.dev.yml`。

## 服务器建议

- 测试或低流量：2C4G 起步。
- 同机运行 MySQL、Prometheus、Grafana、Loki：建议 4C8G。
- 安全组只开放：`22`、`80`、`443`。
- 不要开放：`3306`、`8080`、`9090`、`9093`、`3100`、`3001`。

## 初始化环境变量

复制模板：

```sh
cp .env.production.example .env.production
```

必须替换所有 `replace-with...` 和示例域名：

- `MYSQL_ROOT_PASSWORD`
- `DB_PASSWORD`
- `JWT_SECRET`
- `ENCRYPTION_KEY`
- `SEED_ADMIN_PASSWORD`
- `GRAFANA_ADMIN_PASSWORD`
- `CORS_ORIGINS`
- `WEBHOOK_BASE_URL`

生成随机值可以使用：

```sh
openssl rand -base64 48
```

`ENCRYPTION_KEY` 至少 32 字节。生产环境一旦写入并开始保存 GitHub Token、SMTP 密码、AI API Key，就不要随意更换。

## ENCRYPTION_KEY 备份要求

系统配置中的敏感值会加密后存入数据库，包括：

- `smtp.password`
- `ai.api_key`
- GitHub Token / Git 凭据相关密文

这些密文依赖 `ENCRYPTION_KEY` 解密。如果数据库备份存在，但 `ENCRYPTION_KEY` 丢失，敏感配置无法恢复。

建议：

- 把 `.env.production` 离线备份到安全位置。
- 数据库备份和 `.env.production` 分开保存。
- 不要把 `.env.production` 提交到 Git。
- 换 `ENCRYPTION_KEY` 前，先在系统配置页面重新录入敏感配置，或实现专门的密钥轮换脚本。

当前项目还没有自动密钥轮换流程，所以生产环境按“密钥固定 + 安全备份”处理。

## 启动

```sh
docker compose --env-file .env.production -f docker-compose.yml up -d --build
```

查看状态：

```sh
docker compose --env-file .env.production -f docker-compose.yml ps
docker compose --env-file .env.production -f docker-compose.yml logs -f backend-node
```

首次空库启动时，会使用 `SEED_ADMIN_PASSWORD` 创建 `admin` 账号。生产环境默认不会创建 `user/user123`。

## HTTPS

公网部署必须配置 HTTPS。可以使用以下任一方式：

- 阿里云负载均衡 / CDN 终止 HTTPS。
- 服务器 Nginx + Certbot。
- 服务器 Caddy 自动签发证书。

HTTPS 域名要同步写入：

```env
CORS_ORIGINS=https://your-domain.example
WEBHOOK_BASE_URL=https://your-domain.example
```

## API 文档

生产环境默认关闭 Swagger：

```env
ENABLE_API_DOCS=false
```

临时排查需要打开时，可以短期开启后重启：

```env
ENABLE_API_DOCS=true
```

排查完成后应关闭。

## 监控访问

Prometheus、Alertmanager、Loki、Grafana 默认绑定本机：

```env
OBSERVABILITY_BIND_ADDR=127.0.0.1
```

不要直接开放这些端口到公网。需要访问 Grafana 时，用 SSH tunnel：

```sh
ssh -L 3001:127.0.0.1:3001 root@your-server-ip
```

然后本机打开：

```text
http://127.0.0.1:3001
```

## MySQL 备份

手动备份：

```sh
ENV_FILE=.env.production ./deploy/mysql/backup.sh
```

默认备份到：

```text
backups/mysql/
```

默认保留 14 天。可以覆盖：

```sh
RETENTION_DAYS=30 ENV_FILE=.env.production ./deploy/mysql/backup.sh
```

建议加入 crontab，每天凌晨备份：

```cron
15 3 * * * cd /path/to/CICD-NODE && ENV_FILE=.env.production ./deploy/mysql/backup.sh >> backups/mysql/backup.log 2>&1
```

备份文件和 `.env.production` 都要做异地保存。
