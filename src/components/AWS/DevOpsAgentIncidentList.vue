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
import { ref, reactive, computed, onMounted, onUnmounted, watch } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
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
import { useDevOpsIncidentStore } from '@/stores/devops-incident-store'

const awsEnvironmentsStore = useAwsEnvironmentsStore()
const devOpsIncidentStore = useDevOpsIncidentStore()

const isLoading = computed(() => devOpsIncidentStore.isLoading)
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

const investigations = computed(() => devOpsIncidentStore.investigations)

const filteredInvestigations = computed(() => {
  return investigations.value
})

const getSeverityTag = (severity) => {
  return devOpsIncidentStore.getSeverityTag(severity)
}

const getSeverityText = (severity) => {
  return devOpsIncidentStore.getSeverityText(severity)
}

const getStatusTag = (status) => {
  return devOpsIncidentStore.getStatusTag(status)
}

const getStatusText = (status) => {
  return devOpsIncidentStore.getStatusText(status)
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

const fetchData = async () => {
  try {
    const params = {
      page: pagination.currentPage,
      pageSize: pagination.pageSize
    }
    
    if (filterForm.status) params.status = filterForm.status
    if (filterForm.severity) params.severity = filterForm.severity
    if (filterForm.environmentId) params.environmentId = filterForm.environmentId
    if (filterForm.keyword) params.keyword = filterForm.keyword
    
    await devOpsIncidentStore.fetchInvestigations(params)
    pagination.total = devOpsIncidentStore.investigationCount
  } catch (error) {
    console.error('加载调查列表失败:', error)
  }
}

const loadInvestigations = async () => {
  try {
    await awsEnvironmentsStore.fetchEnvironments()
    await fetchData()
  } catch (error) {
    console.error('加载调查列表失败:', error)
  }
}

const handleSearch = () => {
  pagination.currentPage = 1
  fetchData()
}

const handleResetFilter = () => {
  filterForm.status = ''
  filterForm.severity = ''
  filterForm.environmentId = ''
  filterForm.keyword = ''
  pagination.currentPage = 1
  fetchData()
}

const handleRowClick = (row) => {
  viewDetail(row)
}

const viewDetail = (row) => {
  const investigationId = row.id || row.incidentId
  window.location.hash = `#/aws/devops-incident?id=${investigationId}`
}

const handleExport = async (row) => {
  try {
    const investigationId = row.id || row.incidentId
    await devOpsIncidentStore.exportInvestigation(investigationId)
  } catch (error) {
    console.error('导出失败:', error)
  }
}

const goToLaunch = () => {
  window.location.hash = '#/aws/devops-incident-launch'
}

const handleSizeChange = (val) => {
  pagination.pageSize = val
  fetchData()
}

const handleCurrentChange = (val) => {
  pagination.currentPage = val
  fetchData()
}

onMounted(() => {
  loadInvestigations()
})

onUnmounted(() => {
  devOpsIncidentStore.clearCurrentInvestigation()
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
