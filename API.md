# DevOps Incident (事件调查) 模块 API 文档

> 本文档描述前端事件调查模块所需的后端接口，供后端开发参考。

## 通用规范

### 路径说明

**重要**：由于 Vite 开发服务器代理配置，路径有两层概念：

| 层级 | 路径示例 | 说明 |
|------|---------|------|
| 前端请求路径 | `/api/aws/devops-incident` | 前端 axios 调用时使用的路径 |
| 后端实际路径 | `/aws/devops-incident` | 后端路由注册时使用的路径（去掉 `/api` 前缀） |

**代理规则**（vite.config.js）：
```javascript
proxy: {
  '/api': {
    target: apiBaseUrl,
    rewrite: path => path.replace(/^\/api/, '')  // 去掉 /api 前缀
  }
}
```

**示例**：
- 前端请求：`GET /api/aws/devops-incident?status=investigating`
- 代理转发后：`GET /aws/devops-incident?status=investigating`
- 后端路由：`@app.get("/aws/devops-incident")`

### 基础路径
- 前端请求前缀：`/api/aws/devops-incident`
- 后端路由前缀：`/aws/devops-incident`（**去掉 `/api`**）

### 认证
- 所有接口需要登录认证
- 后端需验证用户身份（Session / Token）
- 建议与现有 AWS 相关接口使用相同的认证机制

### CSRF Token
- 参考现有 Cloudwatch 日志下载接口的实现
- GET 请求返回 `csrftoken` Cookie
- POST/PUT/DELETE 请求需在 Header 中携带 `X-CSRFToken`
- 前端会从 `document.cookie` 中提取 `csrftoken`

### 请求头
```http
Content-Type: application/json
X-CSRFToken: {csrf_token_from_cookie}
```

### 响应格式

#### 成功响应
```json
{
  "status": "success",
  "data": { ... }
}
```

#### 错误响应
```json
{
  "status": "error",
  "code": 401,
  "message": "未登录，请先登录"
}
```

#### 列表响应
```json
{
  "status": "success",
  "data": [
    { ... },
    { ... }
  ],
  "total": 100,
  "page": 1,
  "pageSize": 10
}
```

---

## 接口列表

### 1. 获取事件调查列表

**前端请求**: `GET /api/aws/devops-incident`

**后端路由**: `GET /aws/devops-incident`（**去掉 `/api` 前缀**）

**功能描述**: 获取事件调查列表，支持筛选和分页

**请求参数** (Query String):

| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| status | string | 否 | 状态筛选：investigating/completed/closed/cancelled/failed |
| severity | string | 否 | 严重程度：critical/high/medium/low |
| environment_id | string | 否 | 环境ID筛选 |
| keyword | string | 否 | 关键词搜索（标题/描述/事件ID） |
| page | integer | 否 | 页码，默认 1 |
| page_size | integer | 否 | 每页数量，默认 10 |

**前端请求示例**:
```
GET /api/aws/devops-incident?status=investigating&severity=critical&page=1&page_size=10
```

**后端实际收到**:
```
GET /aws/devops-incident?status=investigating&severity=critical&page=1&page_size=10
```

**响应示例**:
```json
{
  "status": "success",
  "data": [
    {
      "id": "inv_001",
      "incidentId": "INC-2026-0428-001",
      "title": "生产环境 ECS 服务异常",
      "severity": "critical",
      "status": "investigating",
      "createdAt": "2026-04-28T08:32:15Z",
      "environmentName": "China Prod",
      "environmentId": "env_001",
      "description": "生产环境 ECS 服务健康检查失败，3个实例无法正常提供服务"
    },
    {
      "id": "inv_002",
      "incidentId": "INC-2026-0427-003",
      "title": "测试环境数据库连接超时",
      "severity": "medium",
      "status": "completed",
      "createdAt": "2026-04-27T14:20:30Z",
      "environmentName": "Singapore Dev",
      "environmentId": "env_002",
      "description": "测试环境数据库连接池耗尽"
    }
  ],
  "total": 25,
  "page": 1,
  "pageSize": 10
}
```

---

### 2. 获取事件调查详情

**前端请求**: `GET /api/aws/devops-incident/{id}`

**后端路由**: `GET /aws/devops-incident/{id}`（**去掉 `/api` 前缀**）

**功能描述**: 获取单个事件调查的详细信息，用于详情页展示

**路径参数**:

| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| id | string | 是 | 调查记录ID 或 incidentId |

**前端请求示例**:
```
GET /api/aws/devops-incident/inv_001
GET /api/aws/devops-incident/INC-2026-0428-001
```

**后端实际收到**:
```
GET /aws/devops-incident/inv_001
GET /aws/devops-incident/INC-2026-0428-001
```

**响应示例**:
```json
{
  "status": "success",
  "data": {
    "id": "inv_001",
    "incidentId": "INC-2026-0428-001",
    "occurredAt": "2026-04-28T08:32:15Z",
    "affectedService": "AWS ECS / Production Cluster",
    "severity": "critical",
    "status": "investigating",
    "environmentId": "env_001",
    "environmentName": "China Prod",
    "title": "生产环境 ECS 服务异常",
    "background": "事件背景信息...",
    "description": "详细事件描述...",
    
    "progress": {
      "currentStep": 1,
      "percentage": 33,
      "steps": [
        { "status": "已完成", "icon": "CircleCheck", "iconClass": "completed" },
        { "status": "进行中", "icon": "Loading", "iconClass": "processing" },
        { "status": "待处理", "icon": "Timer", "iconClass": "pending" }
      ]
    },
    
    "timeline": [
      {
        "id": 1,
        "timestamp": "08:32:15",
        "type": "danger",
        "icon": "Warning",
        "title": "事件触发 - 健康检查失败",
        "description": "AWS CloudWatch 检测到生产环境 ECS 服务的 3 个目标组健康检查连续失败",
        "highlight": true,
        "duration": "45s",
        "details": [
          "目标组: arn:aws:elasticloadbalancing:cn-north-1:123456789012:targetgroup/prod-api/abc123",
          "健康检查路径: /health",
          "失败阈值: 3 次连续失败",
          "受影响实例: 3 / 5 个实例"
        ],
        "logs": [
          "[2026-04-28T08:32:15Z] HEALTH_CHECK_FAILED: Target i-0abc123def456 is unhealthy",
          "[2026-04-28T08:32:16Z] HEALTH_CHECK_FAILED: Target i-0def789ghi012 is unhealthy"
        ],
        "suggestions": [
          "检查数据库连接池配置是否合理",
          "验证数据库服务器负载状态"
        ]
      }
    ],
    
    "rootCause": {
      "mainCause": "未优化的 SQL 查询导致数据库连接池耗尽",
      "description": "orders 表上的查询缺少联合索引，导致全表扫描和锁表",
      "impactChain": [
        "新代码部署引入未优化的 SQL 查询",
        "查询执行全表扫描 (500万行)",
        "查询耗时 45 秒并持有表锁",
        "后续查询被阻塞，连接池迅速耗尽",
        "应用无法获取数据库连接，请求超时",
        "健康检查失败，ECS 开始重启容器",
        "重启循环导致服务完全不可用"
      ],
      "contributingFactors": [
        {
          "type": "critical",
          "name": "缺失数据库索引",
          "description": "orders 表的 status 和 created_at 列缺少联合索引"
        },
        {
          "type": "warning",
          "name": "连接池配置过小",
          "description": "HikariCP 最大连接数设置为 50"
        }
      ],
      "evidence": [
        { "source": "ECS 日志", "evidence": "大量 HikariPool 连接超时异常", "relevance": 95 },
        { "source": "CloudWatch Metrics", "evidence": "数据库 CPU 飙升至 98%", "relevance": 90 },
        { "source": "RDS 慢查询日志", "evidence": "同一 SQL 执行 142 次，每次 45s+", "relevance": 100 }
      ]
    },
    
    "fixSuggestions": {
      "immediate": [
        {
          "title": "创建缺失的数据库索引",
          "description": "为 orders 表的 status 和 created_at 列创建联合索引",
          "priority": "high",
          "completed": false,
          "commands": [
            {
              "label": "创建联合索引",
              "command": "CREATE INDEX idx_status_created_at ON orders(status, created_at);"
            },
            {
              "label": "验证索引创建",
              "command": "SHOW INDEX FROM orders WHERE Key_name = 'idx_status_created_at';"
            }
          ],
          "verification": "执行 EXPLAIN 验证查询是否使用新索引"
        }
      ],
      "longterm": [
        {
          "title": "优化数据库连接池配置",
          "description": "重新评估并优化连接池配置参数",
          "completed": false,
          "benefits": ["防止连接池雪崩", "提高资源利用率"]
        }
      ]
    },
    
    "chatMessages": [
      {
        "role": "assistant",
        "type": "analysis",
        "time": "08:37:00",
        "title": "事件分析完成",
        "content": "我已完成对此次 ECS 服务中断事件的分析。",
        "details": [
          "确认了问题 SQL 缺少联合索引",
          "分析了完整的故障传播链"
        ],
        "suggestion": "建议优先执行创建缺失的数据库索引"
      }
    ]
  }
}
```

---

### 3. 发起新的事件调查

**前端请求**: `POST /api/aws/devops-incident`

**后端路由**: `POST /aws/devops-incident`（**去掉 `/api` 前缀**）

**功能描述**: 前端用户填写表单后，调用此接口发起新的事件调查。后端负责：
1. 创建调查记录
2. 触发 DevOps Agent 自动诊断流程
3. 立即返回调查ID，供前端跳转详情页

**请求体**:
```json
{
  "environment_id": "env_001",
  "environment_name": "China Prod",
  "title": "生产环境 ECS 服务异常",
  "severity": "critical",
  "background": "事件发现时间：2026-04-28 08:30，影响范围：生产环境全部用户...",
  "description": "具体的错误现象、相关日志片段、初步怀疑方向..."
}
```

**请求体字段说明**:

| 字段名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| environment_id | string | 是 | AWS 环境 ID |
| environment_name | string | 否 | 环境名称（冗余字段，方便展示） |
| title | string | 是 | 调查标题，5-100 字符 |
| severity | string | 是 | 严重程度：critical/high/medium/low |
| background | string | 是 | 事件背景，至少 20 字符 |
| description | string | 是 | 事件说明，至少 20 字符 |

**响应示例**:
```json
{
  "status": "success",
  "data": {
    "id": "inv_003",
    "incidentId": "INC-2026-0428-003",
    "title": "生产环境 ECS 服务异常",
    "severity": "critical",
    "status": "investigating",
    "createdAt": "2026-04-28T10:15:30Z",
    "message": "DevOps Agent 已开始自动诊断流程"
  }
}
```

**后端处理逻辑说明**:
1. 验证请求参数
2. 在数据库中创建调查记录，状态为 `investigating`
3. 生成唯一的 `incidentId`（格式建议：`INC-YYYY-MMDD-XXX`）
4. **异步触发** DevOps Agent 诊断流程（不要阻塞响应）
5. 立即返回调查 ID，前端跳转到详情页
6. Agent 诊断过程中，逐步更新 `timeline`、`rootCause`、`fixSuggestions` 等字段

---

### 4. 取消事件调查

**前端请求**: `POST /api/aws/devops-incident/{id}/cancel`

**后端路由**: `POST /aws/devops-incident/{id}/cancel`（**去掉 `/api` 前缀**）

**功能描述**: 用户可取消正在进行中的事件调查

**路径参数**:

| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| id | string | 是 | 调查记录ID |

**请求体**:
```json
{}
```

**响应示例**:
```json
{
  "status": "success",
  "data": {
    "id": "inv_001",
    "status": "cancelled",
    "cancelledAt": "2026-04-28T10:20:00Z",
    "message": "调查已取消"
  }
}
```

**状态变更规则**:
- 只有 `investigating` 状态的调查可以取消
- 取消后状态变为 `cancelled`
- 应停止后台正在运行的 Agent 任务

---

### 5. 导出事件调查报告

**前端请求**: `GET /api/aws/devops-incident/{id}/export`

**后端路由**: `GET /aws/devops-incident/{id}/export`（**去掉 `/api` 前缀**）

**功能描述**: 导出事件调查报告，返回 PDF 文件流

**路径参数**:

| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| id | string | 是 | 调查记录ID |

**前端请求示例**:
```
GET /api/aws/devops-incident/inv_001/export
```

**后端实际收到**:
```
GET /aws/devops-incident/inv_001/export
```

**响应**:
- Content-Type: `application/pdf`
- Content-Disposition: `attachment; filename="INC-2026-0428-001_2026-04-28.pdf"`
- 响应体为二进制 PDF 文件流

**前端处理参考** (与 Cloudwatch 日志下载一致):
```javascript
const response = await axios.get(`/api/aws/devops-incident/${id}/export`, {
  responseType: 'blob'
});

const url = window.URL.createObjectURL(new Blob([response.data]));
const link = document.createElement('a');
link.href = url;
link.setAttribute('download', `incident_${id}_${new Date().toISOString().slice(0, 10)}.pdf`);
document.body.appendChild(link);
link.click();
// ... 清理
```

---

## 数据模型定义

### Investigation (调查记录) 主表

| 字段名 | 类型 | 说明 |
|--------|------|------|
| id | string | 主键 UUID |
| incident_id | string | 业务ID，如 INC-2026-0428-001 |
| environment_id | string | 关联的 AWS 环境 ID |
| environment_name | string | 环境名称（冗余） |
| title | string | 调查标题 |
| severity | string | 严重程度：critical/high/medium/low |
| status | string | 状态：investigating/completed/closed/cancelled/failed |
| background | text | 事件背景 |
| description | text | 事件描述 |
| occurred_at | datetime | 事件发生时间 |
| affected_service | string | 受影响的服务 |
| created_at | datetime | 创建时间 |
| updated_at | datetime | 更新时间 |
| cancelled_at | datetime | 取消时间 |
| completed_at | datetime | 完成时间 |

### JSON 字段存储

以下字段建议存储为 JSON/JSONB 类型：

| 字段名 | 说明 |
|--------|------|
| progress | 调查进度 { currentStep, percentage, steps[] } |
| timeline | 时间线事件数组 [] |
| root_cause | 根因分析 { mainCause, description, impactChain[], contributingFactors[], evidence[] } |
| fix_suggestions | 修复建议 { immediate[], longterm[] } |
| chat_messages | 对话消息数组 [] |

---

## 状态流转

```
                    +-----------+
                    |  created  |
                    +-----+-----+
                          |
                          v
                   +------+------+
                   |investigating| <-------+
                   +------+------+         |
                          |                |
              +-----------+-----------+    |
              |           |           |    |
              v           v           v    |
        +-----+----+  +---+----+  +-----+----+
        | completed |  | failed |  |cancelled|
        +----------+  +--------+  +---------+
              |
              v
         +----+----+
         |  closed |
         +---------+
```

**状态说明**:

| 状态 | 说明 |
|------|------|
| investigating | 调查中，Agent 正在自动诊断，前端轮询更新 |
| completed | 调查完成，已生成根因分析和修复建议 |
| closed | 已关闭，用户确认问题已解决 |
| cancelled | 已取消，用户主动取消 |
| failed | 失败，Agent 诊断过程中出错 |

---

## 前端轮询机制

### 轮询触发条件
- 当调查状态为 `investigating` 时，前端自动启动轮询
- 轮询间隔：5 秒
- 轮询接口：`GET /api/aws/devops-incident/{id}`

### 轮询终止条件
- 状态变为 `completed` / `closed` / `cancelled` / `failed`
- 用户离开详情页（组件销毁时停止轮询）
- 用户手动停止轮询（可选）

### 后端优化建议
- 详情接口返回时，可根据 `If-Modified-Since` 或 `ETag` 做缓存
- 如果调查未完成，建议只返回变更的字段（可选优化）

---

## 参考接口

本模块的接口设计参考了以下现有接口：

### Cloudwatch 日志下载接口

```javascript
// 获取日志组列表
GET /api/aws/get_env_group?env={env_name}

// 下载日志
GET /api/aws/download?log_group_name={group}&start_time={time}&end_time={time}&env={env}
```

### AWS 环境管理接口

```javascript
// 获取环境列表
GET /api/aws/environments

// 创建环境
POST /api/aws/environments

// 更新环境
PUT /api/aws/environments/{id}

// 删除环境
DELETE /api/aws/environments/{id}
```

---

## 附录：前端组件与接口对应关系

| 组件 | 使用的接口 |
|------|-----------|
| DevOpsAgentIncidentLaunch.vue | POST /api/aws/devops-incident (发起调查) |
| DevOpsAgentIncidentList.vue | GET /api/aws/devops-incident (列表) |
| DevOpsAgentIncident.vue | GET /api/aws/devops-incident/{id} (详情+轮询) |
| DevOpsAgentIncident.vue | GET /api/aws/devops-incident/{id}/export (导出) |

---

## 变更日志

| 日期 | 版本 | 说明 |
|------|------|------|
| 2026-04-28 | v1.0 | 初始版本，定义所有核心接口 |

---

> 如有疑问，请联系前端开发团队
