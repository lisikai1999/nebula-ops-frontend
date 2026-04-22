<script>
export default {
  name: 'LogDownLoad',
  data() {
    return {
      env: ["china dev", "china dev-staging", "china prod", "singapore-dev", "singapore-staging", "singapore-prod", "usa-prod", "Spain-prod"],
      loading: false,
      groupLoading: false,
      group: [],
      form: {
        stime: '',
        etime: '',
        env: '',
        group: '',
        filterPattern: ''
      }
    };
  },
  methods: {
    timeconversion(date) {
      const year = date.getFullYear();
      const month = (date.getMonth() + 1).toString().padStart(2, '0');
      const day = date.getDate().toString().padStart(2, '0');
      const hours = date.getHours().toString().padStart(2, '0');
      const minutes = date.getMinutes().toString().padStart(2, '0');
      const seconds = date.getSeconds().toString().padStart(2, '0');
      return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
    },

    async submitForm() {
      if (!this.form.stime || !this.form.etime || !this.form.env || !this.form.group) {
        this.$message.warning('请填写所有必填项');
        return;
      }

      const stime = this.timeconversion(this.form.stime);
      const etime = this.timeconversion(this.form.etime);

      this.loading = true;

      try {
        const response = await axios.get('/api/aws/download?log_group_name=' + this.form.group + "&start_time=" + stime + "&end_time=" + etime + "&env=" + this.form.env + "&filterPattern=" + this.form.filterPattern, {
          responseType: 'blob'
        });

        const url = window.URL.createObjectURL(new Blob([response.data]));
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', 'log_' + new Date().toISOString().slice(0, 10) + '.txt');
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);

        this.$message.success('日志下载成功');
      } catch (error) {
        this.$message.error('下载文件失败');
        console.error('下载文件失败:', error);
      } finally {
        this.loading = false;
      }
    },

    async changeEnv() {
      if (!this.form.env) {
        this.group = [];
        return;
      }

      const csrftoken = document.cookie.match(/csrftoken=([\w-]+)/)?.[1];
      this.groupLoading = true;
      this.group = [];

      try {
        const response = await axios.get('/api/aws/get_env_group?env=' + this.form.env, {
          headers: {
            'X-CSRFToken': csrftoken,
            'Content-Type': 'application/json'
          }
        });
        this.group = response.data;
        this.$message.success(`获取到 ${this.group.length} 个日志组`);
      } catch (error) {
        if (error.response?.data?.code === 401) {
          this.$message.error('未登录，请先登录');
        } else {
          this.$message.error('获取日志组数据失败');
        }
        console.error('获取日志组数据失败:', error);
      } finally {
        this.groupLoading = false;
      }
    }
  },
  mounted() {
    const now = new Date();
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    this.form.stime = yesterday;
    this.form.etime = now;
  }
};
</script>

<template>
  <div class="log-download-page">
    <el-card class="page-header-card" shadow="never">
      <div class="page-header">
        <div class="header-left">
          <el-icon class="header-icon"><Download /></el-icon>
          <h1 class="page-title">CloudWatch 日志下载</h1>
          <el-tag type="info" effect="plain">日志导出</el-tag>
        </div>
      </div>
    </el-card>

    <el-card class="form-card" shadow="never">
      <template #header>
        <div class="card-header">
          <span>下载配置</span>
          <el-link href="https://docs.amazonaws.cn/AmazonCloudWatch/latest/logs/FilterAndPatternSyntax.html#matching-terms-events" target="_blank" type="primary">
            查看过滤语法
          </el-link>
        </div>
      </template>

      <el-form ref="form" :model="form" label-width="120px" class="download-form">
        <el-form-item label="过滤条件" prop="filterPattern">
          <el-input 
            v-model="form.filterPattern" 
            style="width: 100%; max-width: 600px;" 
            placeholder="请输入过滤条件（可选）"
            clearable
          >
            <template #prefix>
              <el-icon><Search /></el-icon>
            </template>
          </el-input>
          <div class="form-tip">
            <el-icon><InfoFilled /></el-icon>
            <span>支持 CloudWatch 过滤语法，如：ERROR、WARN、{$.statusCode = 500} 等</span>
          </div>
        </el-form-item>

        <el-row :gutter="24">
          <el-col :xs="24" :sm="12" :md="12">
            <el-form-item label="*开始时间" prop="stime" required>
              <el-date-picker 
                v-model="form.stime" 
                type="datetime" 
                placeholder="选择开始时间"
                style="width: 100%;"
                format="YYYY-MM-DD HH:mm:ss"
                value-format="YYYY-MM-DD HH:mm:ss"
              />
            </el-form-item>
          </el-col>
          <el-col :xs="24" :sm="12" :md="12">
            <el-form-item label="*结束时间" prop="etime" required>
              <el-date-picker 
                v-model="form.etime" 
                type="datetime" 
                placeholder="选择结束时间"
                style="width: 100%;"
                format="YYYY-MM-DD HH:mm:ss"
                value-format="YYYY-MM-DD HH:mm:ss"
              />
            </el-form-item>
          </el-col>
        </el-row>

        <el-row :gutter="24">
          <el-col :xs="24" :sm="12" :md="12">
            <el-form-item label="*选择环境" prop="env" required>
              <el-select 
                v-model="form.env" 
                placeholder="请选择环境" 
                @change="changeEnv"
                style="width: 100%;"
                clearable
                filterable
              >
                <el-option v-for="item in env" :key="item" :label="item" :value="item" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :xs="24" :sm="12" :md="12">
            <el-form-item label="*选择日志组" prop="group" required>
              <el-select 
                v-model="form.group" 
                filterable 
                placeholder="请选择日志组"
                style="width: 100%;"
                clearable
                :loading="groupLoading"
              >
                <el-option 
                  v-for="item in group" 
                  :key="item" 
                  :label="item" 
                  :value="item" 
                />
              </el-select>
              <div v-if="groupLoading" class="loading-tip">
                <el-icon class="loading-spin"><Loading /></el-icon>
                <span>正在加载日志组列表...</span>
              </div>
            </el-form-item>
          </el-col>
        </el-row>

        <el-form-item>
          <el-button 
            type="primary" 
            size="large"
            :loading="loading"
            @click="submitForm"
            :disabled="!form.env || !form.group"
          >
            <el-icon><Download /></el-icon>
            {{ loading ? '下载中...' : '开始下载' }}
          </el-button>
          <el-button 
            type="default" 
            size="large"
            @click="$refs.form.resetFields()"
          >
            重置
          </el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <el-card class="help-card" shadow="never">
      <template #header>
        <div class="card-header">
          <el-icon><QuestionFilled /></el-icon>
          <span>使用说明</span>
        </div>
      </template>
      <el-descriptions :column="1" border>
        <el-descriptions-item label="步骤 1">选择要下载日志的环境（如 china prod、singapore-dev 等）</el-descriptions-item>
        <el-descriptions-item label="步骤 2">选择具体的日志组名称（系统会自动加载所选环境的日志组列表）</el-descriptions-item>
        <el-descriptions-item label="步骤 3">设置时间范围（默认是昨天到今天）</el-descriptions-item>
        <el-descriptions-item label="步骤 4">（可选）输入过滤条件，用于筛选特定日志内容</el-descriptions-item>
        <el-descriptions-item label="步骤 5">点击"开始下载"按钮，系统将导出日志文件</el-descriptions-item>
      </el-descriptions>
    </el-card>
  </div>
</template>

<script setup>
import { Download, Search, InfoFilled, Loading, QuestionFilled } from '@element-plus/icons-vue';
</script>

<style scoped>
.log-download-page {
  min-height: 100%;
}

.page-header-card {
  margin-bottom: 24px;
  border-radius: 8px;
}

.page-header {
  display: flex;
  align-items: center;
  gap: 12px;
}

.header-icon {
  font-size: 28px;
  color: #409EFF;
}

.page-title {
  font-size: 22px;
  font-weight: 600;
  color: #303133;
  margin: 0;
}

.form-card {
  margin-bottom: 24px;
  border-radius: 8px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 16px;
  font-weight: 600;
  color: #303133;
}

.download-form {
  max-width: 900px;
}

.form-tip {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-top: 8px;
  font-size: 12px;
  color: #909399;
}

.loading-tip {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-top: 8px;
  font-size: 12px;
  color: #409EFF;
}

.loading-spin {
  animation: rotate 1s linear infinite;
}

@keyframes rotate {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

.help-card {
  border-radius: 8px;
}

.help-card .card-header {
  gap: 8px;
}

:deep(.el-descriptions__label) {
  font-weight: 600;
  color: #606266;
}

:deep(.el-descriptions__content) {
  color: #303133;
}

@media (max-width: 768px) {
  .page-header {
    flex-wrap: wrap;
  }
  
  .page-title {
    font-size: 18px;
  }
  
  .card-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 12px;
  }
}
</style>
