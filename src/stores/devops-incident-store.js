import { ref, computed } from 'vue'
import { defineStore } from 'pinia'
import { ElMessage } from 'element-plus'

export const useDevOpsIncidentStore = defineStore('devOpsIncident', () => {
  const investigations = ref([])
  const currentInvestigation = ref(null)
  const isLoading = ref(false)
  const isSubmitting = ref(false)
  const isPolling = ref(false)
  const pollingInterval = ref(null)

  const investigationCount = computed(() => investigations.value.length)

  const getInvestigationById = (id) => {
    return investigations.value.find(inv => inv.id === id || inv.incidentId === id) || null
  }

  const getCsrfToken = () => {
    return document.cookie.match(/csrftoken=([\w-]+)/)?.[1]
  }

  async function fetchInvestigations(params = {}) {
    isLoading.value = true
    try {
      const queryParams = new URLSearchParams()
      if (params.status) queryParams.append('status', params.status)
      if (params.severity) queryParams.append('severity', params.severity)
      if (params.environmentId) queryParams.append('environment_id', params.environmentId)
      if (params.keyword) queryParams.append('keyword', params.keyword)
      if (params.page) queryParams.append('page', params.page)
      if (params.pageSize) queryParams.append('page_size', params.pageSize)

      const queryString = queryParams.toString()
      const url = queryString 
        ? `/api/aws/devops-incident?${queryString}`
        : '/api/aws/devops-incident'

      const response = await axios.get(url)
      
      if (response.data.status === 'success') {
        investigations.value = response.data.data || []
        return investigations.value
      } else {
        throw new Error(response.data.message || '获取调查列表失败')
      }
    } catch (error) {
      console.error('获取事件调查列表失败:', error)
      ElMessage.error('获取调查列表失败，请稍后重试')
      return []
    } finally {
      isLoading.value = false
    }
  }

  async function fetchInvestigationDetail(id) {
    isLoading.value = true
    try {
      const response = await axios.get(`/api/aws/devops-incident/${id}`)
      
      if (response.data.status === 'success') {
        currentInvestigation.value = response.data.data
        return currentInvestigation.value
      } else {
        throw new Error(response.data.message || '获取调查详情失败')
      }
    } catch (error) {
      console.error('获取事件调查详情失败:', error)
      ElMessage.error('获取调查详情失败，请稍后重试')
      return null
    } finally {
      isLoading.value = false
    }
  }

  async function createInvestigation(investigationData) {
    isSubmitting.value = true
    try {
      const csrftoken = getCsrfToken()
      const response = await axios.post('/api/aws/devops-incident', investigationData, {
        headers: {
          'X-CSRFToken': csrftoken,
          'Content-Type': 'application/json'
        }
      })
      
      if (response.data.status === 'success') {
        ElMessage.success('事件调查已发起')
        const newInvestigation = response.data.data
        investigations.value.unshift(newInvestigation)
        return newInvestigation
      } else {
        throw new Error(response.data.message || '发起调查失败')
      }
    } catch (error) {
      console.error('发起事件调查失败:', error)
      if (error.response?.data?.code === 401) {
        ElMessage.error('未登录，请先登录')
      } else {
        ElMessage.error(error.response?.data?.message || '发起调查失败，请稍后重试')
      }
      throw error
    } finally {
      isSubmitting.value = false
    }
  }

  async function cancelInvestigation(id) {
    try {
      const csrftoken = getCsrfToken()
      const response = await axios.post(`/api/aws/devops-incident/${id}/cancel`, {}, {
        headers: {
          'X-CSRFToken': csrftoken,
          'Content-Type': 'application/json'
        }
      })
      
      if (response.data.status === 'success') {
        ElMessage.success('调查已取消')
        if (currentInvestigation.value?.id === id || currentInvestigation.value?.incidentId === id) {
          currentInvestigation.value = response.data.data
        }
        const idx = investigations.value.findIndex(inv => inv.id === id || inv.incidentId === id)
        if (idx !== -1) {
          investigations.value[idx] = response.data.data
        }
        return response.data.data
      } else {
        throw new Error(response.data.message || '取消调查失败')
      }
    } catch (error) {
      console.error('取消事件调查失败:', error)
      ElMessage.error('取消调查失败，请稍后重试')
      throw error
    }
  }

  async function exportInvestigation(id) {
    try {
      const response = await axios.get(`/api/aws/devops-incident/${id}/export`, {
        responseType: 'blob'
      })

      const url = window.URL.createObjectURL(new Blob([response.data]))
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', `incident_${id}_${new Date().toISOString().slice(0, 10)}.pdf`)
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(url)

      ElMessage.success('报告导出成功')
      return true
    } catch (error) {
      console.error('导出事件调查报告失败:', error)
      ElMessage.error('导出报告失败，请稍后重试')
      throw error
    }
  }

  function startPolling(id, interval = 5000) {
    if (isPolling.value) {
      stopPolling()
    }
    
    isPolling.value = true
    
    pollingInterval.value = setInterval(async () => {
      try {
        await fetchInvestigationDetail(id)
      } catch (error) {
        console.error('轮询调查状态失败:', error)
      }
    }, interval)
  }

  function stopPolling() {
    if (pollingInterval.value) {
      clearInterval(pollingInterval.value)
      pollingInterval.value = null
    }
    isPolling.value = false
  }

  function clearCurrentInvestigation() {
    currentInvestigation.value = null
    stopPolling()
  }

  function getSeverityTag(severity) {
    const map = {
      critical: 'danger',
      high: 'danger',
      medium: 'warning',
      low: 'info'
    }
    return map[severity] || 'info'
  }

  function getSeverityText(severity) {
    const map = {
      critical: '严重',
      high: '高',
      medium: '中',
      low: '低'
    }
    return map[severity] || '未知'
  }

  function getStatusTag(status) {
    const map = {
      investigating: 'primary',
      completed: 'success',
      closed: 'info',
      cancelled: 'info',
      failed: 'danger'
    }
    return map[status] || 'info'
  }

  function getStatusText(status) {
    const map = {
      investigating: '调查中',
      completed: '已完成',
      closed: '已关闭',
      cancelled: '已取消',
      failed: '失败'
    }
    return map[status] || '未知'
  }

  return {
    investigations,
    currentInvestigation,
    isLoading,
    isSubmitting,
    isPolling,
    investigationCount,
    getInvestigationById,
    fetchInvestigations,
    fetchInvestigationDetail,
    createInvestigation,
    cancelInvestigation,
    exportInvestigation,
    startPolling,
    stopPolling,
    clearCurrentInvestigation,
    getSeverityTag,
    getSeverityText,
    getStatusTag,
    getStatusText
  }
})
