<template>
  <div class="knowledge-page">
    <div class="page-header">
      <h2 class="page-title">知识库管理</h2>
      <el-tag type="warning" effect="plain">禁止上传隐私数据（如数据库账密等）</el-tag>
    </div>
    
    <!-- 加载状态指示器 -->
    <div v-if="loading" class="loading-container">
      <el-loading text="加载中..." />
    </div>
    
    <!-- 查询区域 -->
    <div class="section-card">
      <h3 class="section-title">知识搜索</h3>
      <el-form :inline="true" :model="queryParams" class="search-form">
        <el-form-item label="分类筛选">
          <el-select v-model="queryParams.category" placeholder="全部分类" clearable style="width: 180px;">
            <el-option 
              v-for="item in categories" 
              :key="item.value" 
              :label="item.label"
              :value="item.value" 
            />
          </el-select>
        </el-form-item>

        <el-form-item label="标签搜索">
          <el-input v-model="queryParams.tags" placeholder="多个标签用逗号分隔" clearable style="width: 200px;">
            <template #prefix>
              <el-icon><CollectionTag /></el-icon>
            </template>
          </el-input>
        </el-form-item>

        <el-form-item label="关键词">
          <el-input v-model="queryParams.keyword" placeholder="标题或内容关键词" clearable style="width: 200px;">
            <template #prefix>
              <el-icon><Search /></el-icon>
            </template>
          </el-input>
        </el-form-item>

        <el-form-item>
          <el-button type="primary" @click="handleSearch" :loading="searchLoading">
            <el-icon><Search /></el-icon>
            搜索
          </el-button>
          <el-button @click="resetSearch">
            <el-icon><Refresh /></el-icon>
            重置
          </el-button>
        </el-form-item>
      </el-form>

      <!-- 搜索结果展示 -->
      <div v-if="searchResults.length > 0" class="result-section">
        <el-table :data="searchResults" stripe style="width: 100%" v-loading="searchLoading">
          <el-table-column prop="title" label="标题" min-width="200">
            <template #default="{ row }">
              <span class="text-ellipsis" :title="row.title">{{ row.title }}</span>
            </template>
          </el-table-column>

          <el-table-column prop="category" label="分类" width="120">
            <template #default="{ row }">
              {{ getCategoryLabel(row.category) }}
            </template>
          </el-table-column>

          <el-table-column prop="tags" label="标签" min-width="150">
            <template #default="{ row }">
              <el-tag 
                v-for="(tag, index) in row.tags" 
                :key="index" 
                type="info" 
                size="small" 
                style="margin-right: 4px; margin-bottom: 4px;"
              >
                {{ tag }}
              </el-tag>
            </template>
          </el-table-column>

          <el-table-column prop="content" label="内容摘要" min-width="300">
            <template #default="{ row }">
              <div class="content-preview">
                {{ truncateContent(row.content) }}
              </div>
            </template>
          </el-table-column>

          <el-table-column label="操作" width="150" align="center">
            <template #default="{ row }">
              <el-button type="primary" size="small" @click="handleEdit(row)" style="margin-right: 8px;">
                编辑
              </el-button>
              <el-button type="danger" size="small" @click="handleDelete(row.id)">
                删除
              </el-button>
            </template>
          </el-table-column>
        </el-table>
      </div>

      <!-- 无结果提示 -->
      <div v-if="showNoResult" class="no-result">
        <el-empty description="暂无相关结果" />
      </div>
    </div>

    <!-- 知识录入区域 -->
    <div class="section-card">
      <h3 class="section-title">知识录入</h3>
      <el-form :model="formData" ref="knowledgeForm" :rules="formRules" label-width="100px" style="max-width: 800px;">
        <el-form-item label="知识分类" prop="category">
          <el-select v-model="formData.category" placeholder="选择分类" style="width: 300px;">
            <el-option 
              v-for="item in categories" 
              :key="item.value" 
              :label="item.label"
              :value="item.value" 
            />
          </el-select>
        </el-form-item>
        
        <el-form-item label="知识标签" prop="tags">
          <el-input v-model="formData.tags" placeholder="输入标签（多个用逗号分隔）" style="width: 300px;" clearable />
        </el-form-item>

        <el-form-item label="知识标题" prop="title">
          <el-input v-model="formData.title" placeholder="请输入标题" style="width: 400px;" clearable />
        </el-form-item>

        <el-form-item label="知识内容" prop="content">
          <el-input 
            v-model="formData.content" 
            type="textarea" 
            :rows="6" 
            placeholder="请输入详细内容" 
            style="width: 600px;"
            resize="vertical" 
          />
        </el-form-item>

        <el-form-item>
          <el-button type="primary" @click="submitForm" :loading="submitting">
            <el-icon><Plus /></el-icon>
            提交知识
          </el-button>
        </el-form-item>
      </el-form>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import { 
  Search, 
  Refresh, 
  CollectionTag, 
  Plus 
} from '@element-plus/icons-vue';

const loading = ref(false);
const submitting = ref(false);
const knowledgeForm = ref(null);

// 搜索相关状态
const queryParams = reactive({
  category: '',
  tags: '',
  keyword: ''
});
const searchResults = ref([]);
const searchLoading = ref(false);
const showNoResult = ref(false);

// 表单数据结构
const formData = reactive({
  title: '',
  content: '',
  category: '',
  tags: ''
});

// 表单验证规则
const formRules = reactive({
  title: [{ required: true, message: '标题不能为空', trigger: 'blur' }],
  content: [{ required: true, message: '内容不能为空', trigger: 'blur' }],
  category: [{ required: true, message: '请选择分类', trigger: 'change' }]
});

// 分类选项
const categories = ref([
  { value: 'tech', label: '技术文档' },
  { value: 'faq', label: '常见问题' },
  { value: 'guide', label: '操作指南' },
  { value: 'other', label: '其他分类' }
]);

// 分类标签映射
const getCategoryLabel = (value) => {
  return categories.value.find(c => c.value === value)?.label || '未知分类';
};

// 内容截断显示
const truncateContent = (text) => {
  if (!text) return '';
  return text.length > 100 ? text.substring(0, 100) + '...' : text;
};

// 重置搜索
const resetSearch = () => {
  queryParams.category = '';
  queryParams.tags = '';
  queryParams.keyword = '';
  searchResults.value = [];
  showNoResult.value = false;
};

// 提交表单
const submitForm = async () => {
  try {
    submitting.value = true;
    await knowledgeForm.value.validate();

    const payload = {
      ...formData
    };
    
    const csrftoken = document.cookie.match(/csrftoken=([\w-]+)/)?.[1];

    const res = await axios.post('/api/ai/knowledge/create', payload, {
      headers: {
        'X-CSRFToken': csrftoken
      }
    });
    
    if (res.data.status === "success") {
      ElMessage.success("提交成功");
      knowledgeForm.value.resetFields();
    }
  } catch (err) {
    console.log(err);
    ElMessage.error("提交失败");
  } finally {
    submitting.value = false;
  }
};

// 搜索处理
const handleSearch = async () => {
  try {
    searchLoading.value = true;
    const params = {
      ...queryParams,
      tags: queryParams.tags ? queryParams.tags.split(',').map(t => t.trim()) : []
    };

    const res = await axios.get('/api/ai/knowledge/search', { params });
    if (res.data.status === 200) {
      console.log(res.data);
      searchResults.value = res.data.data;
      showNoResult.value = searchResults.value.length === 0;
    }
  } catch (err) {
    ElMessage.error('搜索失败：' + (err.response?.data?.error || '网络异常'));
  } finally {
    console.log("执行");
    searchLoading.value = false;
  }
};

const handleEdit = async (row) => {
  // 处理编辑逻辑
  console.log('编辑行数据:', row);
  formData.tags = row.tags;
  formData.title = row.title;
  formData.content = row.content;
  formData.category = row.category;
};

const handleDelete = async (rowId) => {
  try {
    await ElMessageBox.confirm('确认删除该记录吗？', '提示', {
      confirmButtonText: '确认',
      cancelButtonText: '取消',
      type: 'warning'
    });

    const csrftoken = document.cookie.match(/csrftoken=([\w-]+)/)?.[1];

    const response = await axios.post("/api/ai/knowledge/delete", 
      { id: rowId }, 
      {
        headers: {
          'X-CSRFToken': csrftoken
        }
      }
    );
    
    ElMessage.success("删除成功");
    // 重新加载搜索结果
    handleSearch();
  } catch (error) {
    if (error !== 'cancel') {
      console.log(error);
      ElMessage.error("删除失败");
    }
  }
};
</script>

<style scoped>
.knowledge-page {
  min-height: 100%;
}

.page-header {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 20px;
}

.page-title {
  font-size: 20px;
  font-weight: 600;
  color: #303133;
  margin: 0;
}

.loading-container {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 200px;
}

.section-card {
  background: #fff;
  padding: 24px;
  border-radius: 8px;
  margin-bottom: 24px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.05);
}

.section-title {
  font-size: 16px;
  font-weight: 600;
  color: #303133;
  margin: 0 0 20px 0;
  padding-bottom: 12px;
  border-bottom: 1px solid #ebeef5;
}

.search-form {
  margin-bottom: 20px;
}

.text-ellipsis {
  display: inline-block;
  max-width: 180px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.content-preview {
  color: #666;
  line-height: 1.6;
}

.no-result {
  margin: 40px 0;
  background: #f8f9fa;
  border-radius: 8px;
  padding: 20px;
}

.result-section {
  margin-top: 20px;
}

@media (max-width: 768px) {
  .section-card {
    padding: 16px;
  }
  
  .search-form :deep(.el-form-item) {
    margin-bottom: 16px;
  }
  
  .text-ellipsis {
    max-width: 120px;
  }
}
</style>
