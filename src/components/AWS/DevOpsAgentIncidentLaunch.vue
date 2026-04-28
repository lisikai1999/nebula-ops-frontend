<template>
  <div class="incident-launch-page">
    <el-card class="page-header-card" shadow="never">
      <div class="page-header">
        <div class="header-left">
          <el-icon class="header-icon"><Warning /></el-icon>
          <h1 class="page-title">发起事件调查</h1>
          <el-tag type="primary" effect="plain">DevOps Agent</el-tag>
        </div>
        <div class="header-right">
          <el-button @click="goToList">
            <el-icon><List /></el-icon>
            查看列表
          </el-button>
        </div>
      </div>
    </el-card>

    <el-row :gutter="24">
      <el-col :span="16">
        <el-card class="form-card" shadow="never">
          <template #header>
            <div class="section-header">
              <el-icon><Document /></el-icon>
              <span class="section-title">调查配置</span>
            </div>
          </template>

          <el-form
            ref="formRef"
            :model="formData"
            :rules="formRules"
            label-width="140px"
            class="launch-form"
          >
            <el-form-item label="选择 AWS 环境" prop="environmentId">
              <el-select
                v-model="formData.environmentId"
                placeholder="请选择要调查的 AWS 环境"
                style="width: 100%"
                :loading="isLoadingEnvironments"
                filterable
                clearable
              >
                <el-option
                  v-for="env in environmentOptions"
                  :key="env.value"
                  :label="env.label"
                  :value="env.value"
                >
                  <div class="env-option">
                    <span class="env-name">{{ env.label }}</span>
                    <el-tag v-if="env.isDefault" type="warning" size="small" effect="dark">默认</el-tag>
                  </div>
                </el-option>
              </el-select>
              <div class="form-tip">
                <el-text type="info" size="small">
                  选择需要进行事件调查的 AWS 环境，DevOps Agent 将使用该环境的凭证进行诊断
                </el-text>
              </div>
            </el-form-item>

            <el-form-item label="调查标题" prop="title">
              <el-input
                v-model="formData.title"
                placeholder="请输入事件调查标题，如：生产环境 ECS 服务异常"
                clearable
                maxlength="100"
                show-word-limit
              />
              <div class="form-tip">
                <el-text type="info" size="small">
                  简短描述此次事件调查的目的，便于后续追踪和归档
                </el-text>
              </div>
            </el-form-item>

            <el-form-item label="严重程度" prop="severity">
              <el-radio-group v-model="formData.severity">
                <el-radio-button label="critical">
                  <span class="severity-label critical">
                    <el-icon><CircleCloseFilled /></el-icon>
                    严重
                  </span>
                </el-radio-button>
                <el-radio-button label="high">
                  <span class="severity-label high">
                    <el-icon><WarningFilled /></el-icon>
                    高
                  </span>
                </el-radio-button>
                <el-radio-button label="medium">
                  <span class="severity-label medium">
                    <el-icon><Warning /></el-icon>
                    中
                  </span>
                </el-radio-button>
                <el-radio-button label="low">
                  <span class="severity-label low">
                    <el-icon><InfoFilled /></el-icon>
                    低
                  </span>
                </el-radio-button>
              </el-radio-group>
            </el-form-item>

            <el-form-item label="事件背景" prop="background">
              <el-input
                v-model="formData.background"
                type="textarea"
                :rows="4"
                placeholder="请详细描述事件发生的背景信息..."
                maxlength="2000"
                show-word-limit
              />
              <div class="form-tip">
                <el-text type="info" size="small">
                  包括但不限于：事件发现时间、影响范围、已采取的临时措施、相关监控告警等
                </el-text>
              </div>
            </el-form-item>

            <el-form-item label="事件说明" prop="description">
              <el-input
                v-model="formData.description"
                type="textarea"
                :rows="6"
                placeholder="请详细描述事件的具体情况和您希望 DevOps Agent 调查的内容..."
                maxlength="3000"
                show-word-limit
              />
              <div class="form-tip">
                <el-text type="info" size="small">
                  可以描述：具体的错误现象、相关日志片段、您的初步怀疑方向、希望 Agent 重点检查的服务等
                </el-text>
              </div>
            </el-form-item>

            <el-form-item>
              <div class="form-actions">
                <el-button size="large" @click="handleReset">
                  <el-icon><RefreshRight /></el-icon>
                  重置
                </el-button>
                <el-button
                  type="primary"
                  size="large"
                  :loading="isSubmitting"
                  @click="handleSubmit"
                >
                  <el-icon><Promotion /></el-icon>
                  发起调查
                </el-button>
              </div>
            </el-form-item>
          </el-form>
        </el-card>
      </el-col>

      <el-col :span="8">
        <el-card class="info-card" shadow="never">
          <template #header>
            <div class="section-header">
              <el-icon><InfoFilled /></el-icon>
              <span class="section-title">调查说明</span>
            </div>
          </template>

          <div class="info-content">
            <div class="info-item">
              <div class="info-icon">
                <el-icon><Search /></el-icon>
              </div>
              <div class="info-text">
                <h4>自动诊断</h4>
                <p>DevOps Agent 将自动收集日志、监控指标、配置信息，进行全面的故障分析</p>
              </div>
            </div>

            <div class="info-item">
              <div class="info-icon">
                <el-icon><Cpu /></el-icon>
              </div>
              <div class="info-text">
                <h4>AI 根因分析</h4>
                <p>基于收集的信息，AI 将进行深度分析，识别可能的根因并生成修复建议</p>
              </div>
            </div>

            <div class="info-item">
              <div class="info-icon">
                <el-icon><Tools /></el-icon>
              </div>
              <div class="info-text">
                <h4>修复方案</h4>
                <p>提供可执行的修复命令和验证步骤，帮助快速恢复服务</p>
              </div>
            </div>

            <div class="info-item">
              <div class="info-icon">
                <el-icon><ChatDotRound /></el-icon>
              </div>
              <div class="info-text">
                <h4>实时交互</h4>
                <p>调查过程中可随时与 Agent 对话，获取进一步的分析和建议</p>
              </div>
            </div>
          </div>
        </el-card>

        <el-card class="recent-card" shadow="never" style="margin-top: 24px;">
          <template #header>
            <div class="section-header">
              <el-icon><Timer /></el-icon>
              <span class="section-title">最近调查</span>
            </div>
          </template>

          <div class="recent-list">
            <div
              v-for="(item, index) in recentInvestigations"
              :key="index"
              class="recent-item"
              @click="goToInvestigation(item)"
            >
              <div class="recent-left">
                <el-tag :type="getSeverityTag(item.severity)" size="small">
                  {{ getSeverityText(item.severity) }}
                </el-tag>
                <span class="recent-title">{{ item.title }}</span>
              </div>
              <div class="recent-right">
                <span class="recent-time">{{ item.time }}</span>
                <el-icon><ArrowRight /></el-icon>
              </div>
            </div>

            <el-empty v-if="recentInvestigations.length === 0" description="暂无历史调查" :image-size="60" />
          </div>
        </el-card>
      </el-col>
    </el-row>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  Warning,
  CircleCloseFilled,
  WarningFilled,
  InfoFilled,
  List,
  RefreshRight,
  Promotion,
  Search,
  Cpu,
  Tools,
  ChatDotRound,
  Timer,
  ArrowRight
} from '@element-plus/icons-vue'
import { useAwsEnvironmentsStore } from '@/stores/aws-environments'

const awsEnvironmentsStore = useAwsEnvironmentsStore()

const formRef = ref(null)
const isLoadingEnvironments = computed(() => awsEnvironmentsStore.isLoading)
const environmentOptions = computed(() => awsEnvironmentsStore.environmentOptions)
const isSubmitting = ref(false)

const formData = reactive({
  environmentId: null,
  title: '',
  severity: 'high',
  background: '',
  description: ''
})

const formRules = {
  environmentId: [
    { required: true, message: '请选择 AWS 环境', trigger: 'change' }
  ],
  title: [
    { required: true, message: '请输入调查标题', trigger: 'blur' },
    { min: 5, max: 100, message: '标题长度在 5 到 100 个字符', trigger: 'blur' }
  ],
  background: [
    { required: true, message: '请输入事件背景', trigger: 'blur' },
    { min: 20, max: 2000, message: '事件背景至少 20 个字符', trigger: 'blur' }
  ],
  description: [
    { required: true, message: '请输入事件说明', trigger: 'blur' },
    { min: 20, max: 3000, message: '事件说明至少 20 个字符', trigger: 'blur' }
  ]
}

const recentInvestigations = ref([
  {
    id: 'INC-2026-0428-001',
    title: '生产环境 ECS 服务异常',
    severity: 'critical',
    time: '2小时前',
    status: 'completed'
  },
  {
    id: 'INC-2026-0427-003',
    title: '测试环境数据库连接超时',
    severity: 'medium',
    time: '1天前',
    status: 'completed'
  }
])

const goToList = () => {
  window.location.hash = '#/aws/devops-incident-list'
}

const getSeverityTag = (severity) => {
  const map = {
    critical: 'danger',
    high: 'danger',
    medium: 'warning',
    low: 'info'
  }
  return map[severity] || 'info'
}

const getSeverityText = (severity) => {
  const map = {
    critical: '严重',
    high: '高',
    medium: '中',
    low: '低'
  }
  return map[severity] || '未知'
}

const loadEnvironments = async () => {
  await awsEnvironmentsStore.fetchEnvironments()
  
  const defaultEnv = awsEnvironmentsStore.environments.find(env => env.is_default)
  if (defaultEnv && !formData.environmentId) {
    formData.environmentId = defaultEnv.id
  }
}

const handleReset = () => {
  formRef.value?.resetFields()
  formData.severity = 'high'
}

const handleSubmit = async () => {
  if (!formRef.value) return
  
  await formRef.value.validate(async (valid) => {
    if (valid) {
      try {
        await ElMessageBox.confirm(
          '确认发起此次事件调查吗？DevOps Agent 将开始自动诊断流程。',
          '确认发起调查',
          {
            confirmButtonText: '确认发起',
            cancelButtonText: '取消',
            type: 'warning'
          }
        )

        isSubmitting.value = true
        
        const selectedEnv = awsEnvironmentsStore.getEnvironmentById(formData.environmentId)
        
        const investigationData = {
          environmentId: formData.environmentId,
          environmentName: selectedEnv?.name || '',
          title: formData.title,
          severity: formData.severity,
          background: formData.background,
          description: formData.description,
          createdAt: new Date().toISOString()
        }

        console.log('发起事件调查:', investigationData)
        
        ElMessage.success('事件调查已发起，正在跳转到调查详情页...')
        
        setTimeout(() => {
          window.location.hash = '#/aws/devops-incident'
        }, 800)
        
      } catch (error) {
        if (error !== 'cancel') {
          console.error('发起调查失败:', error)
          ElMessage.error('发起调查失败，请稍后重试')
        }
      } finally {
        isSubmitting.value = false
      }
    }
  })
}

const goToInvestigation = (item) => {
  window.location.hash = '#/aws/devops-incident'
}

onMounted(() => {
  loadEnvironments()
})
</script>

<style scoped>
.incident-launch-page {
  min-height: 100%;
}

.page-header-card,
.form-card,
.info-card,
.recent-card {
  margin-bottom: 24px;
  border-radius: 8px;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 16px;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 12px;
}

.header-right {
  display: flex;
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

.section-header {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 16px;
  font-weight: 600;
  color: #303133;
}

.section-title {
  font-size: 16px;
  font-weight: 600;
  color: #303133;
}

.launch-form {
  padding: 16px 0;
}

.form-tip {
  margin-top: 8px;
}

.env-option {
  display: flex;
  align-items: center;
  gap: 8px;
}

.env-name {
  font-weight: 500;
}

.severity-label {
  display: flex;
  align-items: center;
  gap: 6px;
  font-weight: 500;
}

.severity-label.critical {
  color: #f56c6c;
}

.severity-label.high {
  color: #f56c6c;
}

.severity-label.medium {
  color: #e6a23c;
}

.severity-label.low {
  color: #909399;
}

.form-actions {
  display: flex;
  justify-content: flex-end;
  gap: 16px;
  padding-top: 16px;
}

.info-content {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.info-item {
  display: flex;
  gap: 12px;
}

.info-icon {
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: #ecf5ff;
  border-radius: 8px;
  flex-shrink: 0;
  color: #409eff;
  font-size: 20px;
}

.info-text h4 {
  margin: 0 0 6px 0;
  font-size: 14px;
  font-weight: 600;
  color: #303133;
}

.info-text p {
  margin: 0;
  font-size: 13px;
  color: #606266;
  line-height: 1.6;
}

.recent-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.recent-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px;
  background-color: #fafafa;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.3s;
}

.recent-item:hover {
  background-color: #f0f7ff;
}

.recent-left {
  display: flex;
  align-items: center;
  gap: 10px;
  flex: 1;
  min-width: 0;
}

.recent-title {
  font-size: 14px;
  color: #303133;
  font-weight: 500;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.recent-right {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
}

.recent-time {
  font-size: 12px;
  color: #909399;
}

.recent-right .el-icon {
  color: #c0c4cc;
  font-size: 12px;
}

@media (max-width: 1200px) {
  .el-col {
    margin-bottom: 24px;
  }
}
</style>
