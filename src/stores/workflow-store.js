import { ref, computed } from 'vue'
import { defineStore } from 'pinia'
import { workflowEngine, WorkflowStatus, StepStatus } from '@/services/workflow-engine'
import { createWorkflowFromTemplate, getAllTemplates } from '@/services/workflow-templates'
import { workflowExecutor } from '@/services/workflow-executor'
import { workflowApiService } from '@/services/workflow-api-service'

export const useWorkflowStore = defineStore('workflow', () => {
  const workflows = ref([])
  const currentWorkflow = ref(null)
  const currentExecution = ref(null)
  const executionLogs = ref([])
  const executionHistory = ref([])
  const templates = ref([])
  const selectedTemplate = ref(null)
  const isLoading = ref(false)
  const executionProgress = ref(null)

  const workflowCount = computed(() => workflows.value.length)
  const activeWorkflows = computed(() => workflows.value.filter(w => !w.archived))
  const allExecutions = computed(() => {
    return executionHistory.value
      .slice()
      .sort((a, b) => new Date(b.startTime) - new Date(a.startTime))
  })

  function loadTemplates() {
    try {
      templates.value = getAllTemplates()
    } catch (error) {
      console.error('[WorkflowStore] 加载模板失败:', error)
    }
  }

  function saveCurrentExecution() {
    try {
      if (currentExecution.value) {
        const saveData = {
          ...currentExecution.value
        }
        localStorage.setItem('nebula-ops-current-execution', JSON.stringify(saveData))
      }
    } catch (error) {
      console.error('[WorkflowStore] 保存执行状态失败:', error)
    }
  }

  function loadCurrentExecution() {
    try {
      const saved = localStorage.getItem('nebula-ops-current-execution')
      if (saved) {
        const data = JSON.parse(saved)
        if (data && data.id) {
          currentExecution.value = data
          executionProgress.value = {
            totalSteps: data.workflowSnapshot?.steps?.length || 0,
            completedSteps: Object.values(data.stepStatuses || {}).filter(s => s.status === 'completed').length,
            failedSteps: Object.values(data.stepStatuses || {}).filter(s => s.status === 'failed').length,
            runningSteps: Object.values(data.stepStatuses || {}).filter(s => s.status === 'running').length,
            progress: 0,
            status: data.status,
            startTime: data.startTime,
            endTime: data.endTime
          }
          const totalSteps = executionProgress.value.totalSteps
          const completedSteps = executionProgress.value.completedSteps
          executionProgress.value.progress = totalSteps > 0 ? (completedSteps / totalSteps) * 100 : 0
        }
      }
    } catch (error) {
      console.error('[WorkflowStore] 加载执行状态失败:', error)
    }
  }

  function saveExecutionToHistory(execution) {
    try {
      if (!execution) return
      
      const historyRecord = {
        ...JSON.parse(JSON.stringify(execution)),
        savedAt: new Date().toISOString()
      }
      
      const existingIndex = executionHistory.value.findIndex(e => e.id === execution.id)
      if (existingIndex !== -1) {
        executionHistory.value[existingIndex] = historyRecord
      } else {
        executionHistory.value.push(historyRecord)
      }
      
      localStorage.setItem('nebula-ops-execution-history', JSON.stringify(executionHistory.value))
    } catch (error) {
      console.error('[WorkflowStore] 保存执行历史失败:', error)
    }
  }

  function loadExecutionHistory() {
    try {
      const saved = localStorage.getItem('nebula-ops-execution-history')
      if (saved) {
        executionHistory.value = JSON.parse(saved)
      }
    } catch (error) {
      console.error('[WorkflowStore] 加载执行历史失败:', error)
      executionHistory.value = []
    }
  }

  function getWorkflowExecutions(workflowId) {
    return executionHistory.value
      .filter(e => e.workflowId === workflowId)
      .sort((a, b) => new Date(b.startTime) - new Date(a.startTime))
  }

  function getExecutionFromHistory(executionId) {
    return executionHistory.value.find(e => e.id === executionId) || null
  }

  function clearExecutionHistory(workflowId = null) {
    try {
      if (workflowId) {
        executionHistory.value = executionHistory.value.filter(e => e.workflowId !== workflowId)
      } else {
        executionHistory.value = []
      }
      localStorage.setItem('nebula-ops-execution-history', JSON.stringify(executionHistory.value))
    } catch (error) {
      console.error('[WorkflowStore] 清除执行历史失败:', error)
    }
  }

  function clearSavedExecution() {
    try {
      localStorage.removeItem('nebula-ops-current-execution')
    } catch (error) {
      console.error('[WorkflowStore] 清除执行状态失败:', error)
    }
  }

  function refreshExecutionState() {
    if (currentExecution.value) {
      const latestExecution = workflowEngine.getExecution(currentExecution.value.id)
      if (latestExecution) {
        currentExecution.value = JSON.parse(JSON.stringify(latestExecution))
        saveCurrentExecution()
        saveExecutionToHistory(currentExecution.value)
      } else {
        currentExecution.value = JSON.parse(JSON.stringify(currentExecution.value))
        saveCurrentExecution()
        saveExecutionToHistory(currentExecution.value)
      }
    }
  }

  function loadWorkflows() {
    try {
      const saved = localStorage.getItem('nebula-ops-workflows')
      if (saved) {
        workflows.value = JSON.parse(saved)
        workflows.value.forEach(workflow => {
          workflowEngine.registerWorkflow(workflow)
        })
      }
      loadExecutionHistory()
      loadCurrentExecution()
    } catch (error) {
      console.error('[WorkflowStore] 加载工作流失败:', error)
    }
  }

  function saveWorkflows() {
    try {
      localStorage.setItem('nebula-ops-workflows', JSON.stringify(workflows.value))
    } catch (error) {
      console.error('[WorkflowStore] 保存工作流失败:', error)
    }
  }

  function createWorkflow(templateId, customizations = {}) {
    try {
      const workflowData = createWorkflowFromTemplate(templateId, customizations)
      workflows.value.push(workflowData)
      workflowEngine.registerWorkflow(workflowData)
      saveWorkflows()
      return workflowData
    } catch (error) {
      throw error
    }
  }

  function createEmptyWorkflow(name, description = '') {
    const workflow = {
      id: `workflow_${Date.now()}`,
      name,
      description,
      templateId: null,
      steps: [],
      variables: {},
      settings: {
        maxRetries: 3,
        retryDelay: 1000,
        timeout: 600000
      },
      tags: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }
    
    workflows.value.push(workflow)
    workflowEngine.registerWorkflow(workflow)
    saveWorkflows()
    return workflow
  }

  function getWorkflow(id) {
    return workflows.value.find(w => w.id === id)
  }

  function updateWorkflow(id, updates) {
    const index = workflows.value.findIndex(w => w.id === id)
    if (index !== -1) {
      workflows.value[index] = {
        ...workflows.value[index],
        ...updates,
        updatedAt: new Date().toISOString()
      }
      workflowEngine.registerWorkflow(workflows.value[index])
      saveWorkflows()
      return workflows.value[index]
    }
    return null
  }

  function deleteWorkflow(id) {
    const index = workflows.value.findIndex(w => w.id === id)
    if (index !== -1) {
      workflows.value.splice(index, 1)
      workflowEngine.deleteWorkflow(id)
      saveWorkflows()
      return true
    }
    return false
  }

  function setCurrentWorkflow(id) {
    currentWorkflow.value = workflows.value.find(w => w.id === id) || null
  }

  function addStep(workflowId, stepData) {
    const workflow = getWorkflow(workflowId)
    if (workflow) {
      const step = {
        id: `step_${Date.now()}`,
        name: stepData.name || '未命名步骤',
        actionType: stepData.actionType,
        config: stepData.config || {},
        description: stepData.description || '',
        dependsOn: stepData.dependsOn || [],
        retryPolicy: stepData.retryPolicy || {
          enabled: false,
          maxRetries: 3,
          delay: 1000
        },
        timeout: stepData.timeout || 300000
      }
      workflow.steps.push(step)
      workflow.updatedAt = new Date().toISOString()
      workflowEngine.registerWorkflow(workflow)
      saveWorkflows()
      return step
    }
    return null
  }

  function updateStep(workflowId, stepId, updates) {
    const workflow = getWorkflow(workflowId)
    if (workflow) {
      const stepIndex = workflow.steps.findIndex(s => s.id === stepId)
      if (stepIndex !== -1) {
        workflow.steps[stepIndex] = {
          ...workflow.steps[stepIndex],
          ...updates
        }
        workflow.updatedAt = new Date().toISOString()
        workflowEngine.registerWorkflow(workflow)
        saveWorkflows()
        return workflow.steps[stepIndex]
      }
    }
    return null
  }

  function removeStep(workflowId, stepId) {
    const workflow = getWorkflow(workflowId)
    if (workflow) {
      const index = workflow.steps.findIndex(s => s.id === stepId)
      if (index !== -1) {
        workflow.steps.splice(index, 1)
        
        workflow.steps.forEach(step => {
          const depIndex = step.dependsOn.indexOf(stepId)
          if (depIndex !== -1) {
            step.dependsOn.splice(depIndex, 1)
          }
        })
        
        workflow.updatedAt = new Date().toISOString()
        workflowEngine.registerWorkflow(workflow)
        saveWorkflows()
        return true
      }
    }
    return false
  }

  function reorderSteps(workflowId, stepOrder) {
    const workflow = getWorkflow(workflowId)
    if (workflow) {
      const stepMap = new Map(workflow.steps.map(s => [s.id, s]))
      const newSteps = stepOrder.map(id => stepMap.get(id)).filter(Boolean)
      
      if (newSteps.length === workflow.steps.length) {
        workflow.steps = newSteps
        workflow.updatedAt = new Date().toISOString()
        workflowEngine.registerWorkflow(workflow)
        saveWorkflows()
        return true
      }
    }
    return false
  }

  function duplicateWorkflow(workflowId) {
    const workflow = getWorkflow(workflowId)
    if (workflow) {
      const newWorkflow = JSON.parse(JSON.stringify(workflow))
      newWorkflow.id = `workflow_${Date.now()}`
      newWorkflow.name = `${workflow.name} (副本)`
      newWorkflow.createdAt = new Date().toISOString()
      newWorkflow.updatedAt = new Date().toISOString()
      
      workflows.value.push(newWorkflow)
      workflowEngine.registerWorkflow(newWorkflow)
      saveWorkflows()
      return newWorkflow
    }
    return null
  }

  function exportWorkflow(workflowId) {
    const workflow = getWorkflow(workflowId)
    if (workflow) {
      const exportData = {
        ...workflow,
        exportedAt: new Date().toISOString()
      }
      return JSON.stringify(exportData, null, 2)
    }
    return null
  }

  function importWorkflow(jsonString) {
    try {
      const data = JSON.parse(jsonString)
      const newWorkflow = {
        ...data,
        id: `workflow_${Date.now()}`
      }
      delete newWorkflow.exportedAt
      
      workflows.value.push(newWorkflow)
      workflowEngine.registerWorkflow(newWorkflow)
      saveWorkflows()
      return newWorkflow
    } catch (error) {
      throw new Error(`导入失败: ${error.message}`)
    }
  }

  async function executeWorkflow(workflowId, runtimeVariables = {}) {
    const workflow = getWorkflow(workflowId)
    if (!workflow) {
      throw new Error('工作流不存在')
    }

    isLoading.value = true
    executionLogs.value = []
    
    try {
      const execution = workflowEngine.createExecution(workflowId, runtimeVariables)
      currentExecution.value = execution
      saveCurrentExecution()

      try {
        const apiResult = await workflowApiService.startExecution(workflowId, {
          ...runtimeVariables,
          workflowSnapshot: workflow
        })
        
        if (apiResult && apiResult.executionId) {
          execution.id = apiResult.executionId
          execution.status = WorkflowStatus.RUNNING
          execution.startTime = Date.now()
          
          executionLogs.value.push({
            type: 'workflow_started',
            workflowId,
            workflowName: workflow.name,
            message: `工作流已提交到后端执行: ${workflow.name}`,
            timestamp: new Date().toISOString()
          })

          workflowApiService.startPolling(
            apiResult.executionId,
            (statusUpdate) => {
              updateExecutionFromApiResponse(statusUpdate)
            }
          )

          const finalStatus = await waitForExecutionComplete(apiResult.executionId)
          
          isLoading.value = false
          return finalStatus
        }
      } catch (apiError) {
        console.log('后端 API 执行失败，回退到本地执行:', apiError)
        executionLogs.value.push({
          type: 'info',
          message: '后端 API 不可用，使用本地执行模式',
          timestamp: new Date().toISOString()
        })
      }

      return await executeLocally(workflowId, runtimeVariables, execution)
      
    } catch (error) {
      isLoading.value = false
      refreshExecutionState()
      throw error
    }
  }

  async function executeLocally(workflowId, runtimeVariables = {}, execution = null) {
    const workflow = getWorkflow(workflowId)
    if (!workflow) {
      throw new Error('工作流不存在')
    }

    if (!execution) {
      execution = workflowEngine.createExecution(workflowId, runtimeVariables)
      currentExecution.value = execution
      saveCurrentExecution()
    }

    workflowEngine.registerWorkflow(workflow)
    
    workflowExecutor.subscribe(execution.id, (event) => {
      executionLogs.value.push({
        ...event,
        timestamp: event.timestamp || new Date().toISOString()
      })
      
      if (['step_started', 'step_completed', 'step_failed', 'step_retry'].includes(event.type)) {
        executionProgress.value = workflowEngine.getExecutionProgress(execution.id)
        refreshExecutionState()
      }
      
      if (['workflow_completed', 'workflow_failed'].includes(event.type)) {
        refreshExecutionState()
      }
    })
    
    const result = await workflowExecutor.startExecution(execution, workflowEngine)
    
    isLoading.value = false
    
    executionProgress.value = workflowEngine.getExecutionProgress(execution.id)
    refreshExecutionState()
    
    return result
  }

  function updateExecutionFromApiResponse(apiResponse) {
    if (!currentExecution.value) return

    if (apiResponse.status) {
      currentExecution.value.status = apiResponse.status
    }
    
    if (apiResponse.stepStatuses) {
      currentExecution.value.stepStatuses = apiResponse.stepStatuses
    }

    if (apiResponse.stepResults) {
      currentExecution.value.stepResults = apiResponse.stepResults
    }

    if (apiResponse.logs) {
      apiResponse.logs.forEach(log => {
        const exists = executionLogs.value.some(
          existing => existing.timestamp === log.timestamp && existing.message === log.message
        )
        if (!exists) {
          executionLogs.value.push({
            ...log,
            timestamp: log.timestamp || new Date().toISOString()
          })
        }
      })
    }

    if (apiResponse.startTime) {
      currentExecution.value.startTime = new Date(apiResponse.startTime).getTime()
    }

    if (apiResponse.endTime) {
      currentExecution.value.endTime = new Date(apiResponse.endTime).getTime()
    }

    if (apiResponse.error) {
      currentExecution.value.error = apiResponse.error
    }

    executionProgress.value = calculateProgress(currentExecution.value)
    saveCurrentExecution()
    saveExecutionToHistory(currentExecution.value)
  }

  function calculateProgress(execution) {
    if (!execution || !execution.workflowSnapshot) return null

    const totalSteps = execution.workflowSnapshot.steps?.length || 0
    const stepStatusValues = Object.values(execution.stepStatuses || {})
    const completedSteps = stepStatusValues.filter(
      s => s.status === StepStatus.COMPLETED
    ).length
    const failedSteps = stepStatusValues.filter(
      s => s.status === StepStatus.FAILED
    ).length
    const runningSteps = stepStatusValues.filter(
      s => s.status === StepStatus.RUNNING
    ).length

    return {
      totalSteps,
      completedSteps,
      failedSteps,
      runningSteps,
      progress: totalSteps > 0 ? (completedSteps / totalSteps) * 100 : 0,
      status: execution.status,
      startTime: execution.startTime,
      endTime: execution.endTime
    }
  }

  async function waitForExecutionComplete(executionId, timeout = 300000) {
    const startTime = Date.now()
    const pollInterval = 2000

    while (Date.now() - startTime < timeout) {
      try {
        const status = await workflowApiService.getExecutionStatus(executionId)
        updateExecutionFromApiResponse(status)

        if (status.status === WorkflowStatus.COMPLETED) {
          workflowApiService.stopPolling(executionId)
          return { success: true, executionId, status: status.status }
        }

        if (status.status === WorkflowStatus.FAILED) {
          workflowApiService.stopPolling(executionId)
          return { success: false, executionId, status: status.status, error: status.error }
        }

        if (status.status === WorkflowStatus.CANCELLED) {
          workflowApiService.stopPolling(executionId)
          return { success: false, executionId, status: status.status, error: '执行已取消' }
        }

        await new Promise(resolve => setTimeout(resolve, pollInterval))
      } catch (error) {
        console.error('轮询执行状态失败:', error)
        await new Promise(resolve => setTimeout(resolve, pollInterval))
      }
    }

    workflowApiService.stopPolling(executionId)
    throw new Error('执行超时')
  }

  function getExecutionLogs() {
    return executionLogs.value
  }

  function clearExecutionState() {
    currentExecution.value = null
    executionLogs.value = []
    executionProgress.value = null
    clearSavedExecution()
  }

  function setSelectedTemplate(templateId) {
    if (templateId) {
      selectedTemplate.value = templates.value.find(t => t.id === templateId) || null
    } else {
      selectedTemplate.value = null
    }
  }

  return {
    workflows,
    currentWorkflow,
    currentExecution,
    executionLogs,
    executionHistory,
    templates,
    selectedTemplate,
    isLoading,
    executionProgress,
    workflowCount,
    activeWorkflows,
    allExecutions,
    loadTemplates,
    loadWorkflows,
    saveWorkflows,
    createWorkflow,
    createEmptyWorkflow,
    getWorkflow,
    updateWorkflow,
    deleteWorkflow,
    setCurrentWorkflow,
    addStep,
    updateStep,
    removeStep,
    reorderSteps,
    duplicateWorkflow,
    exportWorkflow,
    importWorkflow,
    executeWorkflow,
    getExecutionLogs,
    clearExecutionState,
    setSelectedTemplate,
    saveExecutionToHistory,
    loadExecutionHistory,
    getWorkflowExecutions,
    getExecutionFromHistory,
    clearExecutionHistory
  }
})
