import { ref, computed } from 'vue'
import { defineStore } from 'pinia'
import { ElMessage } from 'element-plus'

export const useAwsEnvironmentsStore = defineStore('awsEnvironments', () => {
  const environments = ref([])
  const isLoading = ref(false)
  const selectedEnvironmentId = ref(null)
  const defaultEnvironmentId = ref(null)

  const environmentCount = computed(() => environments.value.length)

  const environmentOptions = computed(() => {
    return environments.value.map(env => ({
      value: env.id,
      label: env.name,
      isDefault: env.is_default
    }))
  })

  const selectedEnvironment = computed(() => {
    if (!selectedEnvironmentId.value) return null
    return environments.value.find(env => env.id === selectedEnvironmentId.value) || null
  })

  function getEnvironmentById(id) {
    return environments.value.find(env => env.id === id) || null
  }

  function getEnvironmentName(id) {
    const env = getEnvironmentById(id)
    return env ? env.name : id
  }

  function setSelectedEnvironment(id) {
    selectedEnvironmentId.value = id
    const env = getEnvironmentById(id)
    if (env) {
      localStorage.setItem('nebula-ops-selected-env', id)
    }
  }

  function clearSelectedEnvironment() {
    selectedEnvironmentId.value = null
    localStorage.removeItem('nebula-ops-selected-env')
  }

  async function fetchEnvironments() {
    isLoading.value = true
    try {
      const response = await axios.get('/api/aws/environments')
      if (response.data.status === 'success') {
        environments.value = response.data.data || []
        
        const defaultEnv = environments.value.find(env => env.is_default)
        if (defaultEnv) {
          defaultEnvironmentId.value = defaultEnv.id
        }
        
        const savedEnvId = localStorage.getItem('nebula-ops-selected-env')
        if (savedEnvId && getEnvironmentById(savedEnvId)) {
          selectedEnvironmentId.value = savedEnvId
        } else if (defaultEnvironmentId.value) {
          selectedEnvironmentId.value = defaultEnvironmentId.value
        }
        
        return environments.value
      } else {
        throw new Error(response.data.message || '获取环境列表失败')
      }
    } catch (error) {
      console.error('获取AWS环境列表失败:', error)
      ElMessage.error('获取环境列表失败，请稍后重试')
      return []
    } finally {
      isLoading.value = false
    }
  }

  async function createEnvironment(environmentData) {
    isLoading.value = true
    try {
      const csrftoken = document.cookie.match(/csrftoken=([\w-]+)/)?.[1]
      const response = await axios.post('/api/aws/environments', environmentData, {
        headers: {
          'X-CSRFToken': csrftoken,
          'Content-Type': 'application/json'
        }
      })
      
      if (response.data.status === 'success') {
        ElMessage.success('环境创建成功')
        await fetchEnvironments()
        return response.data.data
      } else {
        throw new Error(response.data.message || '创建环境失败')
      }
    } catch (error) {
      console.error('创建AWS环境失败:', error)
      ElMessage.error('创建环境失败，请稍后重试')
      throw error
    } finally {
      isLoading.value = false
    }
  }

  async function updateEnvironment(id, environmentData) {
    isLoading.value = true
    try {
      const csrftoken = document.cookie.match(/csrftoken=([\w-]+)/)?.[1]
      const response = await axios.put(`/api/aws/environments/${id}`, environmentData, {
        headers: {
          'X-CSRFToken': csrftoken,
          'Content-Type': 'application/json'
        }
      })
      
      if (response.data.status === 'success') {
        ElMessage.success('环境更新成功')
        await fetchEnvironments()
        return response.data.data
      } else {
        throw new Error(response.data.message || '更新环境失败')
      }
    } catch (error) {
      console.error('更新AWS环境失败:', error)
      ElMessage.error('更新环境失败，请稍后重试')
      throw error
    } finally {
      isLoading.value = false
    }
  }

  async function deleteEnvironment(id) {
    isLoading.value = true
    try {
      const csrftoken = document.cookie.match(/csrftoken=([\w-]+)/)?.[1]
      const response = await axios.delete(`/api/aws/environments/${id}`, {
        headers: {
          'X-CSRFToken': csrftoken
        }
      })
      
      if (response.data.status === 'success') {
        ElMessage.success('环境删除成功')
        if (selectedEnvironmentId.value === id) {
          clearSelectedEnvironment()
        }
        await fetchEnvironments()
        return true
      } else {
        throw new Error(response.data.message || '删除环境失败')
      }
    } catch (error) {
      console.error('删除AWS环境失败:', error)
      ElMessage.error('删除环境失败，请稍后重试')
      throw error
    } finally {
      isLoading.value = false
    }
  }

  async function setDefaultEnvironment(id) {
    isLoading.value = true
    try {
      const csrftoken = document.cookie.match(/csrftoken=([\w-]+)/)?.[1]
      const response = await axios.post(`/api/aws/environments/${id}/set-default`, {}, {
        headers: {
          'X-CSRFToken': csrftoken,
          'Content-Type': 'application/json'
        }
      })
      
      if (response.data.status === 'success') {
        ElMessage.success('已设置为默认环境')
        await fetchEnvironments()
        return true
      } else {
        throw new Error(response.data.message || '设置默认环境失败')
      }
    } catch (error) {
      console.error('设置默认环境失败:', error)
      ElMessage.error('设置默认环境失败，请稍后重试')
      throw error
    } finally {
      isLoading.value = false
    }
  }

  function init() {
    const savedEnvId = localStorage.getItem('nebula-ops-selected-env')
    if (savedEnvId) {
      selectedEnvironmentId.value = savedEnvId
    }
  }

  init()

  return {
    environments,
    isLoading,
    selectedEnvironmentId,
    defaultEnvironmentId,
    environmentCount,
    environmentOptions,
    selectedEnvironment,
    getEnvironmentById,
    getEnvironmentName,
    setSelectedEnvironment,
    clearSelectedEnvironment,
    fetchEnvironments,
    createEnvironment,
    updateEnvironment,
    deleteEnvironment,
    setDefaultEnvironment,
    init
  }
})
