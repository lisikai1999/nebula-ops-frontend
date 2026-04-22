<script>
export default {
    name: 'LogIntake',
    data() {
        return {
            charts: [],
            logDataList: [],
            loadingStates: [true, true, true, true, true, true, true],
            chartRefs: ['chart', 'chart2', 'chart3', 'chart4', 'chart5', 'chart6', 'chart7'],
            environments: []
        };
    },
    methods: {
        formatBytes(bytes) {
            if (bytes === 0) return '0 B';
            const k = 1024;
            const sizes = ['B', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
            let i = parseInt(Math.floor(Math.log(bytes) / Math.log(k)));
            return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
        },
        chartOption(logData) {
            const timeLabels = logData.map(data => new Date(data.timestamp).toLocaleDateString('zh-CN'));
            const logCounts = logData.map(data => data.count);
            
            return {
                title: {
                    text: logData[0]?.env + " 近30天每日日志摄入量",
                    left: 'center',
                    textStyle: {
                        fontSize: 16,
                        fontWeight: 600,
                        color: '#303133'
                    }
                },
                tooltip: {
                    trigger: 'axis',
                    backgroundColor: 'rgba(255, 255, 255, 0.95)',
                    borderColor: '#e4e7ed',
                    borderWidth: 1,
                    textStyle: {
                        color: '#606266'
                    },
                    formatter: (params) => {
                        let result = params[0].axisValue + '<br/>';
                        params.forEach(param => {
                            result += param.marker + param.seriesName + ': ' + this.formatBytes(param.value) + '<br/>';
                        });
                        return result;
                    }
                },
                grid: {
                    left: '3%',
                    right: '4%',
                    bottom: '3%',
                    top: '60px',
                    containLabel: true
                },
                xAxis: {
                    type: 'category',
                    boundaryGap: false,
                    data: timeLabels,
                    axisLine: {
                        lineStyle: {
                            color: '#e4e7ed'
                        }
                    },
                    axisLabel: {
                        color: '#909399',
                        interval: Math.floor(timeLabels.length / 6)
                    }
                },
                yAxis: {
                    type: 'value',
                    axisLine: {
                        show: false
                    },
                    axisTick: {
                        show: false
                    },
                    splitLine: {
                        lineStyle: {
                            color: '#f5f7fa',
                            type: 'dashed'
                        }
                    },
                    axisLabel: {
                        color: '#909399',
                        formatter: (value) => {
                            return this.formatBytes(value);
                        }
                    }
                },
                series: [
                    {
                        name: '日志量',
                        type: 'line',
                        data: logCounts,
                        smooth: true,
                        symbol: 'circle',
                        symbolSize: 6,
                        lineStyle: {
                            width: 3,
                            color: {
                                type: 'linear',
                                x: 0,
                                y: 0,
                                x2: 1,
                                y2: 0,
                                colorStops: [
                                    { offset: 0, color: '#667eea' },
                                    { offset: 1, color: '#764ba2' }
                                ]
                            }
                        },
                        itemStyle: {
                            color: '#667eea',
                            borderColor: '#fff',
                            borderWidth: 2
                        },
                        areaStyle: {
                            color: {
                                type: 'linear',
                                x: 0,
                                y: 0,
                                x2: 0,
                                y2: 1,
                                colorStops: [
                                    { offset: 0, color: 'rgba(102, 126, 234, 0.3)' },
                                    { offset: 1, color: 'rgba(102, 126, 234, 0.05)' }
                                ]
                            }
                        }
                    }
                ]
            };
        },
        drawSingleChart(index, logData) {
            this.$nextTick(() => {
                const refName = this.chartRefs[index];
                const ref = this.$refs[refName];
                
                if (ref && logData && logData.length > 0) {
                    if (this.charts[index]) {
                        this.charts[index].dispose();
                    }
                    
                    const chart = echarts.init(ref);
                    chart.setOption(this.chartOption(logData));
                    this.charts[index] = chart;
                    
                    if (!this.logDataList) {
                        this.logDataList = [];
                    }
                    this.logDataList[index] = logData;
                }
            });
        },
        async fetchLogData() {
            this.loadingStates = [true, true, true, true, true, true, true];
            this.logDataList = [];
            
            try {
                const response = await axios.get('/api/aws/get_cloudwatch_IncomingBytes');
                const allLogData = response.data;
                
                this.environments = allLogData.map(data => data[0]?.env || '未知环境');
                
                allLogData.forEach((logData, index) => {
                    if (logData && logData.length > 0) {
                        this.loadingStates[index] = false;
                        this.drawSingleChart(index, logData);
                    }
                });
                
                const loadedCount = allLogData.filter(data => data && data.length > 0).length;
                for (let i = loadedCount; i < 7; i++) {
                    this.loadingStates[i] = false;
                }
                
            } catch (error) {
                console.log(error);
                this.showMockData();
            }
        },
        async fetchLogDataIncrementally() {
            this.loadingStates = [true, true, true, true, true, true, true];
            this.logDataList = [];
            
            try {
                const response = await axios.get('/api/aws/get_cloudwatch_IncomingBytes');
                const allLogData = response.data;
                
                for (let i = 0; i < allLogData.length; i++) {
                    const logData = allLogData[i];
                    if (logData && logData.length > 0) {
                        this.loadingStates[i] = false;
                        this.drawSingleChart(i, logData);
                    }
                }
                
                const loadedCount = allLogData.filter(data => data && data.length > 0).length;
                for (let i = loadedCount; i < 7; i++) {
                    this.loadingStates[i] = false;
                }
                
            } catch (error) {
                console.log(error);
                this.showMockData();
            }
        },
        showMockData() {
            const mockData = [];
            const environments = ['生产环境', '测试环境', '开发环境', '预发布环境', 'UAT环境', 'Staging环境', 'Demo环境'];
            
            environments.forEach((env, index) => {
                const data = [];
                const now = new Date();
                
                for (let i = 29; i >= 0; i--) {
                    const date = new Date(now);
                    date.setDate(date.getDate() - i);
                    data.push({
                        timestamp: date.toISOString(),
                        env: env,
                        count: Math.floor(Math.random() * 1000000000) + 100000000
                    });
                }
                mockData.push(data);
                
                setTimeout(() => {
                    this.loadingStates[index] = false;
                    this.drawSingleChart(index, data);
                }, index * 300);
            });
        },
        handleResize() {
            this.charts.forEach(chart => {
                if (chart) {
                    chart.resize();
                }
            });
        },
        refreshChart(index) {
            this.loadingStates[index] = true;
            
            setTimeout(() => {
                if (this.logDataList[index]) {
                    this.loadingStates[index] = false;
                    this.drawSingleChart(index, this.logDataList[index]);
                } else {
                    this.loadingStates[index] = false;
                }
            }, 500);
        }
    },
    mounted() {
        this.fetchLogData();
        window.addEventListener('resize', this.handleResize);
    },
    beforeDestroy() {
        window.removeEventListener('resize', this.handleResize);
        this.charts.forEach(chart => {
            if (chart) {
                chart.dispose();
            }
        });
    }
};
</script>

<template>
    <div class="log-intake-page">
        <el-card class="page-header-card" shadow="never">
            <div class="page-header">
                <div class="header-left">
                    <el-icon class="header-icon"><DataLine /></el-icon>
                    <h1 class="page-title">日志摄入量监控</h1>
                    <el-tag type="primary" effect="plain">实时监控</el-tag>
                </div>
                <div class="header-right">
                    <el-button type="primary" size="small" @click="fetchLogData">
                        <el-icon><Refresh /></el-icon>
                        刷新数据
                    </el-button>
                </div>
            </div>
        </el-card>

        <div class="charts-container">
            <el-row :gutter="24">
                <el-col :xs="24" :sm="24" :md="12" :lg="12" :xl="8" v-for="index in 7" :key="index">
                    <el-card class="chart-card" shadow="hover">
                        <template #header>
                            <div class="chart-header">
                                <span class="chart-title">
                                    {{ logDataList[index - 1]?.[0]?.env || `图表 ${index}` }}
                                </span>
                                <el-button 
                                    type="text" 
                                    size="small" 
                                    :loading="loadingStates[index - 1]"
                                    @click="refreshChart(index - 1)"
                                >
                                    <el-icon><Refresh /></el-icon>
                                </el-button>
                            </div>
                        </template>
                        
                        <div class="chart-wrapper-container">
                            <div 
                                v-if="loadingStates[index - 1]" 
                                class="chart-loading"
                            >
                                <div class="loading-content">
                                    <el-icon class="loading-icon"><Loading /></el-icon>
                                    <span class="loading-text">数据加载中...</span>
                                </div>
                            </div>
                            
                            <div 
                                v-else-if="!logDataList[index - 1] || logDataList[index - 1].length === 0"
                                class="chart-empty"
                            >
                                <el-empty description="暂无数据" :image-size="60" />
                            </div>
                            
                            <div 
                                v-else
                                :ref="chartRefs[index - 1]" 
                                class="chart-wrapper"
                            ></div>
                        </div>
                    </el-card>
                </el-col>
            </el-row>
        </div>
    </div>
</template>

<script setup>
import { DataLine, Refresh, Loading } from '@element-plus/icons-vue';
</script>

<style scoped>
.log-intake-page {
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

.header-right {
    display: flex;
    align-items: center;
    gap: 12px;
}

.charts-container {
    width: 100%;
}

.chart-card {
    margin-bottom: 24px;
    border-radius: 8px;
    transition: all 0.3s ease;
}

.chart-card:hover {
    transform: translateY(-4px);
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12);
}

.chart-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
}

.chart-title {
    font-size: 14px;
    font-weight: 600;
    color: #303133;
}

.chart-wrapper-container {
    position: relative;
    width: 100%;
    height: 350px;
}

.chart-loading {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    display: flex;
    justify-content: center;
    align-items: center;
    background-color: rgba(255, 255, 255, 0.9);
    border-radius: 4px;
    z-index: 10;
}

.loading-content {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 12px;
}

.loading-icon {
    font-size: 32px;
    color: #409EFF;
    animation: rotate 1s linear infinite;
}

.loading-text {
    font-size: 14px;
    color: #606266;
}

.chart-empty {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    display: flex;
    justify-content: center;
    align-items: center;
}

.chart-wrapper {
    width: 100%;
    height: 100%;
}

@keyframes rotate {
    from {
        transform: rotate(0deg);
    }
    to {
        transform: rotate(360deg);
    }
}

@media (max-width: 768px) {
    .page-header {
        flex-direction: column;
        align-items: flex-start;
    }
    
    .page-title {
        font-size: 18px;
    }
    
    .chart-wrapper-container {
        height: 300px;
    }
}
</style>
