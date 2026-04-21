<script>
import NotFound from './components/NotFound.vue'
import AWSEcsInfo from './components/AWS/ECS/ecsinfo.vue'
import AWSLogDownLoad from './components/AWS/CloudWatch/logdown.vue'
import AWSLogIntake from './components/AWS/CloudWatch/LogIntake.vue'
import AWSUserManage from './components/AWS/SecurityHub/usermange.vue'
import Route from './components/AWS/Route/Route.vue'
import KnowledgeBase from './components/AI/knowledge_base.vue'
import LLMWeb from './components/AI/LLMWeb.vue'
import Login from './components/Login.vue'

const routes = {
  '/Login': Login,
  '/aws/ecsInfo': AWSEcsInfo,
  '/aws/userManage': AWSUserManage,
  '/aws/logIntake': AWSLogIntake,
  '/aws/logDownLoad': AWSLogDownLoad,
  '/aws/Route': Route,
  '/ai/KnowledgeBase': KnowledgeBase,
  '/ai/LLMWeb': LLMWeb,
}

export default {
  data() {
    return {
      currentPath: window.location.hash
    }
  },
  computed: {
    currentView() {
      return routes[this.currentPath.slice(1) || '/'] || NotFound
    }
  },
  mounted() {
    window.addEventListener('hashchange', () => {
		  this.currentPath = window.location.hash
		})
  } 
}

</script>

<template>
  <div class="container-fluid">
    <div class="row">
      <!-- 左侧边栏 -->
      <div id="sidebar" class="d-flex flex-column p-3">
        <ul class="nav nav-pills flex-column mb-auto">
          <li class="nav-item">
            <a href="#/aws/logIntake" class="nav-link" id="index">首页</a>
          </li>
          <li>
            <a href="#/aws/userManage" class="nav-link" id="aws-user-link">aws 超时未登录用户信息</a>
          </li>
          <li>
            <a href="#/aws/logDownLoad" class="nav-link" id="logDownLoad">Cloudwatch日志下载</a>
          </li>
          <li>
            <a href="#/aws/ecsInfo" class="nav-link" id="ecs-info">ecs 信息查看</a>
          </li>
          <li>
            <a href="#/aws/Route" class="nav-link" id="route">域名路由</a>
          </li>
          <li>
            <a href="#/Login" class="nav-link" id="ecs-info">权限认证</a>
          </li>
          <li>
            <a href="#/ai/KnowledgeBase" class="nav-link" id="KnowledgeBase">知识库管理</a>
          </li>
          <li>
            <a href="#/ai/LLMWeb" class="nav-link" id="LLMWeb">RAG强化问答系统</a>
          </li>
          
        </ul>
      </div>

      <!-- 右侧内容区域 -->
      <main class="col-md-9 ms-sm-auto col-lg-10 px-md-4" style="background-color: #f0f0f0;">
        <div id="content-area" class="pt-3">

          <div id="content">
            <component :is="currentView" />
          </div>
        </div>
      </main>
    </div>
  </div>
</template>

<style scoped>
  #sidebar {
    position: fixed;
    top: 0;
    left: 0;
    bottom: 0;
    z-index: 100;
    padding: 48px 0 0;
    box-shadow: 0 0 10px rgba(0, 0, 0, 0.1);
  }

  #content-area {
    /* margin-left: 150px; */
    padding: 20px;
  }

  #content {
    background-color: #fff;
    padding: 20px;
    border-radius: 5px;
  }
</style>
