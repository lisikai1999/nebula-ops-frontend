<template>
  <div class="athena-query-page">
    <el-card class="page-header-card" shadow="never">
      <div class="page-header">
        <div class="header-left">
          <el-icon class="header-icon"><DataLine /></el-icon>
          <h1 class="page-title">Athena SQL 查询</h1>
          <el-tag type="primary" effect="plain">多环境支持</el-tag>
        </div>
        <div class="header-right">
          <el-button type="primary" size="small" @click="fetchEnvironments" :loading="envLoading">
            <el-icon><Refresh /></el-icon>
            刷新环境列表
          </el-button>
        </div>
      </div>
    </el-card>

    <el-card class="query-card" shadow="hover">
      <template #header>
        <div class="card-header">
          <span class="card-title">查询配置</span>
          <el-tag v-if="selectedEnvironment" type="success" size="small">
            当前环境: {{ getEnvironmentName(selectedEnvironment) }}
          </el-tag>
        </div>
      </template>

      <el-form :model="queryForm" label-width="100px" style="max-width: 800px;">
        <el-form-item label="选择环境" required>
          <el-select 
            v-model="selectedEnvironment" 
            placeholder="请选择AWS环境" 
            style="width: 300px;"
            filterable
            :loading="envLoading"
          >
            <el-option 
              v-for="env in environments" 
              :key="env.id" 
              :label="env.name" 
              :value="env.id"
            >
              <div class="env-option">
                <span class="env-name">{{ env.name }}</span>
                <el-tag v-if="env.is_default" type="warning" size="small">默认</el-tag>
              </div>
            </el-option>
          </el-select>
          <div class="env-hint">
            <el-text type="info" size="small">
              选择需要查询的AWS环境，系统将使用对应环境的Athena服务
            </el-text>
          </div>
        </el-form-item>

        <el-form-item label="数据库" required>
          <el-select 
            v-model="queryForm.database" 
            placeholder="请选择数据库" 
            style="width: 300px;"
            :disabled="!selectedEnvironment"
            :loading="dbLoading"
            @change="handleDatabaseChange"
          >
            <el-option 
              v-for="db in databases" 
              :key="db" 
              :label="db" 
              :value="db"
            />
          </el-select>
        </el-form-item>

        <el-form-item label="数据表" v-if="queryForm.database">
          <el-select 
            v-model="queryForm.table" 
            placeholder="选择数据表（可选）" 
            style="width: 300px;"
            filterable
            allow-create
            :disabled="!queryForm.database"
            :loading="tableLoading"
            clearable
          >
            <el-option 
              v-for="table in tables" 
              :key="table" 
              :label="table" 
              :value="table"
            />
          </el-select>
        </el-form-item>

        <el-form-item label="SQL语句" required>
          <el-input
            v-model="queryForm.sql"
            type="textarea"
            :rows="8"
            placeholder="请输入Athena SQL查询语句&#10;&#10;示例：&#10;SELECT * FROM database.table_name LIMIT 10;&#10;SELECT COUNT(*) FROM database.table_name WHERE date = '2024-01-01';"
            resize="vertical"
            style="font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;"
          >
            <template #prepend>
              <el-button 
                @click="formatSql" 
                :disabled="!queryForm.sql"
              >
                <el-icon><MagicStick /></el-icon>
                格式化
              </el-button>
            </template>
          </el-input>
          <div class="sql-tips">
            <el-text type="warning" size="small">
              <el-icon style="margin-right: 4px;"><Warning /></el-icon>
              提示：执行前请确认SQL语句的安全性，避免执行危险操作（如DROP、TRUNCATE等）
            </el-text>
          </div>
        </el-form-item>

        <el-form-item label="查询限制">
          <el-input-number 
            v-model="queryForm.limit" 
            :min="1" 
            :max="10000" 
            :step="100"
            style="width: 150px;"
          />
          <el-text type="info" size="small" style="margin-left: 12px;">
            限制返回行数，默认100行
          </el-text>
        </el-form-item>

        <el-form-item>
          <el-button 
            type="primary" 
            @click="executeQuery" 
            :loading="queryLoading"
            :disabled="!canExecute"
          >
            <el-icon><Cpu /></el-icon>
            执行查询
          </el-button>
          <el-button @click="resetQueryForm">
            <el-icon><Refresh /></el-icon>
            重置
          </el-button>
          <el-dropdown @command="handleQuickQuery">
            <el-button>
              <el-icon><Document /></el-icon>
              快捷查询
              <el-icon class="el-icon--right"><ArrowDown /></el-icon>
            </el-button>
            <template #dropdown>
              <el-dropdown-menu>
                <el-dropdown-item command="show_tables">
                  查看所有表 - SHOW TABLES
                </el-dropdown-item>
                <el-dropdown-item command="show_databases">
                  查看所有数据库 - SHOW DATABASES
                </el-dropdown-item>
                <el-dropdown-item command="describe_table">
                  查看表结构 - DESCRIBE table
                </el-dropdown-item>
                <el-dropdown-item command="select_limit">
                  简单查询 - SELECT * LIMIT 10
                </el-dropdown-item>
              </el-dropdown-menu>
            </template>
          </el-dropdown>
        </el-form-item>
      </el-form>
    </el-card>

    <el-card class="result-card" shadow="hover" v-if="queryResult || queryError">
      <template #header>
        <div class="card-header">
          <span class="card-title">查询结果</span>
          <div class="result-stats">
            <el-tag v-if="queryResult" type="info" size="small">
              执行时间: {{ queryResult.execution_time || 'N/A' }}s
            </el-tag>
            <el-tag v-if="queryResult" type="success" size="small">
              返回行数: {{ queryResult.row_count || 0 }}
            </el-tag>
            <el-tag v-if="queryLoading" type="warning" size="small">
              查询中...
            </el-tag>
          </div>
        </div>
      </template>

      <div v-if="queryError" class="error-container">
        <el-alert
          :title="queryError.title || '查询错误'"
          :message="queryError.message"
          type="error"
          :closable="false"
          show-icon
        >
          <template #default>
            <div v-if="queryError.detail" class="error-detail">
              <el-text type="info">详细信息：</el-text>
              <pre>{{ queryError.detail }}</pre>
            </div>
          </template>
        </el-alert>
      </div>

      <div v-else-if="queryResult" class="result-container">
        <el-tabs v-model="activeTab" type="card" style="margin-bottom: 16px;">
          <el-tab-pane label="数据表格" name="table">
            <div class="table-wrapper" v-if="queryResult.columns && queryResult.columns.length > 0">
              <el-table 
                :data="queryResult.data" 
                stripe 
                border 
                v-loading="queryLoading"
                max-height="500"
                style="width: 100%;"
              >
                <el-table-column
                  v-for="(col, index) in queryResult.columns"
                  :key="index"
                  :prop="col.name"
                  :label="col.name"
                  :min-width="150"
                  show-overflow-tooltip
                >
                  <template #header>
                    <div class="column-header">
                      <span>{{ col.name }}</span>
                      <el-tag type="info" size="mini" style="margin-left: 8px;">
                        {{ col.type || 'unknown' }}
                      </el-tag>
                    </div>
                  </template>
                </el-table-column>
              </el-table>
            </div>
            <el-empty v-else description="查询结果为空" />
          </el-tab-pane>

          <el-tab-pane label="原始数据" name="raw">
            <div class="raw-data-wrapper">
              <el-input
                v-model="rawJsonData"
                type="textarea"
                :rows="20"
                readonly
                style="font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;"
              />
            </div>
          </el-tab-pane>

          <el-tab-pane label="查询信息" name="info" v-if="queryResult.query_info">
            <div class="query-info">
              <el-descriptions :column="2" border>
                <el-descriptions-item label="查询ID">
                  {{ queryResult.query_info.query_id || '-' }}
                </el-descriptions-item>
                <el-descriptions-item label="执行状态">
                  <el-tag :type="queryResult.query_info.status === 'SUCCEEDED' ? 'success' : 'info'">
                    {{ queryResult.query_info.status || '-' }}
                  </el-tag>
                </el-descriptions-item>
                <el-descriptions-item label="数据扫描量">
                  {{ queryResult.query_info.data_scanned_bytes | formatBytes || '-' }}
                </el-descriptions-item>
                <el-descriptions-item label="执行时间">
                  {{ queryResult.query_info.execution_time_ms | formatMs || '-' }}
                </el-descriptions-item>
                <el-descriptions-item label="输出位置">
                  {{ queryResult.query_info.output_location || '-' }}
                </el-descriptions-item>
                <el-descriptions-item label="提交时间">
                  {{ queryResult.query_info.submission_time || '-' }}
                </el-descriptions-item>
              </el-descriptions>
            </div>
          </el-tab-pane>
        </el-tabs>

        <div class="result-actions" v-if="queryResult.data && queryResult.data.length > 0">
          <el-button size="small" @click="exportCsv">
            <el-icon><Download /></el-icon>
            导出CSV
          </el-button>
          <el-button size="small" @click="copyToClipboard">
            <el-icon><CopyDocument /></el-icon>
            复制到剪贴板
          </el-button>
        </div>
      </div>
    </el-card>

    <el-card class="history-card" shadow="hover" v-if="queryHistory.length > 0">
      <template #header>
        <div class="card-header">
          <span class="card-title">查询历史</span>
          <el-button type="text" size="small" @click="clearHistory">
            <el-icon><Delete /></el-icon>
            清空历史
          </el-button>
        </div>
      </template>

      <el-timeline>
        <el-timeline-item
          v-for="(item, index) in queryHistory.slice().reverse()"
          :key="index"
          :timestamp="item.timestamp"
          placement="top"
          :type="item.success ? 'primary' : 'danger'"
          :icon="item.success ? Check : Close"
        >
          <el-card shadow="hover" class="history-item">
            <div class="history-item-header">
              <div class="history-env">
                <el-tag size="small">{{ item.environment }}</el-tag>
                <el-tag size="small" type="info">{{ item.database || 'N/A' }}</el-tag>
              </div>
              <div class="history-actions">
                <el-button type="text" size="small" @click="reuseQuery(item)">
                  <el-icon><DocumentCopy /></el-icon>
                  复用
                </el-button>
              </div>
            </div>
            <div class="history-sql">
              <el-text size="small">{{ truncateSql(item.sql) }}</el-text>
            </div>
            <div class="history-stats">
              <el-text type="info" size="small">
                {{ item.success ? `成功，${item.row_count || 0} 行` : '失败' }}
              </el-text>
            </div>
          </el-card>
        </el-timeline-item>
      </el-timeline>
    </el-card>
  </div>
</template>

<script setup>
import { ref, reactive, computed, watch } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import {
  DataLine,
  Refresh,
  Cpu,
  MagicStick,
  Warning,
  Document,
  ArrowDown,
  Download,
  CopyDocument,
  Delete,
  DocumentCopy,
  Check,
  Close
} from '@element-plus/icons-vue';

const envLoading = ref(false);
const dbLoading = ref(false);
const tableLoading = ref(false);
const queryLoading = ref(false);

const environments = ref([
  { id: 'china prod', name: 'china prod', is_default: true },
  { id: 'singapore-dev', name: 'singapore-dev', is_default: false },
  { id: 'singapore-staging', name: 'singapore-staging', is_default: false },
  { id: 'singapore-prod', name: 'singapore-prod', is_default: false },
  { id: 'usa-prod', name: 'usa-prod', is_default: false }
]);
const selectedEnvironment = ref('');
const databases = ref([]);
const tables = ref([]);
const queryHistory = ref([]);

const queryForm = reactive({
  database: '',
  table: '',
  sql: '',
  limit: 100
});

const queryResult = ref(null);
const queryError = ref(null);
const activeTab = ref('table');

const canExecute = computed(() => {
  return selectedEnvironment.value && queryForm.sql.trim() && !queryLoading.value;
});

const rawJsonData = computed(() => {
  if (!queryResult.value) return '';
  return JSON.stringify(queryResult.value, null, 2);
});

const getEnvironmentName = (envId) => {
  const env = environments.value.find(e => e.id === envId);
  return env ? env.name : envId;
};

const truncateSql = (sql, maxLength = 80) => {
  if (!sql) return '';
  const trimmed = sql.trim();
  return trimmed.length > maxLength ? trimmed.substring(0, maxLength) + '...' : trimmed;
};

const formatSql = () => {
  const sql = queryForm.sql.trim();
  if (!sql) return;
  
  const keywords = [
    'SELECT', 'FROM', 'WHERE', 'GROUP BY', 'ORDER BY', 'HAVING', 
    'JOIN', 'LEFT JOIN', 'RIGHT JOIN', 'INNER JOIN', 'FULL JOIN',
    'ON', 'AS', 'AND', 'OR', 'NOT', 'IN', 'LIKE', 'BETWEEN',
    'LIMIT', 'OFFSET', 'UNION', 'UNION ALL', 'INSERT', 'UPDATE',
    'DELETE', 'CREATE', 'DROP', 'ALTER', 'TABLE', 'DATABASE',
    'INDEX', 'VIEW', 'TRUNCATE', 'COMMENT', 'GRANT', 'REVOKE'
  ];
  
  let formatted = sql;
  keywords.forEach(keyword => {
    const regex = new RegExp(`\\b${keyword}\\b`, 'gi');
    formatted = formatted.replace(regex, keyword.toUpperCase());
  });
  
  queryForm.sql = formatted;
  ElMessage.success('SQL已格式化');
};

const fetchEnvironments = async () => {
  envLoading.value = true;
  try {
    const response = await axios.get('/api/aws/athena/environments');
    if (response.data.status === 'success') {
      environments.value = response.data.data || [];
    } else {
      ElMessage.error(response.data.message || '获取环境列表失败');
    }
  } catch (error) {
    console.error('获取环境列表失败:', error);
    ElMessage.error('获取环境列表失败: ' + (error.response?.data?.message || error.message || '网络异常'));
  } finally {
    envLoading.value = false;
  }
};

const fetchDatabases = async () => {
  if (!selectedEnvironment.value) {
    databases.value = [];
    return;
  }
  
  dbLoading.value = true;
  try {
    const response = await axios.get(`/api/aws/athena/databases?env=${selectedEnvironment.value}`);
    if (response.data.status === 'success') {
      databases.value = response.data.data || [];
    } else {
      ElMessage.error(response.data.message || '获取数据库列表失败');
    }
  } catch (error) {
    console.error('获取数据库列表失败:', error);
    ElMessage.error('获取数据库列表失败: ' + (error.response?.data?.message || error.message || '网络异常'));
  } finally {
    dbLoading.value = false;
  }
};

const fetchTables = async (database) => {
  if (!selectedEnvironment.value || !database) {
    tables.value = [];
    return;
  }
  
  tableLoading.value = true;
  try {
    const response = await axios.get(`/api/aws/athena/tables?env=${selectedEnvironment.value}&database=${database}`);
    if (response.data.status === 'success') {
      tables.value = response.data.data || [];
    } else {
      ElMessage.error(response.data.message || '获取数据表列表失败');
    }
  } catch (error) {
    console.error('获取数据表列表失败:', error);
    ElMessage.error('获取数据表列表失败: ' + (error.response?.data?.message || error.message || '网络异常'));
  } finally {
    tableLoading.value = false;
  }
};

const handleDatabaseChange = (database) => {
  queryForm.table = '';
  if (database) {
    fetchTables(database);
  }
};

const handleQuickQuery = (command) => {
  if (!selectedEnvironment.value) {
    ElMessage.warning('请先选择环境');
    return;
  }

  switch (command) {
    case 'show_tables':
      if (!queryForm.database) {
        ElMessage.warning('请先选择数据库');
        return;
      }
      queryForm.sql = `SHOW TABLES IN ${queryForm.database};`;
      break;
    case 'show_databases':
      queryForm.sql = 'SHOW DATABASES;';
      break;
    case 'describe_table':
      if (!queryForm.database) {
        ElMessage.warning('请先选择数据库');
        return;
      }
      if (!queryForm.table) {
        ElMessage.warning('请先选择数据表');
        return;
      }
      queryForm.sql = `DESCRIBE ${queryForm.database}.${queryForm.table};`;
      break;
    case 'select_limit':
      if (!queryForm.database) {
        ElMessage.warning('请先选择数据库');
        return;
      }
      if (!queryForm.table) {
        ElMessage.warning('请先选择数据表');
        return;
      }
      queryForm.sql = `SELECT * FROM ${queryForm.database}.${queryForm.table} LIMIT ${queryForm.limit};`;
      break;
  }
};

const executeQuery = async () => {
  if (!selectedEnvironment.value) {
    ElMessage.warning('请选择AWS环境');
    return;
  }
  
  if (!queryForm.sql.trim()) {
    ElMessage.warning('请输入SQL语句');
    return;
  }

  const trimmedSql = queryForm.sql.trim().toUpperCase();
  const dangerousKeywords = ['DROP', 'TRUNCATE', 'DELETE', 'ALTER TABLE', 'GRANT', 'REVOKE'];
  const hasDangerousOp = dangerousKeywords.some(kw => trimmedSql.includes(kw));
  
  if (hasDangerousOp) {
    try {
      await ElMessageBox.confirm(
        '检测到潜在的危险操作（如DROP、DELETE等）。确认要执行此SQL吗？',
        '危险操作警告',
        {
          confirmButtonText: '确认执行',
          cancelButtonText: '取消',
          type: 'warning',
        }
      );
    } catch {
      return;
    }
  }

  queryLoading.value = true;
  queryError.value = null;
  queryResult.value = null;

  try {
    const csrftoken = document.cookie.match(/csrftoken=([\w-]+)/)?.[1];
    
    const response = await axios.post('/api/aws/athena/query', {
      environment: selectedEnvironment.value,
      database: queryForm.database || null,
      sql: queryForm.sql,
      limit: queryForm.limit
    }, {
      headers: {
        'X-CSRFToken': csrftoken
      }
    });

    if (response.data.status === 'success') {
      queryResult.value = response.data.data;
      
      queryHistory.value.push({
        timestamp: new Date().toLocaleString('zh-CN'),
        environment: getEnvironmentName(selectedEnvironment.value),
        database: queryForm.database,
        sql: queryForm.sql,
        success: true,
        row_count: response.data.data?.row_count || 0
      });

      ElMessage.success('查询执行成功');
    } else {
      queryError.value = {
        title: '查询错误',
        message: response.data.message || '查询执行失败',
        detail: response.data.detail || ''
      };
      
      queryHistory.value.push({
        timestamp: new Date().toLocaleString('zh-CN'),
        environment: getEnvironmentName(selectedEnvironment.value),
        database: queryForm.database,
        sql: queryForm.sql,
        success: false
      });
      
      ElMessage.error(response.data.message || '查询执行失败');
    }
  } catch (error) {
    console.error('查询执行失败:', error);
    queryError.value = {
      title: '网络错误',
      message: error.response?.data?.message || '网络请求失败，请稍后重试',
      detail: error.message
    };
    ElMessage.error('查询执行失败: ' + (error.message || '未知错误'));
  } finally {
    queryLoading.value = false;
  }
};

const resetQueryForm = () => {
  queryForm.database = '';
  queryForm.table = '';
  queryForm.sql = '';
  queryForm.limit = 100;
  queryResult.value = null;
  queryError.value = null;
  tables.value = [];
};

const reuseQuery = (item) => {
  if (item.sql) {
    queryForm.sql = item.sql;
    ElMessage.success('SQL已填充到编辑器');
  }
};

const clearHistory = async () => {
  try {
    await ElMessageBox.confirm('确定要清空所有查询历史吗？', '提示', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    });
    queryHistory.value = [];
    ElMessage.success('历史记录已清空');
  } catch {
  }
};

const exportCsv = () => {
  if (!queryResult.value || !queryResult.value.data || queryResult.value.data.length === 0) {
    ElMessage.warning('没有数据可导出');
    return;
  }

  const { columns, data } = queryResult.value;
  const headers = columns.map(col => col.name).join(',');
  const rows = data.map(row => 
    columns.map(col => {
      const value = row[col.name];
      if (value === null || value === undefined) return '';
      const strValue = String(value);
      if (strValue.includes(',') || strValue.includes('\n') || strValue.includes('"')) {
        return `"${strValue.replace(/"/g, '""')}"`;
      }
      return strValue;
    }).join(',')
  );
  
  const csvContent = [headers, ...rows].join('\n');
  const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  
  link.setAttribute('href', url);
  link.setAttribute('download', `athena_query_${Date.now()}.csv`);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  
  ElMessage.success('CSV导出成功');
};

const copyToClipboard = async () => {
  if (!queryResult.value || !queryResult.value.data) {
    ElMessage.warning('没有数据可复制');
    return;
  }

  try {
    await navigator.clipboard.writeText(rawJsonData.value);
    ElMessage.success('已复制到剪贴板');
  } catch (error) {
    ElMessage.error('复制失败');
  }
};

watch(selectedEnvironment, (newEnv) => {
  if (newEnv) {
    fetchDatabases();
  } else {
    databases.value = [];
    queryForm.database = '';
    tables.value = [];
    queryForm.table = '';
  }
});
</script>

<style scoped>
.athena-query-page {
  min-height: 100%;
}

.page-header-card {
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

.query-card,
.result-card,
.history-card {
  margin-bottom: 24px;
  border-radius: 8px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.card-title {
  font-size: 16px;
  font-weight: 600;
  color: #303133;
}

.result-stats {
  display: flex;
  gap: 8px;
}

.env-option {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
}

.env-name {
  margin-right: 8px;
}

.env-hint {
  margin-top: 8px;
}

.sql-tips {
  margin-top: 8px;
}

.column-header {
  display: flex;
  align-items: center;
}

.table-wrapper {
  width: 100%;
  overflow-x: auto;
}

.raw-data-wrapper {
  width: 100%;
}

.query-info {
  padding: 16px;
}

.error-container {
  margin-bottom: 16px;
}

.error-detail {
  margin-top: 12px;
}

.error-detail pre {
  background: #f5f7fa;
  padding: 12px;
  border-radius: 4px;
  font-size: 12px;
  overflow-x: auto;
  margin: 8px 0 0 0;
}

.result-actions {
  display: flex;
  gap: 12px;
  margin-top: 16px;
  padding-top: 16px;
  border-top: 1px solid #ebeef5;
}

.history-item {
  margin-bottom: 16px;
}

.history-item-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.history-env {
  display: flex;
  gap: 8px;
}

.history-sql {
  margin-bottom: 8px;
  word-break: break-all;
}

.history-stats {
  display: flex;
  justify-content: flex-end;
}

@media (max-width: 768px) {
  .page-header {
    flex-direction: column;
    align-items: flex-start;
  }
  
  .page-title {
    font-size: 18px;
  }
}
</style>
