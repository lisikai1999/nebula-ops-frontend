# ArchitectureVisualizer 接口开发文档

## 1. 接口概述

ArchitectureVisualizer 是一个 AWS 架构图可视化组件，需要后端提供以下接口：

1. **获取 AWS 环境列表**：用于用户选择要操作的 AWS 环境
2. **采集资源**：根据用户选择的环境和输入的 ECS 服务 ARN，采集相关 AWS 资源并返回给前端，前端将这些资源展示为架构图

## 2. 接口详情

### 2.1 获取 AWS 环境列表

- **接口路径**：`/api/aws/environments`
- **请求方法**：GET
- **请求参数**：无
- **响应格式**：JSON
- **响应结构**：
  ```json
  {
    "status": "success",
    "data": [
      {
        "id": "环境唯一标识",
        "name": "环境名称",
        "is_default": "是否为默认环境（布尔值）"
      }
    ]
  }
  ```

- **响应字段说明**：
  - `id`：环境的唯一标识符，用于后续操作中指定环境
  - `name`：环境的友好名称，用于在前端界面中显示
  - `is_default`：标识该环境是否为默认环境，前端会优先选择默认环境

- **错误响应**：
  ```json
  {
    "status": "error",
    "message": "错误描述信息"
  }
  ```

### 2.2 采集资源

- **接口路径**：`/api/aws/collect-resources`
- **请求方法**：GET
- **请求参数**：
  | 参数名 | 类型 | 是否必填 | 说明 |
  |--------|------|----------|------|
  | env | string | 是 | AWS 环境名称 |
  | ecs_service_arn | string | 是 | ECS 服务 ARN |

- **响应格式**：JSON
- **响应结构**：
  ```json
  {
    "status": "success",
    "data": {
      "vpc": "VPC 信息对象",
      "subnets": "子网列表",
      "securityGroups": "安全组列表",
      "cluster": "ECS 集群信息",
      "service": "ECS 服务信息",
      "tasks": "ECS 任务列表",
      "containers": "容器列表",
      "loadBalancers": "负载均衡器列表",
      "targetGroups": "目标组列表",
      "databases": "数据库列表",
      "caches": "缓存列表",
      "buckets": "存储桶列表",
      "cloudWatch": "CloudWatch 信息"
    }
  }
  ```

- **数据对象详细说明**：

  **1. VPC 信息对象**：
  - `name`：VPC 名称
  - `id`：VPC ID
  - `arn`：VPC ARN（可选）

  **2. 子网列表**：
  - `name`：子网名称
  - `id`：子网 ID
  - `availabilityZone`：可用区
  - `arn`：子网 ARN（可选）

  **3. 安全组列表**：
  - `name`：安全组名称
  - `id`：安全组 ID
  - `inboundRules`：入站规则数量
  - `outboundRules`：出站规则数量

  **4. ECS 集群信息**：
  - `name`：集群名称
  - `status`：集群状态
  - `services`：服务数量
  - `tasks`：任务数量
  - `arn`：集群 ARN

  **5. ECS 服务信息**：
  - `name`：服务名称
  - `desiredCount`：期望任务数
  - `runningCount`：运行中任务数
  - `pendingCount`：待处理任务数
  - `arn`：服务 ARN

  **6. ECS 任务列表**：
  - `lastStatus`：最后状态
  - `cpu`：CPU 配置
  - `memory`：内存配置
  - `taskArn`：任务 ARN

  **7. 容器列表**：
  - `name`：容器名称
  - `image`：镜像地址
  - `lastStatus`：最后状态

  **8. 负载均衡器列表**：
  - `name`：负载均衡器名称
  - `type`：类型（如 application）
  - `dnsName`：DNS 名称
  - `state`：状态
  - `arn`：负载均衡器 ARN

  **9. 目标组列表**：
  - `name`：目标组名称
  - `protocol`：协议（如 HTTP）
  - `port`：端口
  - `targetType`：目标类型（如 ip）
  - `arn`：目标组 ARN

  **10. 数据库列表**：
  - `name`：数据库名称
  - `engine`：引擎类型（如 aurora-mysql）
  - `instanceClass`：实例类型
  - `status`：状态
  - `arn`：数据库 ARN

  **11. 缓存列表**：
  - `name`：缓存名称
  - `engine`：引擎类型（如 redis）
  - `nodeCount`：节点数量
  - `status`：状态
  - `arn`：缓存 ARN

  **12. 存储桶列表**：
  - `name`：存储桶名称
  - `region`：区域
  - `arn`：存储桶 ARN（可选）

  **13. CloudWatch 信息**：
  - `logGroups`：日志组数量
  - `alarms`：告警数量

- **错误响应**：
  ```json
  {
    "status": "error",
    "message": "错误描述信息"
  }
  ```

## 3. 注意事项

1. 所有接口的响应都应包含 `status` 字段，值为 `success` 或 `error`
2. 采集资源接口需要根据用户提供的 ECS 服务 ARN，解析出相关的集群、任务、容器等信息，并关联查找相关的负载均衡器、目标组、数据库、缓存、存储桶等资源
3. 对于可选字段（如 ARN），如果无法获取可以返回空字符串或不包含该字段
4. 对于列表类型的数据，如子网、安全组等，应返回完整的列表，前端会根据需要进行展示
5. 接口应确保响应时间合理，避免过长时间的等待，可考虑使用异步处理或缓存机制
6. 错误响应应包含明确的错误信息，以便前端能够向用户展示具体的错误原因