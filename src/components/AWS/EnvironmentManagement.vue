<template>
  <div class="environment-management-page">
    <el-card class="page-header-card" shadow="never">
      <div class="page-header">
        <div class="header-left">
          <el-icon class="header-icon"><Setting /></el-icon>
          <h1 class="page-title">AWS 环境凭证管理</h1>
          <el-tag type="primary" effect="plain">统一管理</el-tag>
        </div>
        <div class="header-right">
          <el-button type="primary" @click="openAddDialog">
            <el-icon><Plus /></el-icon>
            添加环境
          </el-button>
          <el-button @click="loadEnvironments" :loading="isLoading">
            <el-icon><Refresh /></el-icon>
            刷新
          </el-button>
        </div>
      </div>
    </el-card>

    <el-card class="list-card" shadow="never">
      <el-table 
        :data="environments" 
        v-loading="isLoading"
        :empty-text="isLoading ? '加载中...' : '暂无环境数据'"
        stripe
        style="width: 100%"
      >
        <el-table-column prop="name" label="环境名称" min-width="180">
          <template #default="{ row }">
            <div class="env-name-cell">
              <span class="env-name">{{ row.name }}</span>
              <el-tag v-if="row.is_default" type="warning" size="small" effect="dark">默认</el-tag>
            </div>
          </template>
        </el-table-column>

        <el-table-column prop="access_key_id" label="Access Key ID" min-width="200">
          <template #default="{ row }">
            <span class="masked-text">{{ maskAccessKey(row.access_key_id) }}</span>
          </template>
        </el-table-column>

        <el-table-column prop="region" label="区域" min-width="120">
          <template #default="{ row }">
            <el-tag size="small">{{ row.region || '-' }}</el-tag>
          </template>
        </el-table-column>

        <el-table-column prop="description" label="描述" min-width="200" show-overflow-tooltip>
          <template #default="{ row }">
            {{ row.description || '-' }}
          </template>
        </el-table-column>

        <el-table-column prop="created_at" label="创建时间" min-width="180">
          <template #default="{ row }">
            {{ formatDate(row.created_at) }}
          </template>
        </el-table-column>

        <el-table-column label="操作" fixed="right" width="220">
          <template #default="{ row }">
            <el-button type="primary" link size="small" @click="openEditDialog(row)">
              <el-icon><Edit /></el-icon>
              编辑
            </el-button>
            <el-button 
              type="warning" 
              link 
              size="small" 
              @click="handleSetDefault(row)"
              :disabled="row.is_default"
            >
              <el-icon><Star /></el-icon>
              设为默认
            </el-button>
            <el-button type="danger" link size="small" @click="handleDelete(row)">
              <el-icon><Delete /></el-icon>
              删除
            </el-button>
          </template>
        </el-table-column>
      </el-table>

      <el-empty 
        v-if="!isLoading && environments.length === 0" 
        description="暂无环境配置，点击上方按钮添加新环境"
        :image-size="80"
      >
        <el-button type="primary" @click="openAddDialog">
          <el-icon><Plus /></el-icon>
          添加第一个环境
        </el-button>
      </el-empty>
    </el-card>

    <el-dialog 
      v-model="dialogVisible" 
      :title="isEdit ? '编辑环境' : '添加环境'"
      width="600px"
      :close-on-click-modal="false"
      destroy-on-close
    >
      <el-form 
        ref="formRef" 
        :model="formData" 
        :rules="formRules" 
        label-width="120px"
      >
        <el-form-item label="环境名称" prop="name">
          <el-input 
            v-model="formData.name" 
            placeholder="请输入环境名称，如：china prod"
            clearable
          />
          <div class="form-tip">
            <el-text type="info" size="small">
              建议使用有意义的名称，如：china prod、singapore-dev 等
            </el-text>
          </div>
        </el-form-item>

        <el-form-item label="Access Key ID" prop="access_key_id">
          <el-input 
            v-model="formData.access_key_id" 
            placeholder="请输入 AWS Access Key ID"
            clearable
            show-password
          />
          <div class="form-tip">
            <el-text type="info" size="small">
              AWS IAM 用户的 Access Key ID
            </el-text>
          </div>
        </el-form-item>

        <el-form-item label="Secret Access Key" prop="secret_access_key">
          <el-input 
            v-model="formData.secret_access_key" 
            placeholder="请输入 AWS Secret Access Key"
            clearable
            show-password
          />
          <div class="form-tip">
            <el-text type="info" size="small">
              AWS IAM 用户的 Secret Access Key（编辑时留空表示不修改）
            </el-text>
          </div>
        </el-form-item>

        <el-form-item label="区域" prop="region">
          <el-select 
            v-model="formData.region" 
            placeholder="请选择 AWS 区域"
            style="width: 100%"
            clearable
            filterable
          >
            <el-option 
              v-for="region in awsRegions" 
              :key="region.value" 
              :label="region.label" 
              :value="region.value"
            />
          </el-select>
        </el-form-item>

        <el-form-item label="设为默认" prop="is_default">
          <el-switch 
            v-model="formData.is_default" 
            active-text="是" 
            inactive-text="否"
          />
          <div class="form-tip">
            <el-text type="info" size="small">
              设置为默认环境后，其他页面会默认选择此环境
            </el-text>
          </div>
        </el-form-item>

        <el-form-item label="描述" prop="description">
          <el-input 
            v-model="formData.description" 
            type="textarea"
            :rows="3"
            placeholder="请输入环境描述（可选）"
            maxlength="500"
            show-word-limit
          />
        </el-form-item>
      </el-form>

      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" @click="handleSubmit" :loading="submitLoading">
          {{ isEdit ? '保存' : '创建' }}
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Setting, Plus, Refresh, Edit, Star, Delete } from '@element-plus/icons-vue'
import { useAwsEnvironmentsStore } from '@/stores/aws-environments'

const awsEnvironmentsStore = useAwsEnvironmentsStore()

const isLoading = computed(() => awsEnvironmentsStore.isLoading)
const environments = computed(() => awsEnvironmentsStore.environments)

const dialogVisible = ref(false)
const isEdit = ref(false)
const submitLoading = ref(false)
const formRef = ref(null)
const editingId = ref(null)

const formData = reactive({
  name: '',
  access_key_id: '',
  secret_access_key: '',
  region: '',
  is_default: false,
  description: ''
})

const formRules = {
  name: [
    { required: true, message: '请输入环境名称', trigger: 'blur' },
    { min: 2, max: 50, message: '环境名称长度在 2 到 50 个字符', trigger: 'blur' }
  ],
  access_key_id: [
    { required: true, message: '请输入 Access Key ID', trigger: 'blur' },
    { min: 16, message: 'Access Key ID 长度至少 16 个字符', trigger: 'blur' }
  ],
  secret_access_key: [
    { 
      validator: (rule, value, callback) => {
        if (isEdit.value) {
          if (value && value.length < 30) {
            callback(new Error('Secret Access Key 长度至少 30 个字符'))
          } else {
            callback()
          }
        } else {
          if (!value) {
            callback(new Error('请输入 Secret Access Key'))
          } else if (value.length < 30) {
            callback(new Error('Secret Access Key 长度至少 30 个字符'))
          } else {
            callback()
          }
        }
      },
      trigger: ['blur', 'change']
    }
  ],
  region: [
    { required: true, message: '请选择 AWS 区域', trigger: 'change' }
  ]
}

const awsRegions = [
  { label: '中国 (北京) - cn-north-1', value: 'cn-north-1' },
  { label: '中国 (宁夏) - cn-northwest-1', value: 'cn-northwest-1' },
  { label: '美国东部 (弗吉尼亚) - us-east-1', value: 'us-east-1' },
  { label: '美国东部 (俄亥俄) - us-east-2', value: 'us-east-2' },
  { label: '美国西部 (加利福尼亚) - us-west-1', value: 'us-west-1' },
  { label: '美国西部 (俄勒冈) - us-west-2', value: 'us-west-2' },
  { label: '亚太地区 (新加坡) - ap-southeast-1', value: 'ap-southeast-1' },
  { label: '亚太地区 (悉尼) - ap-southeast-2', value: 'ap-southeast-2' },
  { label: '亚太地区 (东京) - ap-northeast-1', value: 'ap-northeast-1' },
  { label: '亚太地区 (首尔) - ap-northeast-2', value: 'ap-northeast-2' },
  { label: '亚太地区 (孟买) - ap-south-1', value: 'ap-south-1' },
  { label: '欧洲 (爱尔兰) - eu-west-1', value: 'eu-west-1' },
  { label: '欧洲 (法兰克福) - eu-central-1', value: 'eu-central-1' },
  { label: '欧洲 (伦敦) - eu-west-2', value: 'eu-west-2' },
  { label: '欧洲 (巴黎) - eu-west-3', value: 'eu-west-3' },
  { label: '加拿大 (中部) - ca-central-1', value: 'ca-central-1' },
  { label: '南美洲 (圣保罗) - sa-east-1', value: 'sa-east-1' },
  { label: '中东 (巴林) - me-south-1', value: 'me-south-1' },
  { label: '非洲 (开普敦) - af-south-1', value: 'af-south-1' },
  { label: '欧洲 (斯德哥尔摩) - eu-north-1', value: 'eu-north-1' },
  { label: '亚太地区 (香港) - ap-east-1', value: 'ap-east-1' }
]

const loadEnvironments = async () => {
  await awsEnvironmentsStore.fetchEnvironments()
}

const maskAccessKey = (key) => {
  if (!key) return '-'
  if (key.length <= 8) return '****'
  return key.substring(0, 4) + '****' + key.substring(key.length - 4)
}

const formatDate = (dateStr) => {
  if (!dateStr) return '-'
  const date = new Date(dateStr)
  return date.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  })
}

const resetForm = () => {
  formData.name = ''
  formData.access_key_id = ''
  formData.secret_access_key = ''
  formData.region = ''
  formData.is_default = false
  formData.description = ''
  editingId.value = null
}

const openAddDialog = () => {
  resetForm()
  isEdit.value = false
  dialogVisible.value = true
}

const openEditDialog = (row) => {
  resetForm()
  isEdit.value = true
  editingId.value = row.id
  formData.name = row.name
  formData.access_key_id = row.access_key_id || ''
  formData.secret_access_key = ''
  formData.region = row.region || ''
  formData.is_default = row.is_default || false
  formData.description = row.description || ''
  dialogVisible.value = true
}

const handleSubmit = async () => {
  if (!formRef.value) return
  
  await formRef.value.validate(async (valid) => {
    if (valid) {
      submitLoading.value = true
      try {
        const submitData = {
          name: formData.name,
          access_key_id: formData.access_key_id,
          region: formData.region,
          is_default: formData.is_default,
          description: formData.description
        }
        
        if (formData.secret_access_key) {
          submitData.secret_access_key = formData.secret_access_key
        }
        
        if (isEdit.value) {
          await awsEnvironmentsStore.updateEnvironment(editingId.value, submitData)
        } else {
          await awsEnvironmentsStore.createEnvironment(submitData)
        }
        
        dialogVisible.value = false
      } catch (error) {
        console.error('提交失败:', error)
      } finally {
        submitLoading.value = false
      }
    }
  })
}

const handleDelete = async (row) => {
  try {
    await ElMessageBox.confirm(
      `确定要删除环境 "${row.name}" 吗？此操作不可恢复。`,
      '确认删除',
      {
        confirmButtonText: '确认删除',
        cancelButtonText: '取消',
        type: 'warning'
      }
    )
    await awsEnvironmentsStore.deleteEnvironment(row.id)
  } catch (error) {
    if (error !== 'cancel') {
      console.error('删除失败:', error)
    }
  }
}

const handleSetDefault = async (row) => {
  try {
    await ElMessageBox.confirm(
      `确定要将 "${row.name}" 设置为默认环境吗？`,
      '确认设置',
      {
        confirmButtonText: '确认',
        cancelButtonText: '取消',
        type: 'info'
      }
    )
    await awsEnvironmentsStore.setDefaultEnvironment(row.id)
  } catch (error) {
    if (error !== 'cancel') {
      console.error('设置默认环境失败:', error)
    }
  }
}

onMounted(() => {
  loadEnvironments()
})
</script>

<style scoped>
.environment-management-page {
  min-height: 100%;
}

.page-header-card,
.list-card {
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
  align-items: center;
  gap: 12px;
}

.env-name-cell {
  display: flex;
  align-items: center;
  gap: 8px;
}

.env-name {
  font-weight: 500;
  color: #303133;
}

.masked-text {
  font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
  color: #606266;
}

.form-tip {
  margin-top: 8px;
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