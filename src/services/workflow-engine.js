export const WorkflowStatus = {
  IDLE: 'idle',
  RUNNING: 'running',
  PAUSED: 'paused',
  COMPLETED: 'completed',
  FAILED: 'failed',
  CANCELLED: 'cancelled'
}

export const StepStatus = {
  PENDING: 'pending',
  RUNNING: 'running',
  COMPLETED: 'completed',
  FAILED: 'failed',
  SKIPPED: 'skipped'
}

export const ActionType = {
  JENKINS_EXECUTE: 'jenkins_execute',
  AWS_ECS_CHECK: 'aws_ecs_check',
  WEWORK_NOTIFICATION: 'wework_notification',
  WEBHOOK: 'webhook'
}

export const ActionTypeInfo = {
  [ActionType.JENKINS_EXECUTE]: {
    name: 'Jenkins 任务执行',
    description: '触发并监控 Jenkins 构建任务',
    icon: '🏗️',
    category: '集成'
  },
  [ActionType.AWS_ECS_CHECK]: {
    name: 'AWS ECS 服务检查',
    description: '检查 AWS ECS 服务更新状态',
    icon: '☁️',
    category: '集成'
  },
  [ActionType.WEWORK_NOTIFICATION]: {
    name: '企业微信通知',
    description: '通过企业微信机器人发送通知',
    icon: '💬',
    category: '通知'
  },
  [ActionType.WEBHOOK]: {
    name: 'Webhook 调用',
    description: '调用外部 Webhook 接口',
    icon: '🔗',
    category: '集成'
  }
}

export class WorkflowEngine {
  constructor() {
    this.workflows = new Map()
    this.executions = new Map()
  }

  createWorkflow(workflowData) {
    const workflow = {
      id: workflowData.id || `workflow_${Date.now()}`,
      name: workflowData.name || '未命名工作流',
      description: workflowData.description || '',
      steps: workflowData.steps || [],
      variables: workflowData.variables || {},
      settings: workflowData.settings || {
        maxRetries: 3,
        retryDelay: 1000,
        timeout: 300000
      },
      createdAt: workflowData.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      version: workflowData.version || 1
    }

    this.workflows.set(workflow.id, workflow)
    return workflow
  }

  registerWorkflow(workflowData) {
    const existingWorkflow = this.workflows.get(workflowData.id)
    if (existingWorkflow) {
      return this.updateWorkflow(workflowData.id, workflowData)
    }
    return this.createWorkflow(workflowData)
  }

  updateWorkflow(workflowId, updates) {
    const workflow = this.workflows.get(workflowId)
    if (!workflow) {
      throw new Error(`Workflow not found: ${workflowId}`)
    }

    const updatedWorkflow = {
      ...workflow,
      ...updates,
      updatedAt: new Date().toISOString(),
      version: workflow.version + 1
    }

    this.workflows.set(workflowId, updatedWorkflow)
    return updatedWorkflow
  }

  getWorkflow(workflowId) {
    return this.workflows.get(workflowId)
  }

  getAllWorkflows() {
    return Array.from(this.workflows.values())
  }

  deleteWorkflow(workflowId) {
    return this.workflows.delete(workflowId)
  }

  addStep(workflowId, stepData, position = null) {
    const workflow = this.workflows.get(workflowId)
    if (!workflow) {
      throw new Error(`Workflow not found: ${workflowId}`)
    }

    const step = {
      id: stepData.id || `step_${Date.now()}`,
      name: stepData.name || '未命名步骤',
      actionType: stepData.actionType || ActionType.WEBHOOK,
      config: stepData.config || {},
      conditions: stepData.conditions || [],
      retryPolicy: stepData.retryPolicy || {
        enabled: false,
        maxRetries: 3,
        delay: 1000
      },
      timeout: stepData.timeout || 300000,
      description: stepData.description || '',
      dependsOn: stepData.dependsOn || []
    }

    if (position !== null && position >= 0 && position <= workflow.steps.length) {
      workflow.steps.splice(position, 0, step)
    } else {
      workflow.steps.push(step)
    }

    workflow.updatedAt = new Date().toISOString()
    this.workflows.set(workflowId, workflow)
    return step
  }

  removeStep(workflowId, stepId) {
    const workflow = this.workflows.get(workflowId)
    if (!workflow) {
      throw new Error(`Workflow not found: ${workflowId}`)
    }

    const index = workflow.steps.findIndex(s => s.id === stepId)
    if (index !== -1) {
      workflow.steps.splice(index, 1)
      workflow.updatedAt = new Date().toISOString()
      this.workflows.set(workflowId, workflow)
      return true
    }
    return false
  }

  updateStep(workflowId, stepId, updates) {
    const workflow = this.workflows.get(workflowId)
    if (!workflow) {
      throw new Error(`Workflow not found: ${workflowId}`)
    }

    const stepIndex = workflow.steps.findIndex(s => s.id === stepId)
    if (stepIndex === -1) {
      throw new Error(`Step not found: ${stepId}`)
    }

    workflow.steps[stepIndex] = {
      ...workflow.steps[stepIndex],
      ...updates
    }
    workflow.updatedAt = new Date().toISOString()
    this.workflows.set(workflowId, workflow)
    return workflow.steps[stepIndex]
  }

  reorderSteps(workflowId, stepOrder) {
    const workflow = this.workflows.get(workflowId)
    if (!workflow) {
      throw new Error(`Workflow not found: ${workflowId}`)
    }

    const stepMap = new Map(workflow.steps.map(s => [s.id, s]))
    const newSteps = stepOrder.map(id => stepMap.get(id)).filter(Boolean)

    if (newSteps.length !== workflow.steps.length) {
      throw new Error('Invalid step order: some steps missing')
    }

    workflow.steps = newSteps
    workflow.updatedAt = new Date().toISOString()
    this.workflows.set(workflowId, workflow)
    return workflow
  }

  validateWorkflow(workflow) {
    const issues = []

    if (!workflow.name || workflow.name.trim() === '') {
      issues.push({
        type: 'error',
        message: '工作流名称不能为空',
        field: 'name'
      })
    }

    if (!workflow.steps || workflow.steps.length === 0) {
      issues.push({
        type: 'warning',
        message: '工作流没有任何步骤',
        field: 'steps'
      })
    }

    const stepIds = new Set()
    workflow.steps.forEach((step, index) => {
      if (stepIds.has(step.id)) {
        issues.push({
          type: 'error',
          message: `步骤 ${step.id} 重复定义`,
          field: `steps[${index}].id`
        })
      }
      stepIds.add(step.id)

      if (!ActionTypeInfo[step.actionType]) {
        issues.push({
          type: 'error',
          message: `步骤 ${step.name} 使用了未知的动作类型: ${step.actionType}`,
          field: `steps[${index}].actionType`
        })
      }

      step.dependsOn.forEach(depId => {
        if (!stepIds.has(depId)) {
          issues.push({
            type: 'warning',
            message: `步骤 ${step.name} 依赖的步骤 ${depId} 不存在`,
            field: `steps[${index}].dependsOn`
          })
        }
      })
    })

    return {
      valid: issues.filter(i => i.type === 'error').length === 0,
      issues
    }
  }

  createExecution(workflowId, runtimeVariables = {}) {
    const workflow = this.workflows.get(workflowId)
    if (!workflow) {
      throw new Error(`Workflow not found: ${workflowId}`)
    }

    const execution = {
      id: `exec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      workflowId: workflowId,
      workflowSnapshot: JSON.parse(JSON.stringify(workflow)),
      status: WorkflowStatus.IDLE,
      variables: {
        ...workflow.variables,
        ...runtimeVariables
      },
      stepResults: {},
      stepStatuses: {},
      logs: [],
      startTime: null,
      endTime: null,
      currentStepIndex: 0,
      error: null,
      createdAt: new Date().toISOString()
    }

    workflow.steps.forEach(step => {
      execution.stepStatuses[step.id] = {
        status: StepStatus.PENDING,
        startTime: null,
        endTime: null,
        retries: 0,
        error: null
      }
    })

    this.executions.set(execution.id, execution)
    return execution
  }

  getExecution(executionId) {
    return this.executions.get(executionId)
  }

  getAllExecutions() {
    return Array.from(this.executions.values())
  }

  getExecutionProgress(executionId) {
    const execution = this.executions.get(executionId)
    if (!execution) {
      return null
    }

    const totalSteps = execution.workflowSnapshot.steps.length
    const stepStatusValues = Object.values(execution.stepStatuses)
    const completedSteps = stepStatusValues.filter(
      s => s.status === StepStatus.COMPLETED
    ).length
    const failedSteps = stepStatusValues.filter(
      s => s.status === StepStatus.FAILED
    ).length

    return {
      totalSteps,
      completedSteps,
      failedSteps,
      runningSteps: stepStatusValues.filter(
        s => s.status === StepStatus.RUNNING
      ).length,
      progress: totalSteps > 0 ? (completedSteps / totalSteps) * 100 : 0,
      status: execution.status,
      startTime: execution.startTime,
      endTime: execution.endTime
    }
  }
}

export const workflowEngine = new WorkflowEngine()
