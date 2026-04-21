<script>
import TaskDefineJson from './TaskDefineJson.vue'


export default {
    data() {
        return {
            loading: true,  // 数据加载完成为false
            envs: ["china dev", "china dev-staging", "china prod", "singapore-dev", "singapore-staging", "singapore-prod", "usa-prod"],
            env: '',        // 查看的环境
            process: false,
            taskDefine: '',
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
            ],  // 表头
            items: [],  // ecs服务信息
            searchField: 'cluster',
            searchValue: '',
            options: [
                { 'value': 'cluster', 'label': '集群' },
                { 'value': 'services', 'label': '服务' },
                { 'value': 'taskDefinitionInfo', 'label': '任务定义' },
                { 'value': 'redis', 'label': 'redis' },
                { 'value': 'database', 'label': '数据库' },
                { 'value': 'databaseEngine', 'label': '数据库引擎' },
            ],  // 搜索字段
            activeDefine: false,    // 是否显示TaskDefineJson组件
            taskDefine: {},    // 传递给TaskDefineJson组件的数据
        };
    },
    components: {
        TaskDefineJson
    },
    methods: {
        activeTaskDefineJson(item) {
            this.activeDefine = !this.activeDefine
            this.taskDefine = item['taskDefinitionInfo']

        },
        // 获取ecs服务信息
        async get_ecs_service_info() {
            this.process = true
            await axios.get('/api/aws/get_ecs_info?env=' + this.env)
                .then(response => {
                    this.items = response.data
                    // 将taskDefinitionInfo转为json格式，否则object格式无法被筛选，并美化输出
                    this.items.forEach(item => {
                        item['taskDefinitionInfo'] = JSON.stringify(item['taskDefinitionInfo']?? {}, null, 2)
                    });
                })
                .catch(error => {
                    alert("获取数据失败")
                    console.error(error);
                })
                .finally(response => {
                    // 取消旋转动画
                    this.process = false
                });

        },

    }
};


</script>

<template>


    <div id="ecsInfo" class="app" style="background-color: #ffffff;padding: 20px;border-radius: 10px;">

        <h2>
            ecs信息查看
        </h2>
        <!-- 环状旋转器 -->
        <div v-if="process" class="spinner-border" style="width: 4rem; height: 4rem;" role="status">
            <span class="sr-only"></span>
        </div>

        <!-- 浮动层容器 -->
        <div class="float-container" v-if="activeDefine">
            <!-- 关闭按钮 -->
            <button class="close-btn" @click="activeDefine = false">
                <svg width="24" height="24" viewBox="0 0 24 24">
                    <path fill="currentColor"
                        d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
                </svg>
            </button>
            <!-- 传入值到TaskDefineJson组件 -->
            <TaskDefineJson :taskDefine="taskDefine" />
        </div>


        <!-- 操作区域 -->
        <div class="action-section">
            <!-- 环境选择 -->
            <div class="filter-group">
                <el-select v-model="env" placeholder="请选择环境" class="env-select">
                    <el-option v-for="item in envs" :key="item" :label="item" :value="item" />
                </el-select>
                <el-button type="success" icon="el-icon-refresh" @click="get_ecs_service_info" class="action-btn">
                    采集数据
                </el-button>
            </div>

            <!-- 搜索区域 -->
            <div class="search-group">
                <el-select v-model="searchField" placeholder="搜索字段" class="search-field">
                    <el-option v-for="item in options" :key="item.value" :label="item.label" :value="item.value" />
                </el-select>
                <el-input v-model="searchValue" placeholder="输入关键词筛选" clearable class="search-input">
                    <template #prefix>
                        <i class="el-icon-search"></i>
                    </template>
                </el-input>
            </div>
        </div>




        <EasyDataTable :headers="headers" :items="items" :search-field="searchField" :search-value="searchValue"
            @click-row="activeTaskDefineJson" show-index/>



    </div>

</template>


<style scoped>
/* 容器布局 */
.container {
    max-width: 1200px;
    margin: 0 auto;
    padding: 30px 20px;
}

/* 标题样式 */
.page-title {
    color: #2c3e50;
    font-size: 24px;
    margin-bottom: 30px;
    display: flex;
    align-items: center;
    gap: 10px;
}

/* 加载动画 */
.loading-wrapper {
    display: flex;
    justify-content: center;
    padding: 50px 0;
}

.loading-icon {
    animation: rotate 2s linear infinite;
}

/* 操作区域布局 */
.action-section {
    background: #f8f9fa;
    padding: 20px;
    border-radius: 8px;
    margin-bottom: 30px;
    box-shadow: 0 2px 12px rgba(0, 0, 0, 0.05);
}

/* 筛选组样式 */
.filter-group {
    display: flex;
    gap: 15px;
    margin-bottom: 20px;
}

.env-select {
    flex: 1;
    max-width: 300px;
}

.action-btn {
    padding: 12px 25px;
}

/* 搜索区域布局 */
.search-group {
    display: flex;
    gap: 15px;
}

.search-field {
    width: 200px;
}

.search-input {
    flex: 1;
    max-width: 400px;
}

/* 任务定义组件布局 */
.float-container {
    position: fixed;
    z-index: 9999;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    background: #fff;
    border-radius: 8px;
    box-shadow: 0 8px 30px rgba(0, 0, 0, 0.12);
    min-width: 600px;
    max-width: 80vw;
    max-height: 90vh;
    overflow: auto;
}

/* 关闭按钮样式 */
.close-btn {
    position: absolute;
    right: 16px;
    top: 16px;
    width: 32px;
    height: 32px;
    border-radius: 50%;
    background: rgb(255, 255, 255);
    border: none;
    cursor: pointer;
    transition: all 0.2s;
    display: flex;
    align-items: center;
    justify-content: center;
}

.close-btn:hover {
    background: rgba(255, 172, 172, 0.2);
    transform: rotate(90deg);
}

.close-btn svg {
    width: 18px;
    height: 18px;
}

/* 动画 */
@keyframes rotate {
    from {
        transform: rotate(0deg);
    }

    to {
        transform: rotate(360deg);
    }
}

/* 响应式布局 */
@media (max-width: 768px) {

    .filter-group,
    .search-group {
        flex-direction: column;
    }

    .env-select,
    .search-field {
        max-width: 100%;
    }
}
</style>