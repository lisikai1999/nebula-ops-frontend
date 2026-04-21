<script>
    // 接收父组件传递的值
    export default {
        props: {
            taskDefine: {
                type: [Object, String],
                required: true
            }
        }
    }
</script>

<template>

    <div>
        <!-- <highlightjs language="json" :code="JSON.stringify(taskDefine ?? {}, null, 2)" /> -->
        <highlightjs language="json" :code="taskDefine" />
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