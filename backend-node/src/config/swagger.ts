import swaggerJsdoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'CI/CD Platform API',
      version: '1.0.0',
      description: 'CI/CD 平台后端 API 文档',
    },
    servers: [
      {
        url: 'http://localhost:3000',
        description: '开发服务器',
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
      schemas: {
        User: {
          type: 'object',
          properties: {
            id: { type: 'integer', example: 1 },
            username: { type: 'string', example: 'admin' },
            email: { type: 'string', example: 'admin@example.com' },
            nickname: { type: 'string', example: '管理员' },
            avatar: { type: 'string' },
            role: { type: 'string', example: 'admin' },
            status: { type: 'string', enum: ['active', 'inactive'], example: 'active' },
            is_superuser: { type: 'boolean', example: false },
            last_login_at: { type: 'string', format: 'date-time' },
            created_at: { type: 'string', format: 'date-time' },
            updated_at: { type: 'string', format: 'date-time' },
          },
        },
        Role: {
          type: 'object',
          properties: {
            id: { type: 'integer', example: 1 },
            name: { type: 'string', example: '管理员' },
            code: { type: 'string', example: 'admin' },
            description: { type: 'string' },
            permissions: { type: 'array', items: { type: 'string' } },
            created_at: { type: 'string', format: 'date-time' },
            updated_at: { type: 'string', format: 'date-time' },
          },
        },
        Project: {
          type: 'object',
          properties: {
            id: { type: 'integer', example: 1 },
            name: { type: 'string', example: 'my-project' },
            description: { type: 'string' },
            git_url: { type: 'string', example: 'https://github.com/user/repo.git' },
            language: { type: 'string', example: 'TypeScript' },
            status: { type: 'string', enum: ['active', 'archived'], example: 'active' },
            source: { type: 'string', enum: ['local', 'github', 'gitlab', 'gitee', 'custom'], example: 'github' },
            git_credential_id: { type: 'integer', nullable: true, example: 1 },
            default_branch: { type: 'string', example: 'main' },
            created_at: { type: 'string', format: 'date-time' },
            updated_at: { type: 'string', format: 'date-time' },
          },
        },
        Pipeline: {
          type: 'object',
          properties: {
            id: { type: 'integer', example: 1 },
            name: { type: 'string', example: 'deploy-pipeline' },
            project_id: { type: 'integer', example: 1 },
            config: { type: 'object' },
            status: { type: 'string', enum: ['active', 'inactive'] },
            created_at: { type: 'string', format: 'date-time' },
            updated_at: { type: 'string', format: 'date-time' },
          },
        },
        Build: {
          type: 'object',
          properties: {
            id: { type: 'integer', example: 1 },
            pipeline_id: { type: 'integer', example: 1 },
            status: { type: 'string', enum: ['pending', 'running', 'success', 'failed'] },
            branch: { type: 'string', example: 'main' },
            commit_sha: { type: 'string', example: 'abc123' },
            logs: { type: 'string' },
            started_at: { type: 'string', format: 'date-time' },
            finished_at: { type: 'string', format: 'date-time' },
            created_at: { type: 'string', format: 'date-time' },
          },
        },
        Error: {
          type: 'object',
          properties: {
            code: { type: 'integer', example: -1 },
            message: { type: 'string', example: '错误信息' },
          },
        },
      },
    },
  },
  apis: ['./src/modules/*/routes.ts'],
};

export const swaggerSpec = swaggerJsdoc(options);
export { swaggerUi };
