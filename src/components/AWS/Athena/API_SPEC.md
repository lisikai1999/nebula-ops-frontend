# Athena SQL 查询后端 API 接口规范

## 概述

本文档定义了前端 Athena SQL 查询组件所需的后端 API 接口规范。后端需要实现以下接口以支持多环境 Athena 查询功能。

---

## 通用响应格式

所有 API 响应应遵循以下统一格式：

### 成功响应
```json
{
  "status": "success",
  "data": { ... }
}
```

### 错误响应
```json
{
  "status": "error",
  "message": "错误信息描述",
  "detail": "详细错误信息（可选，用于调试）"
}
```

---

## API 接口列表

### 1. 获取环境列表

用于初始化页面时获取所有可用的 AWS 环境。

**请求信息：**
- 方法: `GET`
- 路径: `/api/aws/athena/environments`
- 认证: 需要登录认证

**请求参数：**
无

**响应示例：**
```json
{
  "status": "success",
  "data": [
    {
      "id": "prod",
      "name": "生产环境",
      "is_default": true,
      "region": "us-east-1",
      "account_id": "123456789012"
    },
    {
      "id": "staging",
      "name": "预发布环境",
      "is_default": false,
      "region": "us-west-2",
      "account_id": "987654321098"
    },
    {
      "id": "test",
      "name": "测试环境",
      "is_default": false,
      "region": "eu-west-1",
      "account_id": "111222333444"
    }
  ]
}
```

**响应字段说明：**

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| id | string | 是 | 环境唯一标识符 |
| name | string | 是 | 环境显示名称 |
| is_default | boolean | 是 | 是否为默认环境 |
| region | string | 否 | AWS 区域 |
| account_id | string | 否 | AWS 账号 ID |

**后端实现说明：**
- 环境配置可以存储在配置文件、数据库或通过 AWS Organizations API 获取
- 每个环境需要有唯一的 `id` 用于标识
- `is_default` 用于前端默认选中哪个环境

---

### 2. 获取数据库列表

获取指定环境下的所有 Athena 数据库。

**请求信息：**
- 方法: `GET`
- 路径: `/api/aws/athena/databases`
- 认证: 需要登录认证

**请求参数：**

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| env | string | 是 | 环境 ID（来自环境列表接口） |

**请求示例：**
```
GET /api/aws/athena/databases?env=prod
```

**响应示例：**
```json
{
  "status": "success",
  "data": [
    "default",
    "analytics_db",
    "logs_db",
    "reports_db",
    "metrics_db"
  ]
}
```

**响应字段说明：**
- 返回数据库名称的字符串数组

**后端实现说明：**
- 使用 AWS Athena SDK 的 `list_databases` 方法
- 或者执行 `SHOW DATABASES` 查询
- 注意处理跨账号/跨区域的凭证管理

---

### 3. 获取数据表列表

获取指定数据库下的所有数据表。

**请求信息：**
- 方法: `GET`
- 路径: `/api/aws/athena/tables`
- 认证: 需要登录认证

**请求参数：**

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| env | string | 是 | 环境 ID |
| database | string | 是 | 数据库名称 |

**请求示例：**
```
GET /api/aws/athena/tables?env=prod&database=analytics_db
```

**响应示例：**
```json
{
  "status": "success",
  "data": [
    "user_events",
    "page_views",
    "clickstream",
    "transactions",
    "session_logs"
  ]
}
```

**响应字段说明：**
- 返回数据表名称的字符串数组

**后端实现说明：**
- 使用 AWS Athena SDK 的 `list_table_metadata` 方法
- 或者执行 `SHOW TABLES IN database_name` 查询

---

### 4. 执行 SQL 查询 (核心接口)

执行 Athena SQL 查询并返回结果。

**请求信息：**
- 方法: `POST`
- 路径: `/api/aws/athena/query`
- 认证: 需要登录认证
- Content-Type: `application/json`

**请求头：**
```
X-CSRFToken: <csrf_token>
```

**请求参数 (JSON Body)：**

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| environment | string | 是 | 环境 ID |
| database | string | 否 | 默认数据库（SQL 中未指定数据库时使用） |
| sql | string | 是 | 要执行的 SQL 语句 |
| limit | integer | 否 | 限制返回行数，默认 100 |

**请求示例：**
```json
{
  "environment": "prod",
  "database": "analytics_db",
  "sql": "SELECT user_id, event_name, timestamp FROM user_events WHERE date = '2024-01-01' LIMIT 50",
  "limit": 100
}
```

**响应示例 (成功)：**
```json
{
  "status": "success",
  "data": {
    "query_info": {
      "query_id": "12345678-1234-1234-1234-123456789012",
      "status": "SUCCEEDED",
      "data_scanned_bytes": 10485760,
      "execution_time_ms": 2345,
      "output_location": "s3://aws-athena-query-results-123456789012-us-east-1/Unsaved/2024/01/01/...",
      "submission_time": "2024-01-01T12:00:00Z"
    },
    "columns": [
      {
        "name": "user_id",
        "type": "varchar"
      },
      {
        "name": "event_name",
        "type": "varchar"
      },
      {
        "name": "timestamp",
        "type": "timestamp"
      }
    ],
    "data": [
      {
        "user_id": "u123456",
        "event_name": "page_view",
        "timestamp": "2024-01-01T10:30:00Z"
      },
      {
        "user_id": "u789012",
        "event_name": "click",
        "timestamp": "2024-01-01T10:31:00Z"
      }
    ],
    "row_count": 2,
    "execution_time": 2.35
  }
}
```

**响应示例 (错误)：**
```json
{
  "status": "error",
  "message": "SQL 语法错误",
  "detail": "line 1:8: mismatched input 'SELEC' expecting {'SELECT', ...}"
}
```

**响应字段说明：**

| 字段 | 类型 | 说明 |
|------|------|------|
| query_info | object | 查询执行详细信息 |
| query_info.query_id | string | Athena 查询 ID |
| query_info.status | string | 查询状态 (SUCCEEDED/FAILED/CANCELLED) |
| query_info.data_scanned_bytes | integer | 扫描数据量（字节） |
| query_info.execution_time_ms | integer | 执行时间（毫秒） |
| query_info.output_location | string | 结果 S3 位置 |
| query_info.submission_time | string | 提交时间 |
| columns | array | 列定义数组 |
| columns[].name | string | 列名 |
| columns[].type | string | 列数据类型 |
| data | array | 查询结果数据行数组 |
| row_count | integer | 返回行数 |
| execution_time | float | 执行时间（秒，简化显示用） |

**后端实现说明：**

#### 同步执行方式 (推荐用于小查询)
1. 使用 AWS Athena SDK 的 `start_query_execution` 启动查询
2. 使用 `get_query_execution` 轮询查询状态
3. 查询完成后，使用 `get_query_results` 获取结果
4. 解析结果并返回 JSON 格式

#### 异步执行方式 (用于大查询)
1. 启动查询后立即返回 `query_id`
2. 前端通过轮询 `get_query_status` 接口检查状态
3. 查询完成后获取结果

#### 安全考虑：
1. **SQL 注入防护**：虽然 Athena 不支持传统的参数化查询，但应：
   - 限制用户只能执行 SELECT 语句（根据业务需求）
   - 对危险操作（DROP, DELETE, TRUNCATE 等）进行二次确认
   - 记录所有查询日志用于审计
   
2. **权限控制**：
   - 确保后端使用的 AWS 凭证有最小权限
   - 可以通过 IAM Policy 限制只能查询特定数据库/表
   
3. **资源限制**：
   - 设置查询超时时间
   - 限制扫描的数据量
   - 限制并发查询数

#### 环境凭证管理：
后端需要管理多个 AWS 环境的凭证，建议方式：
1. **配置文件**：在后端配置文件中存储各环境的 AWS Access Key（不推荐生产环境）
2. **IAM 角色切换**：使用 AssumeRole 跨账号访问
3. **AWS Profile**：使用命名的 AWS Profile
4. **Secret Manager**：从 AWS Secrets Manager 获取凭证

---

### 5. 获取查询状态 (可选，用于异步查询)

**请求信息：**
- 方法: `GET`
- 路径: `/api/aws/athena/query_status`
- 认证: 需要登录认证

**请求参数：**

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| env | string | 是 | 环境 ID |
| query_id | string | 是 | 查询 ID |

**响应示例：**
```json
{
  "status": "success",
  "data": {
    "query_id": "12345678-1234-1234-1234-123456789012",
    "status": "RUNNING",
    "state_change_reason": null,
    "submission_time": "2024-01-01T12:00:00Z",
    "completion_time": null
  }
}
```

---

## 前端调用示例

### JavaScript (Axios)

```javascript
// 获取环境列表
const getEnvironments = async () => {
  const response = await axios.get('/api/aws/athena/environments');
  return response.data.data;
};

// 获取数据库列表
const getDatabases = async (env) => {
  const response = await axios.get(`/api/aws/athena/databases?env=${env}`);
  return response.data.data;
};

// 获取表列表
const getTables = async (env, database) => {
  const response = await axios.get(`/api/aws/athena/tables?env=${env}&database=${database}`);
  return response.data.data;
};

// 执行查询
const executeQuery = async (params) => {
  const csrftoken = document.cookie.match(/csrftoken=([\w-]+)/)?.[1];
  
  const response = await axios.post('/api/aws/athena/query', params, {
    headers: {
      'X-CSRFToken': csrftoken
    }
  });
  
  return response.data;
};
```

---

## 错误码建议

| HTTP 状态码 | 含义 | 场景 |
|-------------|------|------|
| 400 | 错误请求 | SQL 语法错误、参数缺失 |
| 401 | 未授权 | 用户未登录 |
| 403 | 禁止访问 | 无权限访问该环境/数据库 |
| 404 | 未找到 | 环境不存在、数据库不存在 |
| 408 | 请求超时 | 查询执行超时 |
| 429 | 请求过多 | 超过并发限制 |
| 500 | 服务器错误 | AWS 服务错误、内部错误 |

---

## 安全最佳实践

1. **输入验证**：
   - 验证 `environment` 参数是否在允许的环境列表中
   - 对 SQL 语句进行基本的危险关键词检查

2. **审计日志**：
   - 记录所有查询的用户、时间、环境、SQL 语句
   - 记录查询执行时间、扫描数据量

3. **速率限制**：
   - 限制每个用户的查询频率
   - 限制并发查询数量

4. **查询超时**：
   - 设置合理的查询超时时间
   - 对于长时间运行的查询，使用异步模式

5. **数据脱敏**：
   - 对于敏感数据字段，考虑在返回前进行脱敏处理

---

## 后端技术栈建议

### Python (Django/Flask/FastAPI)

使用 `boto3` SDK：

```python
import boto3
from botocore.exceptions import ClientError

def get_athena_client(environment):
    """根据环境获取 Athena 客户端"""
    # 根据环境配置凭证
    session = boto3.Session(
        aws_access_key_id=ACCESS_KEYS[environment]['access_key'],
        aws_secret_access_key=ACCESS_KEYS[environment]['secret_key'],
        region_name=ACCESS_KEYS[environment]['region']
    )
    return session.client('athena')

def execute_athena_query(env, database, sql, limit=100):
    """执行 Athena 查询"""
    client = get_athena_client(env)
    
    # 启动查询
    response = client.start_query_execution(
        QueryString=sql,
        QueryExecutionContext={
            'Database': database
        },
        ResultConfiguration={
            'OutputLocation': 's3://your-query-results-bucket/'
        }
    )
    
    query_id = response['QueryExecutionId']
    
    # 等待查询完成
    while True:
        status = client.get_query_execution(QueryExecutionId=query_id)
        state = status['QueryExecution']['Status']['State']
        
        if state in ['SUCCEEDED', 'FAILED', 'CANCELLED']:
            break
        
        time.sleep(0.5)
    
    if state == 'SUCCEEDED':
        # 获取结果
        results = client.get_query_results(
            QueryExecutionId=query_id,
            MaxResults=limit
        )
        return parse_results(results)
    else:
        raise Exception(status['QueryExecution']['Status'].get('StateChangeReason', 'Query failed'))
```

### Node.js

使用 `aws-sdk` 或 `@aws-sdk/client-athena`：

```javascript
const { AthenaClient, StartQueryExecutionCommand, GetQueryExecutionCommand, GetQueryResultsCommand } = require("@aws-sdk/client-athena");

async function executeAthenaQuery(env, database, sql, limit = 100) {
    const client = new AthenaClient({
        region: CONFIG[env].region,
        credentials: {
            accessKeyId: CONFIG[env].accessKeyId,
            secretAccessKey: CONFIG[env].secretAccessKey
        }
    });

    // 启动查询
    const startCommand = new StartQueryExecutionCommand({
        QueryString: sql,
        QueryExecutionContext: { Database: database },
        ResultConfiguration: {
            OutputLocation: "s3://your-query-results-bucket/"
        }
    });

    const startResult = await client.send(startCommand);
    const queryId = startResult.QueryExecutionId;

    // 轮询状态
    let status;
    do {
        await new Promise(resolve => setTimeout(resolve, 500));
        const getStatusCommand = new GetQueryExecutionCommand({ QueryExecutionId: queryId });
        status = await client.send(getStatusCommand);
    } while (['RUNNING', 'QUEUED'].includes(status.QueryExecution.Status.State));

    if (status.QueryExecution.Status.State === 'SUCCEEDED') {
        const getResultsCommand = new GetQueryResultsCommand({
            QueryExecutionId: queryId,
            MaxResults: limit
        });
        const results = await client.send(getResultsCommand);
        return parseResults(results);
    } else {
        throw new Error(status.QueryExecution.Status.StateChangeReason || 'Query failed');
    }
}
```

---

## 总结

本文档定义了 Athena SQL 查询功能所需的后端 API 接口。核心接口是 `POST /api/aws/athena/query`，用于执行 SQL 查询并返回结果。

后端开发需要注意：
1. 多环境凭证管理
2. SQL 执行安全控制
3. 查询超时和资源限制
4. 审计日志记录

如有任何问题或需要调整接口，请及时沟通。
