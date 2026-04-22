import { ActionType } from './workflow-engine'

export const WorkflowTemplate = {
  DEPLOYMENT_PIPELINE: 'deployment_pipeline',
  SERVICE_HEALTH_CHECK: 'service_health_check',
  DAILY_NOTIFICATION: 'daily_notification',
  CUSTOM: 'custom'
}

export const WorkflowTemplateInfo = {
  [WorkflowTemplate.DEPLOYMENT_PIPELINE]: {
    id: WorkflowTemplate.DEPLOYMENT_PIPELINE,
    name: '部署流水线',
    description: '从 Jenkins 构建到 ECS 部署的完整自动化流程',
    icon: '🚀',
    category: '部署管理',
    tags: ['Jenkins', 'ECS', '部署', '自动化'],
    steps: [
      {
        id: 'step_1_jenkins_build',
        name: '触发 Jenkins 构建',
        actionType: ActionType.JENKINS_EXECUTE,
        description: '触发 Jenkins 构建任务并等待完成',
        config: {
          jenkinsUrl: 'https://jenkins.example.com',
          jobName: 'my-service-build',
          username: '',
          apiToken: '',
          waitForBuild: true,
          pollInterval: 5000,
          timeout: 300000,
          parameters: {}
        },
        retryPolicy: {
          enabled: false,
          maxRetries: 3,
          delay: 5000
        },
        timeout: 600000,
        dependsOn: []
      },
      {
        id: 'step_2_ecs_check',
        name: '检查 ECS 服务更新',
        actionType: ActionType.AWS_ECS_CHECK,
        description: '检查 AWS ECS 服务部署完成状态',
        config: {
          region: 'cn-north-1',
          cluster: 'my-cluster',
          serviceName: 'my-service',
          expectedCount: null,
          checkInterval: 30000,
          maxRetries: 10,
          accessKeyId: '',
          secretAccessKey: ''
        },
        retryPolicy: {
          enabled: false,
          maxRetries: 3,
          delay: 10000
        },
        timeout: 600000,
        dependsOn: ['step_1_jenkins_build']
      },
      {
        id: 'step_3_notify',
        name: '发送部署完成通知',
        actionType: ActionType.WEWORK_NOTIFICATION,
        description: '通过企业微信发送部署完成通知',
        config: {
          webhookUrl: 'https://qyapi.weixin.qq.com/cgi-bin/webhook/send?key=xxx',
          messageType: 'text',
          content: '部署完成通知：服务 {{serviceName}} 已成功部署到 ECS 集群 {{cluster}}',
          title: '',
          description: '',
          url: '',
          picUrl: '',
          mentions: [],
          mentionAll: false
        },
        retryPolicy: {
          enabled: true,
          maxRetries: 3,
          delay: 5000
        },
        timeout: 60000,
        dependsOn: ['step_2_ecs_check']
      }
    ],
    variables: {
      jenkinsUrl: 'https://jenkins.example.com',
      jenkinsJob: 'my-service-build',
      awsRegion: 'cn-north-1',
      ecsCluster: 'my-cluster',
      ecsService: 'my-service',
      weworkWebhook: 'https://qyapi.weixin.qq.com/cgi-bin/webhook/send?key=xxx',
      serviceName: 'my-service'
    },
    settings: {
      maxRetries: 3,
      retryDelay: 5000,
      timeout: 1800000
    }
  },

  [WorkflowTemplate.SERVICE_HEALTH_CHECK]: {
    id: WorkflowTemplate.SERVICE_HEALTH_CHECK,
    name: '服务健康检查',
    description: '定期检查 ECS 服务健康状态并发送通知',
    icon: '❤️',
    category: '运维管理',
    tags: ['ECS', '健康检查', '监控', '通知'],
    steps: [
      {
        id: 'step_1_ecs_health',
        name: '检查 ECS 服务状态',
        actionType: ActionType.AWS_ECS_CHECK,
        description: '检查 AWS ECS 服务健康状态',
        config: {
          region: 'cn-north-1',
          cluster: 'my-cluster',
          serviceName: 'my-service',
          expectedCount: 2,
          checkInterval: 10000,
          maxRetries: 3,
          accessKeyId: '',
          secretAccessKey: ''
        },
        retryPolicy: {
          enabled: false,
          maxRetries: 3,
          delay: 5000
        },
        timeout: 120000,
        dependsOn: []
      },
      {
        id: 'step_2_health_webhook',
        name: '调用健康检查 Webhook',
        actionType: ActionType.WEBHOOK,
        description: '调用外部健康检查 Webhook',
        config: {
          url: 'https://monitor.example.com/api/health',
          method: 'POST',
          payload: {
            service: '{{serviceName}}',
            status: '{{step_1_ecs_health.data.status}}',
            runningCount: '{{step_1_ecs_health.data.runningCount}}'
          },
          headers: {
            'Content-Type': 'application/json'
          },
          validateResponse: false,
          expectedStatusCode: 200,
          timeout: 30000
        },
        retryPolicy: {
          enabled: true,
          maxRetries: 2,
          delay: 5000
        },
        timeout: 60000,
        dependsOn: ['step_1_ecs_health']
      },
      {
        id: 'step_3_notify',
        name: '发送健康状态通知',
        actionType: ActionType.WEWORK_NOTIFICATION,
        description: '通过企业微信发送健康状态通知',
        config: {
          webhookUrl: 'https://qyapi.weixin.qq.com/cgi-bin/webhook/send?key=xxx',
          messageType: 'markdown',
          content: '# 服务健康检查报告\n\n- **服务名称**: {{serviceName}}\n- **集群**: {{ecsCluster}}\n- **状态**: {{step_1_ecs_health.data.status}}\n- **运行实例数**: {{step_1_ecs_health.data.runningCount}}/{{step_1_ecs_health.data.desiredCount}}',
          title: '',
          description: '',
          url: '',
          picUrl: '',
          mentions: [],
          mentionAll: false
        },
        retryPolicy: {
          enabled: true,
          maxRetries: 3,
          delay: 5000
        },
        timeout: 60000,
        dependsOn: ['step_2_health_webhook']
      }
    ],
    variables: {
      awsRegion: 'cn-north-1',
      ecsCluster: 'my-cluster',
      ecsService: 'my-service',
      serviceName: 'my-service',
      monitorWebhook: 'https://monitor.example.com/api/health',
      weworkWebhook: 'https://qyapi.weixin.qq.com/cgi-bin/webhook/send?key=xxx'
    },
    settings: {
      maxRetries: 3,
      retryDelay: 5000,
      timeout: 600000
    }
  },

  [WorkflowTemplate.DAILY_NOTIFICATION]: {
    id: WorkflowTemplate.DAILY_NOTIFICATION,
    name: '日常通知流程',
    description: '定时发送日常运维通知的工作流模板',
    icon: '📢',
    category: '通知管理',
    tags: ['通知', '企业微信', '自动化', '日报'],
    steps: [
      {
        id: 'step_1_get_status',
        name: '获取服务状态',
        actionType: ActionType.WEBHOOK,
        description: '调用 API 获取服务状态数据',
        config: {
          url: 'https://api.example.com/status/daily',
          method: 'GET',
          headers: {
            'Content-Type': 'application/json'
          },
          validateResponse: true,
          expectedStatusCode: 200,
          timeout: 30000
        },
        retryPolicy: {
          enabled: true,
          maxRetries: 3,
          delay: 10000
        },
        timeout: 60000,
        dependsOn: []
      },
      {
        id: 'step_2_send_notification',
        name: '发送日常通知',
        actionType: ActionType.WEWORK_NOTIFICATION,
        description: '发送日常运维通知到企业微信',
        config: {
          webhookUrl: 'https://qyapi.weixin.qq.com/cgi-bin/webhook/send?key=xxx',
          messageType: 'template_card',
          content: '{{step_1_get_status.data.summary}}',
          title: '日常运维日报',
          description: '今日服务运行状态汇总',
          url: 'https://dashboard.example.com',
          picUrl: '',
          mentions: [],
          mentionAll: false
        },
        retryPolicy: {
          enabled: true,
          maxRetries: 3,
          delay: 5000
        },
        timeout: 60000,
        dependsOn: ['step_1_get_status']
      }
    ],
    variables: {
      statusApi: 'https://api.example.com/status/daily',
      weworkWebhook: 'https://qyapi.weixin.qq.com/cgi-bin/webhook/send?key=xxx',
      dashboardUrl: 'https://dashboard.example.com'
    },
    settings: {
      maxRetries: 3,
      retryDelay: 5000,
      timeout: 300000
    }
  }
}

export const WorkflowCategory = {
  '部署管理': [
    WorkflowTemplate.DEPLOYMENT_PIPELINE
  ],
  '运维管理': [
    WorkflowTemplate.SERVICE_HEALTH_CHECK
  ],
  '通知管理': [
    WorkflowTemplate.DAILY_NOTIFICATION
  ]
}

export function getTemplateById(templateId) {
  return WorkflowTemplateInfo[templateId]
}

export function getTemplatesByCategory(category) {
  const templateIds = WorkflowCategory[category] || []
  return templateIds.map(id => WorkflowTemplateInfo[id]).filter(Boolean)
}

export function getAllTemplates() {
  return Object.values(WorkflowTemplateInfo)
}

export function createWorkflowFromTemplate(templateId, customizations = {}) {
  const template = WorkflowTemplateInfo[templateId]
  if (!template) {
    throw new Error(`Template not found: ${templateId}`)
  }

  return {
    id: `workflow_${Date.now()}`,
    name: customizations.name || template.name,
    description: customizations.description || template.description,
    templateId: templateId,
    steps: JSON.parse(JSON.stringify(template.steps)),
    variables: {
      ...template.variables,
      ...customizations.variables
    },
    settings: {
      ...template.settings,
      ...customizations.settings
    },
    tags: [...template.tags],
    createdAt: new Date().toISOString()
  }
}

export function getStepConfigSchema(actionType) {
  const configSchemas = {
    [ActionType.JENKINS_EXECUTE]: {
      jenkinsUrl: {
        type: 'text',
        label: 'Jenkins URL',
        placeholder: 'https://jenkins.example.com',
        required: true
      },
      jobName: {
        type: 'text',
        label: 'Job 名称',
        placeholder: 'my-job-name',
        required: true
      },
      username: {
        type: 'text',
        label: '用户名 (可选)',
        placeholder: 'admin',
        required: false
      },
      apiToken: {
        type: 'password',
        label: 'API Token (可选)',
        placeholder: 'jenkins-api-token',
        required: false
      },
      waitForBuild: {
        type: 'checkbox',
        label: '等待构建完成',
        default: true,
        required: false
      },
      pollInterval: {
        type: 'number',
        label: '轮询间隔 (毫秒)',
        default: 5000,
        required: false
      },
      timeout: {
        type: 'number',
        label: '超时时间 (毫秒)',
        default: 300000,
        required: false
      }
    },
    [ActionType.AWS_ECS_CHECK]: {
      region: {
        type: 'select',
        label: 'AWS 区域',
        options: [
          { value: 'us-east-1', label: 'US East (N. Virginia)' },
          { value: 'us-west-2', label: 'US West (Oregon)' },
          { value: 'eu-west-1', label: 'EU (Ireland)' },
          { value: 'ap-northeast-1', label: 'Asia Pacific (Tokyo)' },
          { value: 'ap-southeast-1', label: 'Asia Pacific (Singapore)' },
          { value: 'cn-north-1', label: 'China (Beijing)' },
          { value: 'cn-northwest-1', label: 'China (Ningxia)' }
        ],
        required: true
      },
      cluster: {
        type: 'text',
        label: '集群名称',
        placeholder: 'my-cluster',
        required: true
      },
      serviceName: {
        type: 'text',
        label: '服务名称',
        placeholder: 'my-service',
        required: true
      },
      expectedCount: {
        type: 'number',
        label: '期望运行任务数 (可选)',
        placeholder: '留空使用服务当前 desired count',
        required: false
      },
      checkInterval: {
        type: 'number',
        label: '检查间隔 (毫秒)',
        default: 30000,
        required: false
      },
      maxRetries: {
        type: 'number',
        label: '最大重试次数',
        default: 10,
        required: false
      },
      accessKeyId: {
        type: 'text',
        label: 'AWS Access Key ID (可选)',
        placeholder: 'AKIAIOSFODNN7EXAMPLE',
        required: false
      },
      secretAccessKey: {
        type: 'password',
        label: 'AWS Secret Access Key (可选)',
        placeholder: 'wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY',
        required: false
      }
    },
    [ActionType.WEWORK_NOTIFICATION]: {
      webhookUrl: {
        type: 'text',
        label: '机器人 Webhook URL',
        placeholder: 'https://qyapi.weixin.qq.com/cgi-bin/webhook/send?key=xxx',
        required: true
      },
      messageType: {
        type: 'select',
        label: '消息类型',
        options: [
          { value: 'text', label: '文本消息' },
          { value: 'markdown', label: 'Markdown 消息' },
          { value: 'news', label: '图文消息' },
          { value: 'template_card', label: '模板卡片' }
        ],
        default: 'text',
        required: true
      },
      content: {
        type: 'textarea',
        label: '消息内容',
        placeholder: '输入消息内容... (支持变量占位符: {{variableName}})',
        required: true
      },
      title: {
        type: 'text',
        label: '标题 (图文/卡片)',
        placeholder: '消息标题',
        required: false
      },
      description: {
        type: 'textarea',
        label: '描述 (图文/卡片)',
        placeholder: '消息描述',
        required: false
      },
      url: {
        type: 'text',
        label: '跳转链接',
        placeholder: 'https://example.com',
        required: false
      },
      picUrl: {
        type: 'text',
        label: '图片 URL (图文)',
        placeholder: 'https://example.com/image.png',
        required: false
      },
      mentionAll: {
        type: 'checkbox',
        label: '@所有人',
        required: false
      },
      mentions: {
        type: 'text',
        label: '@提及用户 (逗号分隔)',
        placeholder: 'user1,user2',
        required: false
      }
    },
    [ActionType.WEBHOOK]: {
      url: {
        type: 'text',
        label: 'Webhook URL',
        placeholder: 'https://example.com/webhook',
        required: true
      },
      method: {
        type: 'select',
        label: 'HTTP 方法',
        options: [
          { value: 'GET', label: 'GET' },
          { value: 'POST', label: 'POST' },
          { value: 'PUT', label: 'PUT' },
          { value: 'DELETE', label: 'DELETE' }
        ],
        default: 'POST',
        required: true
      },
      payload: {
        type: 'json',
        label: '请求体 (JSON)',
        placeholder: '{"key": "value"}',
        required: false
      },
      headers: {
        type: 'json',
        label: '请求头 (JSON)',
        placeholder: '{"Content-Type": "application/json"}',
        required: false
      },
      validateResponse: {
        type: 'checkbox',
        label: '验证响应状态码',
        required: false
      },
      expectedStatusCode: {
        type: 'number',
        label: '期望状态码',
        default: 200,
        required: false
      },
      timeout: {
        type: 'number',
        label: '超时时间 (毫秒)',
        default: 30000,
        required: false
      }
    },
    [ActionType.DELAY]: {
      delay: {
        type: 'number',
        label: '延迟时间 (毫秒)',
        default: 1000,
        required: true
      },
      requireApproval: {
        type: 'checkbox',
        label: '需要人工审批',
        required: false
      },
      approvers: {
        type: 'text',
        label: '审批人 (逗号分隔)',
        placeholder: 'user1,user2',
        required: false
      }
    },
    [ActionType.CONDITION]: {
      condition: {
        type: 'textarea',
        label: '条件表达式',
        placeholder: '例如: variables.status === "success" 或 stepResults.step_1.data.value > 0',
        required: true
      }
    },
    [ActionType.CUSTOM_ACTION]: {
      script: {
        type: 'textarea',
        label: '自定义脚本',
        placeholder: '// 使用 context.variables 访问变量\n// 使用 context.stepResults 访问步骤结果\n// 使用 context.logs 记录日志\n// 使用 context.output 设置输出\n\ncontext.logs.push({ level: "info", message: "执行自定义动作" });\ncontext.output = { result: "success" };',
        required: false
      }
    }
  }

  return configSchemas[actionType] || {}
}
