# Nebula Ops Frontend - DevOps 运维管理系统

基于 Vue 3 + Vite 构建的 DevOps 运维管理前端系统，集成 AWS 云资源管理和 AI 智能问答功能。

## 功能特性

### AWS 云资源管理

| 功能模块 | 路由路径 | 功能描述 |
|---------|---------|---------|
| 日志摄入 | `/aws/logIntake` | 首页，日志数据采集入口 |
| 用户管理 | `/aws/userManage` | AWS 超时未登录用户信息查询，支持禁用控制台权限、重置密码 |
| 日志下载 | `/aws/logDownLoad` | CloudWatch 日志下载，支持环境选择、日志组筛选、时间范围和过滤条件 |
| ECS 信息查看 | `/aws/ecsInfo` | 多环境 ECS 服务信息展示，包含集群、服务、任务、数据库、Redis 等详细信息，支持搜索筛选和任务定义 JSON 查看 |
| 域名路由 | `/aws/Route` | 域名路由配置管理 |

### AI 智能功能

| 功能模块 | 路由路径 | 功能描述 |
|---------|---------|---------|
| 知识库管理 | `/ai/KnowledgeBase` | 知识文档管理，支持分类、标签、搜索、增删改查操作（禁止上传隐私数据） |
| RAG 问答系统 | `/ai/LLMWeb` | 基于 RAG 技术的智能问答系统，支持上下文检索、答案生成、历史记录查看 |

### 其他功能

- **权限认证** (`/Login`): 用户登录认证
- **404 页面**: 路由不存在时的友好提示页面

## 技术栈

- **框架**: Vue 3 (Composition API + Options API)
- **构建工具**: Vite 6.x
- **UI 组件库**: Element Plus 2.x
- **路由**: 自定义 Hash 路由
- **数据表格**: vue3-easy-data-table
- **代码高亮**: highlight.js + @highlightjs/vue-plugin
- **HTTP 客户端**: Axios

## 项目结构

```
src/
├── components/
│   ├── AWS/
│   │   ├── ECS/
│   │   │   ├── ecsinfo.vue          # ECS 信息查看
│   │   │   └── TaskDefineJson.vue   # 任务定义 JSON 展示
│   │   ├── CloudWatch/
│   │   │   ├── logdown.vue          # 日志下载
│   │   │   └── LogIntake.vue        # 日志摄入
│   │   ├── SecurityHub/
│   │   │   └── usermange.vue        # 用户管理
│   │   └── Route/
│   │       └── Route.vue            # 域名路由
│   ├── AI/
│   │   ├── knowledge_base.vue       # 知识库管理
│   │   └── LLMWeb.vue               # RAG 问答系统
│   ├── Login.vue                    # 登录页面
│   └── NotFound.vue                 # 404 页面
├── assets/
│   ├── main.css
│   └── base.css
├── App.vue                          # 主应用组件（路由配置）
└── main.js                          # 入口文件
```

## 开发指南

### 环境准备

- Node.js >= 18.x
- npm >= 9.x

### 安装依赖

```sh
npm install
```

### 开发模式

```sh
npm run dev
```

### 生产构建

```sh
npm run build
```

### 预览构建结果

```sh
npm run preview
```

## 后端 API 依赖

前端系统依赖后端 API 服务，主要 API 接口包括：

### AWS 相关接口

- `GET /api/aws/get_ecs_info?env={env}` - 获取 ECS 信息
- `GET /api/aws/get_user_info` - 获取用户信息
- `GET /api/aws/get_env_group?env={env}` - 获取日志组列表
- `GET /api/aws/download` - 下载日志文件
- `POST /aws/disable_console/{username}` - 禁用控制台权限
- `POST /aws/reset_password/{username}` - 重置密码

### AI 相关接口

- `POST /api/ai/knowledge/create` - 创建知识文档
- `GET /api/ai/knowledge/search` - 搜索知识文档
- `POST /api/ai/knowledge/delete` - 删除知识文档
- `POST /api/ai/LLMModel/chat` - RAG 问答接口
- `GET /api/rag/history` - 获取问答历史

## 注意事项

1. **CSRF Token**: 系统使用 CSRF Token 进行安全防护，请求需携带 `X-CSRFToken` 请求头
2. **隐私数据**: 知识库功能禁止上传数据库账号密码等敏感隐私数据
3. **API 代理**: 开发环境建议配置 Vite 代理解决跨域问题

## 推荐 IDE 设置

- [VSCode](https://code.visualstudio.com/)
- [Volar](https://marketplace.visualstudio.com/items?itemName=Vue.volar) (并禁用 Vetur)

## 自定义配置

参见 [Vite Configuration Reference](https://vite.dev/config/)。
