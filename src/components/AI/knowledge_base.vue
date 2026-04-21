<template>
    <h2>知识库管理-禁止上传隐私数据(如数据库账密等)</h2>

    <!-- 加载状态指示器 -->
    <div v-if="loading" class="spinner-border" style="width: 4rem; height: 4rem;" role="status">
        <span class="sr-only"></span>
    </div>

    <!-- 查询区域 -->
    <div class="action-section">
        <el-form :inline="true" :model="queryParams" class="search-form">
            <div class="filter-group">
                <!-- 分类筛选 -->
                <el-form-item label="分类筛选">
                    <el-select v-model="queryParams.category" placeholder="全部分类" clearable class="form-input-sm">
                        <el-option v-for="item in categories" :key="item.value" :label="item.label"
                            :value="item.value" />
                    </el-select>
                </el-form-item>

                <!-- 标签搜索 -->
                <el-form-item label="标签搜索">
                    <el-input v-model="queryParams.tags" placeholder="多个标签用逗号分隔" clearable class="form-input-sm">
                        <template #prefix>
                            <i class="el-icon-collection-tag"></i>
                        </template>
                    </el-input>
                </el-form-item>

                <!-- 关键词搜索 -->
                <el-form-item label="关键词">
                    <el-input v-model="queryParams.keyword" placeholder="标题或内容关键词" clearable class="form-input-sm">
                        <template #prefix>
                            <i class="el-icon-search"></i>
                        </template>
                    </el-input>
                </el-form-item>

                <!-- 搜索按钮 -->
                <el-form-item>
                    <el-button type="primary" @click="handleSearch" :loading="searchLoading">
                        搜索
                    </el-button>
                    <el-button @click="resetSearch">重置</el-button>
                </el-form-item>
            </div>
        </el-form>

        <!-- 搜索结果展示 -->
        <div v-if="searchResults.length > 0" class="result-section">
            <el-table :data="searchResults" stripe style="width: 100%" v-loading="searchLoading">
                <el-table-column prop="title" label="标题" width="200">
                    <template #default="{ row }">
                        <span class="text-ellipsis" :title="row.title">{{ row.title }}</span>
                    </template>
                </el-table-column>

                <el-table-column prop="category" label="分类" width="120">
                    <template #default="{ row }">
                        {{ getCategoryLabel(row.category) }}
                    </template>
                </el-table-column>

                <el-table-column prop="tags" label="标签">
                    <template #default="{ row }">
                        <el-tag v-for="(tag, index) in row.tags" :key="index" type="info" size="small" class="mr-1">
                            {{ tag }}
                        </el-tag>
                    </template>
                </el-table-column>

                <el-table-column prop="content" label="内容摘要">
                    <template #default="{ row }">
                        <div class="content-preview">
                            {{ truncateContent(row.content) }}
                        </div>
                    </template>
                </el-table-column>

                <el-table-column label="操作" width="150" align="center">
                    <template #default="{ row }">
                        <div class="action-buttons">
                            <el-button
                                type="primary"
                                size="small"
                                @click="handleEdit(row)"
                                class="mr-1"
                            >
                                编辑
                            </el-button>
                            <el-button
                                type="danger"
                                size="small"
                                @click="handleDelete(row.id)"
                            >
                                删除
                            </el-button>
                        </div>
                    </template>
                </el-table-column>
            </el-table>
        </div>

        <!-- 无结果提示 -->
        <div v-if="showNoResult" class="no-result">
            <el-empty description="暂无相关结果" />
        </div>
    </div>




    <!-- 加载状态指示器 -->
    <div v-if="loading" class="spinner-border" style="width: 4rem; height: 4rem;" role="status">
        <span class="sr-only"></span>
    </div>

    <!-- 操作区域 -->
    <div class="action-section">
        <el-form :model="formData" ref="knowledgeForm" :rules="formRules" label-width="100px">
                <!-- 分类选择 -->
                <el-form-item label="知识分类" prop="category">
                    <el-select v-model="formData.category" placeholder="选择分类" class="form-input">
                        <el-option v-for="item in categories" :key="item.value" :label="item.label"
                            :value="item.value" />
                    </el-select>
                </el-form-item>
                
                <p></p>
                
            <!-- 标签输入 -->
            <el-form-item label="知识标签" prop="tags">
                <el-input v-model="formData.tags" placeholder="输入标签（多个用逗号分隔）" class="form-input" clearable />
            </el-form-item>

            <!-- 标题输入 -->
            <el-form-item label="知识标题" prop="title">
                <el-input v-model="formData.title" placeholder="请输入标题" class="form-input" clearable />
            </el-form-item>

            <!-- 内容输入 -->
            <el-form-item label="知识内容" prop="content">
                <el-input v-model="formData.content" type="textarea" :rows="5" placeholder="请输入详细内容" class="form-input"
                    resize="none" />
            </el-form-item>

            <!-- 提交按钮 -->
            <el-form-item>
                <el-button type="primary" @click="submitForm" class="action-btn" :loading="submitting">
                    提交知识
                </el-button>
            </el-form-item>
        </el-form>
    </div>
</template>

<script setup>
import { ref, reactive } from 'vue'
const loading = ref(false)
const submitting = ref(false)
const knowledgeForm = ref(null)

// 搜索相关状态
const queryParams = reactive({
  category: '',
  tags: '',
  keyword: ''
})
const searchResults = ref([])
const searchLoading = ref(false)
const showNoResult = ref(false)


// 分类标签映射
const getCategoryLabel = (value) => {
  return categories.value.find(c => c.value === value)?.label || '未知分类'
}

// 内容截断显示
const truncateContent = (text) => {
  return text.length > 100 ? text.substring(0, 100) + '...' : text
}


// 重置搜索
const resetSearch = () => {
  queryParams.category = ''
  queryParams.tags = ''
  queryParams.keyword = ''
  searchResults.value = []
  showNoResult.value = false
}

// 表单数据结构
const formData = reactive({
    title: '',
    content: '',
    category: '',
    tags: ''
})

// 表单验证规则
const formRules = reactive({
    title: [{ required: true, message: '标题不能为空', trigger: 'blur' }],
    content: [{ required: true, message: '内容不能为空', trigger: 'blur' }],
    category: [{ required: true, message: '请选择分类', trigger: 'change' }]
})

// 分类选项
const categories = ref([
    { value: 'tech', label: '技术文档' },
    { value: 'faq', label: '常见问题' },
    { value: 'guide', label: '操作指南' },
    { value: 'other', label: '其他分类' }
])

// 提交表单
const submitForm = async () => {
    try {
        submitting.value = true
        await knowledgeForm.value.validate()

        const payload = {
            ...formData
        }
        console.log('payload', payload)
        const csrftoken = document.cookie.match(/csrftoken=([\w-]+)/)?.[1];

        const res = await axios.post('/api/ai/knowledge/create', payload, {
            headers: {
                'X-CSRFToken': csrftoken
            }
        })
        if (res.data.status == "success") {
            alert("提交成功")
            knowledgeForm.value.resetFields()
        }

    } catch (err) {
        console.log(err)
        alert("提交失败")
        
    } finally {
        submitting.value = false
    }
}


// 搜索处理
const handleSearch = async () => {
  try {
    searchLoading.value = true
    const params = {
      ...queryParams,
      tags: queryParams.tags.split(',').map(t => t.trim())
    }

    const res = await axios.get('/api/ai/knowledge/search', { params })
    if (res.data.status == 200) {
      console.log(res.data)
      searchResults.value = res.data.data
      showNoResult.value = searchResults.value.length === 0
    }
  } catch (err) {
    ElMessage.error('搜索失败：' + (err.response?.data?.error || '网络异常'))
  } finally {
    console.log("执行")
    searchLoading.value = false
  }
}

const handleEdit = async (row) =>{
        // 处理编辑逻辑
        console.log('编辑行数据:', row)
        formData.tags = row.tags
        formData.title = row.title
        formData.content = row.content
        formData.category = row.category
        
        
}

const handleDelete = async (row) => {
    // 处理删除逻辑
    console.log('删除行数据:', row)
    // 建议添加确认对话框
    if (confirm("确认删除该记录吗？")) {
        const csrftoken = document.cookie.match(/csrftoken=([\w-]+)/)?.[1];

        // 确认删除的API调用
        axios.post("/api/ai/knowledge/delete", 
            { id: row }, 
            {
                headers: {
                    'X-CSRFToken': csrftoken
            }
        }).
        then(response => {
            alert("删除" + row + "成功")
        }).catch(function (error) {
            console.log(error);
            alert("删除" + row + "失败")
        });
    }else{
        console.log('取消')
    }
    
}

</script>

<style scoped>
.action-section {
    background: #f8f9fa;
    padding: 30px;
    border-radius: 8px;
    margin: 20px 0;
    box-shadow: 0 2px 12px rgba(0, 0, 0, 0.05);
}

.form-input {
    width: 80%;
    max-width: 600px;
}

.filter-group {
    display: flex;
    gap: 20px;
    margin-bottom: 20px;
}

.action-btn {
    margin-top: 20px;
    width: 200px;
}

/* 新增样式 */
.search-form {
  margin-bottom: 20px;
}

.form-input-sm {
  width: 200px;
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

.mr-1 {
  margin-right: 4px;
}
</style>