<template>
  <div class="llm-page">
    <div class="page-header">
      <h2 class="page-title">智能问答系统</h2>
      <el-tag type="success" effect="plain">RAG知识增强</el-tag>
    </div>
    
    <!-- 加载状态 -->
    <div v-if="loading" class="loading-container">
      <el-loading text="加载中..." />
    </div>
    
    <!-- 主操作区 -->
    <div class="section-card">
      <h3 class="section-title">智能问答</h3>
      
      <el-form :model="queryForm" ref="ragForm" label-width="100px">
        <el-form-item label="问题描述" prop="question">
          <el-input 
            v-model="queryForm.question" 
            type="textarea" 
            :rows="4" 
            placeholder="请输入您的问题"
            class="question-input" 
            resize="vertical" 
          />
        </el-form-item>

        <!-- 参数配置 -->
        <div class="config-group">
          <el-form-item label="返回数量" class="config-item">
            <el-input-number 
              v-model="queryForm.top_k" 
              :min="5" 
              :max="15" 
              controls-position="right" 
            />
          </el-form-item>
        </div>

        <!-- 操作按钮 -->
        <el-form-item class="action-buttons">
          <el-button type="primary" @click="submitQuestion" :loading="processing">
            <el-icon><Search /></el-icon>
            执行问答
          </el-button>
          <el-button @click="clearForm">
            <el-icon><Delete /></el-icon>
            清空
          </el-button>
        </el-form-item>
      </el-form>

      <!-- 结果显示 -->
      <div v-if="showResults" class="result-section">
        <el-divider content-position="left">检索上下文</el-divider>
        <div class="context-cards">
          <el-card 
            v-for="(doc, index) in retrievedDocs" 
            :key="index" 
            shadow="hover" 
            class="doc-card"
          >
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
              <el-icon><DocumentCopy /></el-icon>
              复制
            </el-button>
            <el-button type="text" @click="exportAnswer">
              <el-icon><Download /></el-icon>
              导出
            </el-button>
          </div>
        </div>
      </div>

      <!-- 历史记录 -->
      <el-divider content-position="left">问答历史</el-divider>
      <el-table 
        :data="historyRecords" 
        stripe 
        style="width: 100%" 
        v-loading="historyLoading"
      >
        <el-table-column prop="question" label="问题" min-width="300">
          <template #default="{ row }">
            <div class="text-ellipsis" :title="row.question">{{ row.question }}</div>
          </template>
        </el-table-column>
        <el-table-column prop="answer" label="答案摘要" min-width="300">
          <template #default="{ row }">
            <div class="text-ellipsis" :title="row.answer">
              {{ row.answer && row.answer.length > 80 ? row.answer.substring(0, 80) + '...' : row.answer }}
            </div>
          </template>
        </el-table-column>
        <el-table-column prop="timestamp" label="时间" width="180" />
        <el-table-column label="操作" width="120" align="center">
          <template #default="{ row }">
            <el-button type="primary" link @click="showDetail(row)">
              <el-icon><View /></el-icon>
              详情
            </el-button>
          </template>
        </el-table-column>
      </el-table>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive } from 'vue';
import { ElMessage } from 'element-plus';
import { 
  Search, 
  Delete, 
  DocumentCopy, 
  Download, 
  View 
} from '@element-plus/icons-vue';

// 表单数据
const queryForm = reactive({
  question: '',
  top_k: 3,
});

// 状态管理
const loading = ref(false);
const processing = ref(false);
const showResults = ref(false);
const retrievedDocs = ref([]);
const generatedAnswer = ref('');
const historyRecords = ref([]);
const historyLoading = ref(false);

// 提交问题
const submitQuestion = async () => {
  try {
    if (!queryForm.question || queryForm.question.trim() === '') {
      ElMessage.warning('请输入您的问题');
      return;
    }
    
    processing.value = true;
    showResults.value = false;

    const csrftoken = document.cookie.match(/csrftoken=([\w-]+)/)?.[1];

    // API调用示例
    const response = await axios.post('/api/ai/LLMModel/chat', {
      question: queryForm.question,
      top_k: queryForm.top_k,
    }, {
      headers: {
        'X-CSRFToken': csrftoken
      }
    });

    console.log(response);

    // 处理结果
    retrievedDocs.value = response.data.context || [];
    generatedAnswer.value = response.data.answer || '';
    showResults.value = true;

    // 记录历史
    historyRecords.value.unshift({
      question: queryForm.question,
      answer: generatedAnswer.value,
      timestamp: new Date().toLocaleString()
    });

    ElMessage.success('问答生成成功');
  } catch (err) {
    ElMessage.error(`请求失败：${err.message}`);
  } finally {
    processing.value = false;
  }
};

// 清空表单
const clearForm = () => {
  queryForm.question = '';
  showResults.value = false;
  generatedAnswer.value = '';
  retrievedDocs.value = [];
};

// 复制答案
const copyAnswer = async () => {
  try {
    await navigator.clipboard.writeText(generatedAnswer.value);
    ElMessage.success('答案已复制');
  } catch (err) {
    ElMessage.error('复制失败，请手动复制');
  }
};

// 导出答案
const exportAnswer = () => {
  try {
    const blob = new Blob([generatedAnswer.value], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `answer_${Date.now()}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    ElMessage.success('导出成功');
  } catch (err) {
    ElMessage.error('导出失败');
  }
};

// 显示详情
const showDetail = (row) => {
  ElMessage.info(`查看详情：${row.question}`);
  // 这里可以实现显示详情的逻辑，比如打开一个对话框
};

// 加载历史记录
const loadHistory = async () => {
  try {
    historyLoading.value = true;
    const res = await axios.get('/api/rag/history');
    historyRecords.value = res.data;
  } catch (err) {
    // ElMessage.error('历史记录加载失败');
    console.log('历史记录加载失败，使用空数据');
  } finally {
    historyLoading.value = false;
  }
};

// 初始化加载
// onMounted(() => {
//   loadHistory()
// })
</script>

<style scoped>
.llm-page {
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

.question-input {
  width: 100%;
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

.action-buttons {
  margin-top: 20px;
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

@media (max-width: 768px) {
  .section-card {
    padding: 16px;
  }
  
  .config-group {
    flex-direction: column;
    gap: 16px;
  }
  
  .text-ellipsis {
    max-width: 180px;
  }
}
</style>
