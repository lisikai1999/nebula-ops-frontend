<template>
  <div class="incident-list-page">
    <el-card class="page-header-card" shadow="never">
      <div class="page-header">
        <div class="header-left">
          <el-icon class="header-icon"><List /></el-icon>
          <h1 class="page-title">事件调查列表</h1>
          <el-tag type="primary" effect="plain">调查记录</el-tag>
        </div>
        <div class="header-right">
          <el-button type="primary" @click="goToLaunch">
            <el-icon><Plus /></el-icon>
            发起新调查
          </el-button>
          <el-button @click="loadInvestigations" :loading="isLoading">
            <el-icon><Refresh /></el-icon>
            刷新
          </el-button>
        </div>
      </div>
    </el-card>

    <el-card class="filter-card" shadow="never">
      <el-form :inline="true" :model="filterForm" class="filter-form">
        <el-form-item label="状态">
          <el-select v-model="filterForm.status" placeholder="全部状态" clearable style="width: 140px">
            <el-option label="调查中" value="investigating" />
            <el-option label="已完成" value="completed" />
            <el-option label="已关闭" value="closed" />
          </el-select>
        </el-form-item>
        <el-form-item label="严重程度">
          <el-select v-model="filterForm.severity" placeholder="全部级别" clearable style="width: 120px">
            <el-option label="严重" value="critical" />
            <el-option label="高" value="high" />
            <el-option label="中" value="medium" />
            <el-option label="低" value="low" />
          </el-select>
        </el-form-item>
        <el-form-item label="环境">
          <el-select v-model="filterForm.environmentId" placeholder="全部环境" clearable filterable style="width: 180px">
            <el-option
              v-for="env in environmentOptions"
              :key="env.value"
              :label="env.label"
              :value="env.value"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="关键词">
          <el-input v-model="filterForm.keyword" placeholder="搜索标题/描述" clearable style="width: 200px" @keyup.enter="handleSearch" />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="handleSearch">
            <el-icon><Search /></el-icon>
            搜索
          </el-button>
          <el-button @click="handleResetFilter">
            <el-icon><RefreshRight /></el-icon>
            重置
          </el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <el-card class="table-card" shadow="never">
      <el-table
        :data="filteredInvestigations"
        v-loading="isLoading"
        stripe
        style="width: 100%"
        @row-click="handleRowClick"
        :row-class-name="getRowClassName"
      >
        <el-table-column prop="incidentId" label="事件ID" min-width="180">
          <template #default="{ row }">
            <span class="incident-id">{{ row.incidentId }}</span>
          </template>
        </el-table-column>
        <el-table-column prop="title" label="调查标题" min-width="280" show-overflow-tooltip>
          <template #default="{ row }">
            <div class="title-cell">
              <span class="title-text">{{ row.title }}</span>
            </div>
          </template>
        </el-table-column>
        <el-table-column prop="environmentName" label="环境" min-width="140">
          <template #default="{ row }">
            <el-tag size="small" type="info">{{ row.environmentName || '-' }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="severity" label="严重程度" min-width="100" align="center">
          <template #default="{ row }">
            <el-tag :type="getSeverityTag(row.severity)" size="small" effect="dark">
              {{ getSeverityText(row.severity) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="status" label="状态" min-width="100" align="center">
          <template #default="{ row }">
            <el-tag :type="getStatusTag(row.status)" size="small">
              {{ getStatusText(row.status) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="createdAt" label="创建时间" min-width="160">
          <template #default="{ row }">
            <span class="time-text">{{ formatDate(row.createdAt) }}</span>
          </template>
        </el-table-column>
        <el-table-column label="操作" fixed="right" width="150" align="center">
          <template #default="{ row }">
            <el-button type="primary" link size="small" @click.stop="viewDetail(row)">
              <el-icon><View /></el-icon>
              查看详情
            </el-button>
            <el-button v-if="row.status === 'completed'" type="success" link size="small" @click.stop="handleExport(row)">
              <el-icon><Download /></el-icon>
              导出
            </el-button>
          </template>
        </el-table-column>
      </el-table>

      <el-empty 
        v-if="!isLoading && filteredInvestigations.length === 0" 
        description="暂无调查记录"
        :image-size="80"
      >
        <el-button type="primary" @click="goToLaunch">
          <el-icon><Plus /></el-icon>
          发起第一个调查
        </el-button>
      </el-empty>

      <div class="pagination-wrapper" v-if="filteredInvestigations.length > 0">
        <el-pagination
          v-model:current-page="pagination.currentPage"
          v-model:page-size="pagination.pageSize"
          :page-sizes="[10, 20, 50, 100]"
          :total="pagination.total"
          layout="total, sizes, prev, pager, next, jumper"
          @size-change="handleSizeChange"
          @current-change="handleCurrentChange"
        />
      </div>
    </el-card>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import {
  List,
  Plus,
  Refresh,
  Search,
  RefreshRight,
  View,
  Download
} from '@element-plus/icons-vue'
import { useAwsEnvironmentsStore } from '@/stores/aws-environments'

const awsEnvironmentsStore = useAwsEnvironmentsStore()

const isLoading = ref(false)
const environmentOptions = computed(() => awsEnvironmentsStore.environmentOptions)

const filterForm = reactive({
  status: '',
  severity: '',
  environmentId: '',
  keyword: ''
})

const pagination = reactive({
  currentPage: 1,
  pageSize: 10,
  total: 0
})

const mockInvestigations = ref([
  {
    id: '1',
    incidentId: 'INC-2026-0428-001',
    title: '生产环境 ECS 服务异常',
    environmentName: 'China Prod',
    environmentId: 'env-001',
    severity: 'critical',
    status: 'completed',
    createdAt: '2026-04-28 08:32:15',
    description: '生产环境 ECS 服务健康检查失败，3个实例无法正常提供服务'
  },
  {
    id: '2',
    incidentId: 'INC-2026-0427-003',
    title: '测试环境数据库连接超时',
    environmentName: 'Singapore Dev',
    environmentId: 'env-002',
    severity: 'medium',
    status: 'completed',
    createdAt: '2026-04-27 14:20:30',
    description: '测试环境数据库连接池耗尽，应用无法获取数据库连接'
  },
  {
    id: '3',
    incidentId: 'INC-2026-0426-002',
    title: 'Lambda 函数执行超时',
    environmentName: 'US East Prod',
    environmentId: 'env-003',
    severity: 'high',
    status: 'investigating',
    createdAt: '2026-04-26 11:45:00',
    description: '数据处理 Lambda 函数执行超时，影响数据同步流程'
  },
  {
    id: '4',
    incidentId: 'INC-2026-0425-001',
    title: 'S3 存储桶权限问题',
    environmentName: 'China Prod',
    environmentId: 'env-001',
    severity: 'low',
    status: 'closed',
    createdAt: '2026-04-25 09:10:20',
    description: '新创建的 S3 存储桶权限配置不正确，导致应用无法访问'
  }
])

const filteredInvestigations = computed(() => {
  let result = [...mockInvestigations.value]
  
  if (filterForm.status) {
    result = result.filter(item => item.status === filterForm.status)
  }
  
  if (filterForm.severity) {
    result = result.filter(item => item.severity === filterForm.severity)
  }
  
  if (filterForm.environmentId) {
    result = result.filter(item => item.environmentId === filterForm.environmentId)
  }
  
  if (filterForm.keyword) {
    const keyword = filterForm.keyword.toLowerCase()
    result = result.filter(item => 
      item.title.toLowerCase().includes(keyword) ||
      item.description.toLowerCase().includes(keyword) ||
      item.incidentId.toLowerCase().includes(keyword)
    )
  }
  
  pagination.total = result.length
  
  const start = (pagination.currentPage - 1) * pagination.pageSize
  const end = start + pagination.pageSize
  
  return result.slice(start, end)
})

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

const getStatusTag = (status) => {
  const map = {
    investigating: 'primary',
    completed: 'success',
    closed: 'info'
  }
  return map[status] || 'info'
}

const getStatusText = (status) => {
  const map = {
    investigating: '调查中',
    completed: '已完成',
    closed: '已关闭'
  }
  return map[status] || '未知'
}

const getRowClassName = ({ row }) => {
  if (row.severity === 'critical') {
    return 'critical-row'
  }
  return ''
}

const formatDate = (dateStr) => {
  if (!dateStr) return '-'
  return dateStr
}

const loadInvestigations = async () => {
  isLoading.value = true
  try {
    await awsEnvironmentsStore.fetchEnvironments()
    await new Promise(resolve => setTimeout(resolve, 500))
  } catch (error) {
    console.error('加载调查列表失败:', error)
    ElMessage.error('加载失败，请稍后重试')
  } finally {
    isLoading.value = false
  }
}

const handleSearch = () => {
  pagination.currentPage = 1
}

const handleResetFilter = () => {
  filterForm.status = ''
  filterForm.severity = ''
  filterForm.environmentId = ''
  filterForm.keyword = ''
  pagination.currentPage = 1
}

const handleRowClick = (row) => {
  viewDetail(row)
}

const viewDetail = (row) => {
  window.location.hash = `#/aws/devops-incident?id=${row.id}`
}

const handleExport = (row) => {
  ElMessage.success(`正在导出调查记录: ${row.incidentId}`)
}

const goToLaunch = () => {
  window.location.hash = '#/aws/devops-incident-launch'
}

const handleSizeChange = (val) => {
  pagination.pageSize = val
}

const handleCurrentChange = (val) => {
  pagination.currentPage = val
}

onMounted(() => {
  loadInvestigations()
})
</script>

<style scoped>
.incident-list-page {
  min-height: 100%;
}

.page-header-card,
.filter-card,
.table-card {
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

.header-right {
  display: flex;
  gap: 12px;
}

.filter-form {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.incident-id {
  font-family: 'Monaco', 'Menlo', monospace;
  font-weight: 500;
  color: #409eff;
}

.title-cell {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.title-text {
  font-weight: 500;
  color: #303133;
}

.time-text {
  color: #606266;
  font-size: 13px;
}

.pagination-wrapper {
  display: flex;
  justify-content: flex-end;
  padding-top: 20px;
}

:deep(.el-table) {
  cursor: pointer;
}

:deep(.el-table tr:hover) {
  background-color: #f5f7fa;
}

:deep(.critical-row) {
  background-color: #fef0f0;
}

:deep(.critical-row:hover > td) {
  background-color: #fde2e2 !important;
}

@media (max-width: 768px) {
  .page-header {
    flex-direction: column;
    align-items: flex-start;
  }
  
  .page-title {
    font-size: 18px;
  }
  
  .header-right {
    width: 100%;
    justify-content: flex-start;
  }
}
</style>
