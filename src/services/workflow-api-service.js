import { useAuthStore } from '../stores/auth-store'
import { WorkflowStatus, StepStatus } from './workflow-engine'

export class WorkflowApiService {
  constructor() {
    this.baseUrl = '/api/workflow'
    this.pollingExecutions = new Map()
  }

  getAuthHeaders() {
    const authStore = useAuthStore()
    const headers = authStore.getAuthHeaders()
    return {
      'Content-Type': 'application/json',
      ...headers
    }
  }

  async getCsrfToken() {
    try {
      await axios.get('/api/login/')
      return document.cookie.match(/csrftoken=([\w-]+)/)?.[1]
    } catch {
      return null
    }
  }

  handleResponse(response) {
    if (!response.data) {
      throw new Error('响应数据为空')
    }

    const isSuccessStatus = response.data.status === 'success'
    const isSuccessCode = response.data.code === 200 || response.data.code === 0

    if (isSuccessStatus || isSuccessCode) {
      return response.data.data
    }

    throw new Error(response.data?.message || response.data?.msg || '请求失败')
  }

  async createWorkflow(workflowData) {
    const headers = this.getAuthHeaders()
    
    const response = await axios.post(`${this.baseUrl}/create`, workflowData, {
      headers
    })
    
    return this.handleResponse(response)
  }

  async updateWorkflow(workflowId, updates) {
    const headers = this.getAuthHeaders()
    
    const response = await axios.put(`${this.baseUrl}/${workflowId}`, updates, {
      headers
    })
    
    return this.handleResponse(response)
  }

  async deleteWorkflow(workflowId) {
    const headers = this.getAuthHeaders()
    
    const response = await axios.delete(`${this.baseUrl}/${workflowId}`, {
      headers
    })
    
    return this.handleResponse(response)
  }

  async getWorkflow(workflowId) {
    const headers = this.getAuthHeaders()
    
    const response = await axios.get(`${this.baseUrl}/${workflowId}`, {
      headers
    })
    
    return this.handleResponse(response)
  }

  async getAllWorkflows() {
    const headers = this.getAuthHeaders()
    
    const response = await axios.get(`${this.baseUrl}/list`, {
      headers
    })
    
    return this.handleResponse(response)
  }

  async startExecution(workflowId, runtimeVariables = {}, workflowSnapshot = null) {
    const headers = this.getAuthHeaders()
    
    const payload = {
      workflowId,
      variables: runtimeVariables
    }
    
    if (workflowSnapshot) {
      payload.workflowSnapshot = workflowSnapshot
    }
    
    const response = await axios.post(`${this.baseUrl}/execute`, payload, {
      headers
    })
    
    return this.handleResponse(response)
  }

  async getExecutionStatus(executionId) {
    const headers = this.getAuthHeaders()
    
    const response = await axios.get(`${this.baseUrl}/execution/${executionId}`, {
      headers
    })
    
    return this.handleResponse(response)
  }

  async getExecutionLogs(executionId) {
    const headers = this.getAuthHeaders()
    
    const response = await axios.get(`${this.baseUrl}/execution/${executionId}/logs`, {
      headers
    })
    
    return this.handleResponse(response)
  }

  async cancelExecution(executionId) {
    const headers = this.getAuthHeaders()
    
    const response = await axios.post(`${this.baseUrl}/execution/${executionId}/cancel`, {}, {
      headers
    })
    
    return this.handleResponse(response)
  }

  async pauseExecution(executionId) {
    const headers = this.getAuthHeaders()
    
    const response = await axios.post(`${this.baseUrl}/execution/${executionId}/pause`, {}, {
      headers
    })
    
    return this.handleResponse(response)
  }

  async resumeExecution(executionId) {
    const headers = this.getAuthHeaders()
    
    const response = await axios.post(`${this.baseUrl}/execution/${executionId}/resume`, {}, {
      headers
    })
    
    return this.handleResponse(response)
  }

  async getExecutionHistory(workflowId = null) {
    const headers = this.getAuthHeaders()
    const url = workflowId 
      ? `${this.baseUrl}/history?workflowId=${workflowId}`
      : `${this.baseUrl}/history`
    
    const response = await axios.get(url, {
      headers
    })
    
    return this.handleResponse(response)
  }

  startPolling(executionId, callback, interval = 2000) {
    if (this.pollingExecutions.has(executionId)) {
      return
    }

    const poll = async () => {
      try {
        const status = await this.getExecutionStatus(executionId)
        callback(status)

        if (status.status === WorkflowStatus.COMPLETED || 
            status.status === WorkflowStatus.FAILED ||
            status.status === WorkflowStatus.CANCELLED) {
          this.stopPolling(executionId)
          return
        }

        this.pollingExecutions.set(executionId, {
          timerId: setTimeout(poll, interval),
          callback
        })
      } catch (error) {
        console.error('Polling error:', error)
        this.stopPolling(executionId)
      }
    }

    poll()
  }

  stopPolling(executionId) {
    const polling = this.pollingExecutions.get(executionId)
    if (polling) {
      clearTimeout(polling.timerId)
      this.pollingExecutions.delete(executionId)
    }
  }

  stopAllPolling() {
    for (const executionId of this.pollingExecutions.keys()) {
      this.stopPolling(executionId)
    }
  }
}

export const workflowApiService = new WorkflowApiService()
