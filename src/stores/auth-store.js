import { ref, computed } from 'vue'
import { defineStore } from 'pinia'

const AUTH_TOKEN_KEY = 'nebula-ops-auth-token'
const AUTH_USER_KEY = 'nebula-ops-auth-user'

export const useAuthStore = defineStore('auth', () => {
  const token = ref(null)
  const user = ref(null)

  const isAuthenticated = computed(() => {
    return !!token.value
  })

  const username = computed(() => {
    return user.value?.username || ''
  })

  function init() {
    const savedToken = localStorage.getItem(AUTH_TOKEN_KEY)
    const savedUser = localStorage.getItem(AUTH_USER_KEY)
    
    if (savedToken) {
      token.value = savedToken
    }
    if (savedUser) {
      try {
        user.value = JSON.parse(savedUser)
      } catch {
        user.value = null
      }
    }
  }

  async function login(usernameInput, password) {
    try {
      await axios.get('/api/login/')
      const csrftoken = document.cookie.match(/csrftoken=([\w-]+)/)?.[1]

      const formData = new FormData()
      formData.append('username', usernameInput)
      formData.append('password', password)
      
      const response = await axios.post("/api/aws/login", formData, {
        headers: {
          'X-CSRFToken': csrftoken,
          'Content-Type': 'application/json'
        }
      })

      if (response.status === 200) {
        const authToken = response.data?.token || csrftoken
        if (!authToken) {
          throw new Error('登录失败：未获取到认证令牌')
        }
        
        token.value = authToken
        
        user.value = {
          username: usernameInput,
          loginTime: new Date().toISOString()
        }

        localStorage.setItem(AUTH_TOKEN_KEY, token.value)
        localStorage.setItem(AUTH_USER_KEY, JSON.stringify(user.value))

        return { success: true, message: '登录成功' }
      } else {
        throw new Error('登录失败，请检查用户名或密码')
      }
    } catch (error) {
      console.error('Login error:', error)
      
      let errorMessage = '登录失败，请检查用户名或密码'
      if (error.response) {
        if (error.response.status === 401) {
          errorMessage = '用户名或密码错误'
        } else if (error.response.status === 403) {
          errorMessage = '账户已被禁用'
        } else if (error.response.data?.message) {
          errorMessage = error.response.data.message
        }
      } else if (error.message && !error.message.includes('Network Error')) {
        errorMessage = error.message
      }
      
      throw new Error(errorMessage)
    }
  }

  function logout() {
    token.value = null
    user.value = null
    localStorage.removeItem(AUTH_TOKEN_KEY)
    localStorage.removeItem(AUTH_USER_KEY)
    
    window.location.hash = '#/Login'
  }

  function getAuthToken() {
    return token.value
  }

  function getAuthHeaders() {
    const headers = {}
    if (token.value) {
      headers['Authorization'] = `Bearer ${token.value}`
    }
    const csrftoken = document.cookie.match(/csrftoken=([\w-]+)/)?.[1]
    if (csrftoken) {
      headers['X-CSRFToken'] = csrftoken
    }
    return headers
  }

  init()

  return {
    token,
    user,
    isAuthenticated,
    username,
    login,
    logout,
    getAuthToken,
    getAuthHeaders,
    init
  }
})
