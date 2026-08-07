<script>
import TaskDefineJson from './TaskDefineJson.vue'
import { useAwsEnvironmentsStore } from '@/stores/aws-environments'

export default {
    name: 'EcsInfo',
    components: {
        TaskDefineJson
    },
    data() {
        return {
            loading: false,
            envLoading: false,
            env: '',
            headers: [
                { text: "集群", value: "cluster", sortable: true, fixed: true },
                { text: "服务", value: "services", fixed: true },
                { text: "任务数量", value: "taskCount" },
                { text: "cpu", value: "cpuPerTask" },
                { text: "mem", value: "memPerTask" },
                { text: "cpu负载-7", value: "cpuLoad7Days" },
                { text: "mem负载-7", value: "memLoad7Days" },
                { text: "扩缩容SNS告警", value: "autoScaling" },
                { text: "cpu策略", value: "cpuPolicy" },
                { text: "内存策略", value: "memPolicy" },
                { text: "最小数量", value: "minInstances" },
                { text: "最大数量", value: "maxInstances" },
                { text: "数据库", value: "database", sortable: true },
                { text: "数据库类型", value: "databaseType" },
                { text: "数据库实例类型", value: "databaseInstanceType" },
                { text: "数据库cpu", value: "databaseCpu" },
                { text: "数据库内存", value: "databaseMem" },
                { text: "数据库引擎", value: "databaseEngine", sortable: true },
                { text: "数据库版本", value: "databaseVersion" },
                { text: "redis", value: "redis", sortable: true },
                { text: "redis实例类型", value: "redisInstanceType" },
                { text: "redis版本", value: "redisVersion" },
                { text: "redis节点", value: "redisNodes" },
            ],
            items: [],
            searchField: 'cluster',
            searchValue: '',
            options: [
                { 'value': 'cluster', 'label': '集群' },
                { 'value': 'services', 'label': '服务' },
                { 'value': 'taskDefinitionInfo', 'label': '任务定义' },
                { 'value': 'redis', 'label': 'redis' },
                { 'value': 'database', 'label': '数据库' },
                { 'value': 'databaseEngine', 'label': '数据库引擎' },
            ],
            activeDefine: false,
            taskDefine: {},
            currentPage: 1,
            pageSize: 10,
        };
    },
    computed: {
        awsEnvironmentsStore() {
            return useAwsEnvironmentsStore();
        },
        envs() {
            return this.awsEnvironmentsStore.environments.map(envItem => envItem.name);
        },
        filteredItems() {
            if (!this.searchValue) {
                return this.items;
            }
            const searchLower = this.searchValue.toLowerCase();
            return this.items.filter(item => {
                const fieldValue = item[this.searchField];
                if (fieldValue === undefined || fieldValue === null) return false;
                return fieldValue.toString().toLowerCase().includes(searchLower);
            });
        },
        paginatedItems() {
            const start = (this.currentPage - 1) * this.pageSize;
            const end = start + this.pageSize;
            return this.filteredItems.slice(start, end);
        },
        totalItems() {
            return this.filteredItems.length;
        }
    },
    methods: {
        activeTaskDefineJson(item) {
            this.activeDefine = !this.activeDefine;
            this.taskDefine = item['taskDefinitionInfo'];
        },
        async loadEnvironments() {
            this.envLoading = true;
            try {
                await this.awsEnvironmentsStore.fetchEnvironments();
                
                if (this.awsEnvironmentsStore.selectedEnvironmentId) {
                    const selectedEnv = this.awsEnvironmentsStore.selectedEnvironment;
                    if (selectedEnv) {
                        this.env = selectedEnv.name;
                    }
                }
            } catch (error) {
                console.error('加载环境列表失败:', error);
            } finally {
                this.envLoading = false;
            }
        },
        async get_ecs_service_info() {
            if (!this.env) {
                this.$message.warning('请先选择环境');
                return;
            }

            this.loading = true;
            this.items = [];
            
            try {
                const response = await axios.get('/api/aws/get_ecs_info?env=' + this.env);
                this.items = response.data;
                
                this.items.forEach(item => {
                    item['taskDefinitionInfo'] = JSON.stringify(item['taskDefinitionInfo'] ?? {}, null, 2);
                });

                this.$message.success(`获取到 ${this.items.length} 条 ECS 服务信息`);
            } catch (error) {
                this.$message.error('获取数据失败');
                console.error(error);
            } finally {
                this.loading = false;
            }
        },
        handleSizeChange(val) {
            this.pageSize = val;
            this.currentPage = 1;
        },
        handleCurrentChange(val) {
            this.currentPage = val;
        }
    },
    mounted() {
        this.loadEnvironments();
    }
};
</script>

<template>
    <div class="ecs-info-page">
        <el-card class="page-header-card" shadow="never">
            <div class="page-header">
                <div class="header-left">
                    <el-icon class="header-icon"><DataAnalysis /></el-icon>
                    <h1 class="page-title">ECS 信息查看</h1>
                    <el-tag v-if="!loading && items.length > 0" type="info" effect="plain">
                        共 {{ totalItems }} 条记录
                    </el-tag>
                </div>
            </div>
        </el-card>

        <el-card class="action-card" shadow="never">
            <template #header>
                <span>查询条件</span>
            </template>
            <div class="action-section">
                <div class="filter-group">
                    <el-select 
                        v-model="env" 
                        placeholder="请选择环境" 
                        class="env-select"
                        clearable
                        filterable
                    >
                        <el-option v-for="item in envs" :key="item" :label="item" :value="item" />
                    </el-select>
                    <el-button 
                        type="primary" 
                        :icon="Refresh" 
                        @click="get_ecs_service_info" 
                        class="action-btn"
                        :loading="loading"
                    >
                        {{ loading ? '采集中...' : '采集数据' }}
                    </el-button>
                </div>

                <div class="search-group" v-if="items.length > 0">
                    <el-select v-model="searchField" placeholder="搜索字段" class="search-field">
                        <el-option v-for="item in options" :key="item.value" :label="item.label" :value="item.value" />
                    </el-select>
                    <el-input 
                        v-model="searchValue" 
                        placeholder="输入关键词筛选" 
                        clearable 
                        class="search-input"
                    >
                        <template #prefix>
                            <el-icon><Search /></el-icon>
                        </template>
                    </el-input>
                </div>
            </div>
        </el-card>

        <el-card class="table-card" shadow="never">
            <div v-loading="loading" element-loading-text="正在加载 ECS 服务数据..." class="table-container">
                <el-empty 
                    v-if="!loading && items.length === 0" 
                    description="请先选择环境并点击采集数据"
                    :image-size="80"
                />

                <template v-else>
                    <EasyDataTable 
                        :headers="headers" 
                        :items="paginatedItems" 
                        :search-field="searchField" 
                        :search-value="searchValue"
                        @click-row="activeTaskDefineJson" 
                        show-index
                        class="data-table"
                    />

                    <el-pagination
                        class="pagination-container"
                        background
                        layout="total, sizes, prev, pager, next, jumper"
                        :total="totalItems"
                        :page-size="pageSize"
                        :current-page="currentPage"
                        :page-sizes="[10, 20, 50, 100]"
                        @size-change="handleSizeChange"
                        @current-change="handleCurrentChange"
                    />
                </template>
            </div>
        </el-card>

        <div class="float-container" v-if="activeDefine">
            <div class="float-header">
                <h3 class="float-title">任务定义详情</h3>
                <button class="close-btn" @click="activeDefine = false">
                    <el-icon><Close /></el-icon>
                </button>
            </div>
            <div class="float-body">
                <TaskDefineJson :taskDefine="taskDefine" />
            </div>
        </div>
    </div>
</template>

<script setup>
import { DataAnalysis, Refresh, Search, Close } from '@element-plus/icons-vue';
</script>

<style scoped>
.ecs-info-page {
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

.action-card {
    margin-bottom: 24px;
    border-radius: 8px;
}

.action-section {
    display: flex;
    flex-direction: column;
    gap: 20px;
}

.filter-group {
    display: flex;
    gap: 15px;
    align-items: center;
}

.env-select {
    flex: 1;
    max-width: 300px;
}

.action-btn {
    padding: 12px 25px;
    min-width: 120px;
}

.search-group {
    display: flex;
    gap: 15px;
    align-items: center;
    padding-top: 16px;
    border-top: 1px solid #ebeef5;
}

.search-field {
    width: 200px;
}

.search-input {
    flex: 1;
    max-width: 400px;
}

.table-card {
    border-radius: 8px;
}

.table-container {
    min-height: 200px;
}

.data-table {
    width: 100%;
}

.pagination-container {
    margin-top: 24px;
    display: flex;
    justify-content: flex-end;
}

.float-container {
    position: fixed;
    z-index: 9999;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    background: #fff;
    border-radius: 12px;
    box-shadow: 0 8px 40px rgba(0, 0, 0, 0.2);
    min-width: 600px;
    max-width: 90vw;
    max-height: 90vh;
    overflow: hidden;
    display: flex;
    flex-direction: column;
}

.float-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 16px 20px;
    border-bottom: 1px solid #ebeef5;
    background: #fafafa;
    border-radius: 12px 12px 0 0;
}

.float-title {
    font-size: 16px;
    font-weight: 600;
    color: #303133;
    margin: 0;
}

.close-btn {
    width: 32px;
    height: 32px;
    border-radius: 50%;
    background: transparent;
    border: none;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.2s;
    color: #909399;
    font-size: 20px;
}

.close-btn:hover {
    background: rgba(255, 172, 172, 0.2);
    color: #f56c6c;
}

.float-body {
    overflow: auto;
    padding: 20px;
    flex: 1;
}

:deep(.el-table th.el-table__cell) {
    background-color: #f5f7fa;
    font-weight: 600;
    color: #303133;
}

:deep(.el-table--striped .el-table__body tr.el-table__row--striped td.el-table__cell) {
    background-color: #fafafa;
}

:deep(.el-table__row:hover > td.el-table__cell) {
    background-color: #ecf5ff !important;
}

:deep(.el-pagination.is-background .el-pager li:not(.is-active).is-active) {
    background-color: #409EFF;
}

@media (max-width: 768px) {
    .page-header {
        flex-wrap: wrap;
    }
    
    .page-title {
        font-size: 18px;
    }
    
    .filter-group,
    .search-group {
        flex-direction: column;
    }
    
    .env-select,
    .search-field,
    .search-input {
        max-width: 100%;
        width: 100%;
    }
    
    .action-btn {
        width: 100%;
    }
    
    .float-container {
        min-width: auto;
        width: 95vw;
        max-height: 95vh;
    }
}
</style>
