<template>
    <h2>智能问答系统 - RAG知识增强</h2>

    <!-- 加载状态 -->
    <div v-if="loading" class="spinner-border" style="width: 4rem; height: 4rem;" role="status">
        <span class="sr-only"></span>
    </div>

    <!-- 主操作区 -->
    <div class="action-section">
        <!-- 提问输入区 -->
        <el-form :model="queryForm" ref="ragForm" label-width="100px">
            <el-form-item label="问题描述" prop="question">
                <el-input v-model="queryForm.question" type="textarea" :rows="4" placeholder="请输入您的问题"
                    class="question-input" resize="none" />
            </el-form-item>

            <!-- 参数配置 -->
            <div class="config-group">
                

                <el-form-item label="返回数量" class="config-item">
                    <el-input-number v-model="queryForm.top_k" :min="5" :max="15" controls-position="right" />
                </el-form-item>

                
            </div>

            <!-- 操作按钮 -->
            <el-form-item class="action-buttons">
                <el-button type="primary" @click="submitQuestion" :loading="processing" icon="el-icon-search">
                    执行问答
                </el-button>
                <el-button @click="clearForm">清空</el-button>
            </el-form-item>
        </el-form>

        <!-- 结果显示 -->
        <div v-if="showResults" class="result-section">
            <el-divider content-position="left">检索上下文</el-divider>
            <div class="context-cards">
                <el-card v-for="(doc, index) in retrievedDocs" :key="index" shadow="hover" class="doc-card">
                    
                    <div class="doc-content">
                        {{ doc.content }}
                    </div>
                </el-card>
            </div>

            <el-divider content-position="left">生成答案</el-divider>
            <div class="answer-section">
                <el-alert :title="generatedAnswer" type="success" :closable="false" show-icon />
                <div class="answer-actions">
                    <el-button type="text" @click="copyAnswer">
                        <i class="el-icon-document-copy"></i> 复制
                    </el-button>
                    <el-button type="text" @click="exportAnswer">
                        <i class="el-icon-download"></i> 导出
                    </el-button>
                </div>
            </div>
        </div>

        <!-- 历史记录 -->
        <el-divider content-position="left">问答历史</el-divider>
        <el-table :data="historyRecords" stripe style="width: 100%" v-loading="historyLoading">
            <el-table-column prop="question" label="问题" width="300">
                <template #default="{ row }">
                    <div class="text-ellipsis" :title="row.question">{{ row.question }}</div>
                </template>
            </el-table-column>
            <el-table-column prop="answer" label="答案摘要">
                <template #default="{ row }">
                    {{ row.answer.substring(0, 80) }}...
                </template>
            </el-table-column>
            <el-table-column prop="timestamp" label="时间" width="180" />
            <el-table-column label="操作" width="120">
                <template #default="{ row }">
                    <el-button type="text" @click="showDetail(row)">详情</el-button>
                </template>
            </el-table-column>
        </el-table>
    </div>
</template>

<script setup>
import { ref, reactive } from 'vue'
import { ElMessage } from 'element-plus'

// 表单数据
const queryForm = reactive({
    question: '',
    top_k: 3,
})

// 状态管理
const loading = ref(false)
const processing = ref(false)
const showResults = ref(false)
const retrievedDocs = ref([])
const generatedAnswer = ref('')
const historyRecords = ref([])
const historyLoading = ref(false)


// 提交问题
const submitQuestion = async () => {
    try {
        processing.value = true
        showResults.value = false

        const csrftoken = document.cookie.match(/csrftoken=([\w-]+)/)?.[1];

        // API调用示例
        const response = await axios.post('/api/ai/LLMModel/chat', {
            question: queryForm.question,
            top_k: queryForm.top_k,
        },{
            headers: {
                'X-CSRFToken': csrftoken
            }
        })

        console.log(response)

        // 处理结果
        retrievedDocs.value = response.data.context
        generatedAnswer.value = response.data.answer
        showResults.value = true

        // 记录历史
        historyRecords.value.unshift({
            question: queryForm.question,
            answer: generatedAnswer.value,
            timestamp: new Date().toLocaleString()
        })

        ElMessage.success('问答生成成功')
    } catch (err) {
        ElMessage.error(`请求失败：${err.message}`)
    } finally {
        processing.value = false
    }
}

// 清空表单
const clearForm = () => {
    queryForm.question = ''
    showResults.value = false
}

// 复制答案
const copyAnswer = () => {
    navigator.clipboard.writeText(generatedAnswer.value)
    ElMessage.success('答案已复制')
}

// 加载历史记录
const loadHistory = async () => {
    try {
        historyLoading.value = true
        const res = await axios.get('/api/rag/history')
        historyRecords.value = res.data
    } catch (err) {
        ElMessage.error('历史记录加载失败')
    } finally {
        historyLoading.value = false
    }
}

// 初始化加载
// onMounted(() => {
//     loadHistory()
// })
</script>

<style scoped>
.action-section {
    background: #f8f9fa;
    padding: 30px;
    border-radius: 8px;
    margin: 20px 0;
    box-shadow: 0 2px 12px rgba(0, 0, 0, 0.05);
}

.question-input {
    width: 80%;
    max-width: 800px;
}

.config-group {
    display: flex;
    gap: 40px;
    margin: 20px 0;
}

.config-item {
    margin-bottom: 0;
}

.context-cards {
    display: grid;
    gap: 15px;
    margin: 20px 0;
}

.doc-card {
    transition: transform 0.2s;
}

.doc-card:hover {
    transform: translateY(-3px);
}

.doc-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
}

.doc-content {
    color: #666;
    line-height: 1.6;
}

.answer-section {
    margin: 30px 0;
}

.answer-actions {
    margin-top: 15px;
    text-align: right;
}

.text-ellipsis {
    max-width: 280px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}
</style>