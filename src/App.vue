<script>
import NotFound from './components/NotFound.vue'
import AWSEcsInfo from './components/AWS/ECS/ecsinfo.vue'
import AWSLogDownLoad from './components/AWS/CloudWatch/logdown.vue'
import AWSLogIntake from './components/AWS/CloudWatch/LogIntake.vue'
import AWSUserManage from './components/AWS/SecurityHub/usermange.vue'
import Route from './components/AWS/Route/Route.vue'
import AthenaQuery from './components/AWS/Athena/AthenaQuery.vue'
import EnvironmentManagement from './components/AWS/EnvironmentManagement.vue'
import DevOpsAgentIncident from './components/AWS/DevOpsAgentIncident.vue'
import DevOpsAgentIncidentLaunch from './components/AWS/DevOpsAgentIncidentLaunch.vue'
import KnowledgeBase from './components/AI/knowledge_base.vue'
import LLMWeb from './components/AI/LLMWeb.vue'
import WorkflowView from './components/Workflow/WorkflowView.vue'
import Login from './components/Login.vue'
import { useAuthStore } from './stores/auth-store'

const routes = {
  '/Login': Login,
  '/aws/ecsInfo': AWSEcsInfo,
  '/aws/userManage': AWSUserManage,
  '/aws/logIntake': AWSLogIntake,
  '/aws/logDownLoad': AWSLogDownLoad,
  '/aws/Route': Route,
  '/aws/athenaQuery': AthenaQuery,
  '/aws/environments': EnvironmentManagement,
  '/aws/devops-incident': DevOpsAgentIncident,
  '/aws/devops-incident-launch': DevOpsAgentIncidentLaunch,
  '/ai/KnowledgeBase': KnowledgeBase,
  '/ai/LLMWeb': LLMWeb,
  '/workflow': WorkflowView,
}

export default {
  data() {
    return {
      currentPath: window.location.hash,
      isCollapse: false,
      activeMenu: ''
    }
  },
  computed: {
    currentView() {
      return routes[this.currentPath.slice(1) || '/'] || NotFound
    },
    isLoginPage() {
      return this.currentPath === '#/Login'
    },
    authStore() {
      return useAuthStore()
    },
    isAuthenticated() {
      return this.authStore.isAuthenticated
    },
    username() {
      return this.authStore.username
    }
  },
  watch: {
    currentPath(newPath) {
      this.activeMenu = newPath.slice(1)
      this.checkAuthAndRedirect()
    }
  },
  methods: {
    handleMenuSelect(index) {
      window.location.hash = index
    },
    checkAuthAndRedirect() {
      const path = this.currentPath
      const isLoginPage = path === '#/Login' || path === '#' || path === ''
      
      if (!this.isAuthenticated && !isLoginPage) {
        window.location.hash = '#/Login'
        return
      }
      
      if (this.isAuthenticated && isLoginPage) {
        window.location.hash = '#/aws/logIntake'
      }
    },
    handleLogout() {
      this.authStore.logout()
    },
    handleCommand(command) {
      if (command === 'logout') {
        this.handleLogout()
      }
    }
  },
  mounted() {
    this.authStore.init()
    this.checkAuthAndRedirect()
    this.activeMenu = this.currentPath.slice(1) || '/aws/logIntake'
    window.addEventListener('hashchange', () => {
      this.currentPath = window.location.hash
    })
  } 
}

</script>

<template>
  <el-container class="app-container">
    <!-- 侧边栏 - 登录页面不显示 -->
    <el-aside 
      v-if="!isLoginPage" 
      :width="isCollapse ? '64px' : '240px'" 
      class="sidebar"
    >
      <div class="logo-container">
        <span v-if="!isCollapse" class="logo-text">运维平台</span>
        <span v-else class="logo-text">OP</span>
      </div>
      
      <el-menu
        :default-active="activeMenu"
        :collapse="isCollapse"
        :collapse-transition="false"
        background-color="#304156"
        text-color="#bfcbd9"
        active-text-color="#409EFF"
        @select="handleMenuSelect"
        class="sidebar-menu"
      >
        <el-menu-item index="/aws/logIntake">
          <el-icon><House /></el-icon>
          <template #title>首页</template>
        </el-menu-item>
        
        <el-sub-menu index="aws">
          <template #title>
            <el-icon><Menu /></el-icon>
            <span>AWS 服务</span>
          </template>
          <el-menu-item index="/aws/environments">
            <el-icon><Setting /></el-icon>
            <template #title>环境凭证管理</template>
          </el-menu-item>
          <el-menu-item index="/aws/devops-incident-launch">
            <el-icon><Plus /></el-icon>
            <template #title>发起事件调查</template>
          </el-menu-item>
          <el-menu-item index="/aws/devops-incident">
            <el-icon><Warning /></el-icon>
            <template #title>事件调查详情</template>
          </el-menu-item>
          <el-menu-item index="/aws/userManage">
            <el-icon><User /></el-icon>
            <template #title>超时未登录用户</template>
          </el-menu-item>
          <el-menu-item index="/aws/logDownLoad">
            <el-icon><Download /></el-icon>
            <template #title>Cloudwatch日志下载</template>
          </el-menu-item>
          <el-menu-item index="/aws/ecsInfo">
            <el-icon><DataAnalysis /></el-icon>
            <template #title>ECS 信息查看</template>
          </el-menu-item>
          <el-menu-item index="/aws/Route">
            <el-icon><Connection /></el-icon>
            <template #title>域名路由</template>
          </el-menu-item>
          <el-menu-item index="/aws/athenaQuery">
            <el-icon><DataLine /></el-icon>
            <template #title>Athena SQL 查询</template>
          </el-menu-item>
        </el-sub-menu>
        
        <el-sub-menu index="ai">
          <template #title>
            <el-icon><Cpu /></el-icon>
            <span>AI 服务</span>
          </template>
          <el-menu-item index="/ai/KnowledgeBase">
            <el-icon><Reading /></el-icon>
            <template #title>知识库管理</template>
          </el-menu-item>
          <el-menu-item index="/ai/LLMWeb">
            <el-icon><ChatDotRound /></el-icon>
            <template #title>RAG强化问答系统</template>
          </el-menu-item>
        </el-sub-menu>
        
        <el-menu-item index="/workflow">
          <el-icon><Share /></el-icon>
          <template #title>工作流编排</template>
        </el-menu-item>
      </el-menu>
      
      <div class="collapse-btn" @click="isCollapse = !isCollapse">
        <el-icon v-if="isCollapse"><Expand /></el-icon>
        <el-icon v-else><Fold /></el-icon>
      </div>
    </el-aside>
    
    <!-- 主内容区域 -->
    <el-container class="main-container">
      <!-- 顶部导航栏 - 登录页面不显示 -->
      <el-header v-if="!isLoginPage" class="header">
        <div class="header-left">
          <el-breadcrumb separator="/">
            <el-breadcrumb-item @click="handleMenuSelect('/aws/logIntake')" style="cursor: pointer;">
              <span style="color: #409EFF; text-decoration: none;">首页</span>
            </el-breadcrumb-item>
            <el-breadcrumb-item v-if="activeMenu !== '/aws/logIntake'">
              {{ getBreadcrumbName(activeMenu) }}
            </el-breadcrumb-item>
          </el-breadcrumb>
        </div>
        <div class="header-right">
          <el-dropdown @command="handleCommand">
            <span class="user-info">
              <el-icon><UserFilled /></el-icon>
              <span class="username">{{ username || '管理员' }}</span>
            </span>
            <template #dropdown>
              <el-dropdown-menu>
                <el-dropdown-item command="profile">个人信息</el-dropdown-item>
                <el-dropdown-item command="logout" divided>退出登录</el-dropdown-item>
              </el-dropdown-menu>
            </template>
          </el-dropdown>
        </div>
      </el-header>
      
      <!-- 内容区域 -->
      <el-main class="content-main">
        <transition name="fade" mode="out-in">
          <component :is="currentView" />
        </transition>
      </el-main>
    </el-container>
  </el-container>
</template>

<script setup>
import {
  House,
  Menu,
  User,
  Download,
  DataAnalysis,
  Connection,
  Cpu,
  Reading,
  ChatDotRound,
  Expand,
  Fold,
  UserFilled,
  Share,
  DataLine,
  Setting,
  Warning,
  Plus
} from '@element-plus/icons-vue'

const getBreadcrumbName = (path) => {
  const nameMap = {
    '/aws/environments': '环境凭证管理',
    '/aws/devops-incident-launch': '发起事件调查',
    '/aws/devops-incident': '事件调查详情',
    '/aws/userManage': '超时未登录用户',
    '/aws/logDownLoad': 'Cloudwatch日志下载',
    '/aws/ecsInfo': 'ECS 信息查看',
    '/aws/Route': '域名路由',
    '/aws/athenaQuery': 'Athena SQL 查询',
    '/ai/KnowledgeBase': '知识库管理',
    '/ai/LLMWeb': 'RAG强化问答系统',
    '/workflow': '工作流编排'
  }
  return nameMap[path] || '未知页面'
}
</script>

<style scoped>
.app-container {
  height: 100vh;
  width: 100%;
  overflow: hidden;
}

.sidebar {
  background-color: #304156;
  transition: width 0.3s;
  display: flex;
  flex-direction: column;
  height: 100vh;
  overflow: hidden;
}

.logo-container {
  height: 60px;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: #263445;
  border-bottom: 1px solid #1f2d3d;
}

.logo-text {
  color: #fff;
  font-size: 20px;
  font-weight: bold;
  white-space: nowrap;
}

.sidebar-menu {
  border-right: none;
  flex: 1;
  overflow-y: auto;
  overflow-x: hidden;
}

.sidebar-menu:not(.el-menu--collapse) {
  width: 240px;
}

.collapse-btn {
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  color: #bfcbd9;
  background-color: #263445;
  border-top: 1px solid #1f2d3d;
  transition: all 0.3s;
}

.collapse-btn:hover {
  color: #409EFF;
  background-color: #263445;
}

.main-container {
  display: flex;
  flex-direction: column;
  height: 100vh;
  overflow: hidden;
  background-color: #f0f2f5;
}

.header {
  background-color: #fff;
  box-shadow: 0 1px 4px rgba(0, 21, 41, 0.08);
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 24px;
  height: 60px !important;
}

.header-left {
  display: flex;
  align-items: center;
}

.header-right {
  display: flex;
  align-items: center;
}

.user-info {
  display: flex;
  align-items: center;
  cursor: pointer;
  padding: 8px 12px;
  border-radius: 4px;
  transition: background-color 0.3s;
}

.user-info:hover {
  background-color: #f5f7fa;
}

.username {
  margin-left: 8px;
  font-size: 14px;
}

.content-main {
  flex: 1;
  overflow-y: auto;
  padding: 24px;
  background-color: #f0f2f5;
}

/* 过渡动画 */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

/* 滚动条样式 */
.sidebar-menu::-webkit-scrollbar,
.content-main::-webkit-scrollbar {
  width: 6px;
  height: 6px;
}

.sidebar-menu::-webkit-scrollbar-thumb,
.content-main::-webkit-scrollbar-thumb {
  background-color: rgba(0, 0, 0, 0.2);
  border-radius: 3px;
}

.sidebar-menu::-webkit-scrollbar-track,
.content-main::-webkit-scrollbar-track {
  background-color: transparent;
}
</style>
