<script>
export default {
    name: 'LogIntake',
    data() {
        return {
            charts: [],
            process: true,
            logDataList: [],
            chartLoadingStates: [true, true, true, true, true, true, true],
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
        drawChart(logDataList) {
            this.logDataList = logDataList;
            this.$nextTick(() => {
                const chartRefs = [
                    this.$refs.chart,
                    this.$refs.chart2,
                    this.$refs.chart3,
                    this.$refs.chart4,
                    this.$refs.chart5,
                    this.$refs.chart6,
                    this.$refs.chart7
                ];

                this.charts = chartRefs.map((ref, index) => {
                    if (ref && logDataList[index] && logDataList[index].length > 0) {
                        this.chartLoadingStates[index] = false;
                        const chart = echarts.init(ref);
                        chart.setOption(this.chartOption(logDataList[index]));
                        return chart;
                    }
                    this.chartLoadingStates[index] = false;
                    return null;
                }).filter(chart => chart !== null);
            });
        },
        drawSingleChart(index, logData) {
            this.$nextTick(() => {
                const chartRefs = [
                    this.$refs.chart,
                    this.$refs.chart2,
                    this.$refs.chart3,
                    this.$refs.chart4,
                    this.$refs.chart5,
                    this.$refs.chart6,
                    this.$refs.chart7
                ];
                
                const ref = chartRefs[index];
                
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
                    this.chartLoadingStates[index] = false;
                } else {
                    this.chartLoadingStates[index] = false;
                }
            });
        },
        async fetchLogData() {
            this.process = true;
            this.chartLoadingStates = [true, true, true, true, true, true, true];
            this.logDataList = [];
            
            try {
                const response = await axios.get('/api/aws/get_cloudwatch_IncomingBytes');
                const allLogData = response.data;
                
                this.environments = allLogData.map(data => data[0]?.env || '未知环境');
                this.drawChart(allLogData);
                
            } catch (error) {
                console.log(error);
                this.showMockData();
            } finally {
                this.process = false;
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
            });
            
            this.drawChart(mockData);
        },
        handleResize() {
            this.charts.forEach(chart => {
                if (chart) {
                    chart.resize();
                }
            });
        },
        refreshChart(index) {
            this.chartLoadingStates[index] = true;
            
            setTimeout(() => {
                if (this.logDataList[index]) {
                    this.drawSingleChart(index, this.logDataList[index]);
                } else {
                    this.chartLoadingStates[index] = false;
                }
            }, 500);
        },
        getEnvName(index) {
            if (this.logDataList[index] && this.logDataList[index][0]) {
                return this.logDataList[index][0].env;
            }
            return `图表 ${index + 1}`;
        },
        hasData(index) {
            return this.logDataList[index] && this.logDataList[index].length > 0;
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
                    <el-button type="primary" size="small" @click="fetchLogData" :loading="process">
                        <el-icon><Refresh /></el-icon>
                        刷新数据
                    </el-button>
                </div>
            </div>
        </el-card>

        <div class="charts-wrapper">
            <div v-show="process" class="global-loading-container">
                <div class="loading-content">
                    <el-icon class="loading-icon"><Loading /></el-icon>
                    <span class="loading-text">正在加载图表数据...</span>
                </div>
            </div>

            <div class="charts-container" :style="{ opacity: process ? 0.3 : 1 }">
            <el-row :gutter="24">
                <el-col :xs="24" :sm="24" :md="12" :lg="12" :xl="8">
                    <el-card class="chart-card" shadow="hover">
                        <template #header>
                            <div class="chart-header">
                                <span class="chart-title">
                                    {{ getEnvName(0) }}
                                </span>
                                <el-button 
                                    type="text" 
                                    size="small" 
                                    :loading="chartLoadingStates[0]"
                                    @click="refreshChart(0)"
                                >
                                    <el-icon><Refresh /></el-icon>
                                </el-button>
                            </div>
                        </template>
                        
                        <div class="chart-wrapper-container">
                            <div 
                                v-if="chartLoadingStates[0]" 
                                class="chart-loading-overlay"
                            >
                                <div class="loading-content">
                                    <el-icon class="loading-spin"><Loading /></el-icon>
                                    <span class="loading-text">加载中...</span>
                                </div>
                            </div>
                            
                            <div 
                                v-else-if="!hasData(0)"
                                class="chart-empty"
                            >
                                <el-empty description="暂无数据" :image-size="60" />
                            </div>
                            
                            <div 
                                ref="chart" 
                                class="chart-wrapper"
                            ></div>
                        </div>
                    </el-card>
                </el-col>
                
                <el-col :xs="24" :sm="24" :md="12" :lg="12" :xl="8">
                    <el-card class="chart-card" shadow="hover">
                        <template #header>
                            <div class="chart-header">
                                <span class="chart-title">
                                    {{ getEnvName(1) }}
                                </span>
                                <el-button 
                                    type="text" 
                                    size="small" 
                                    :loading="chartLoadingStates[1]"
                                    @click="refreshChart(1)"
                                >
                                    <el-icon><Refresh /></el-icon>
                                </el-button>
                            </div>
                        </template>
                        
                        <div class="chart-wrapper-container">
                            <div 
                                v-if="chartLoadingStates[1]" 
                                class="chart-loading-overlay"
                            >
                                <div class="loading-content">
                                    <el-icon class="loading-spin"><Loading /></el-icon>
                                    <span class="loading-text">加载中...</span>
                                </div>
                            </div>
                            
                            <div 
                                v-else-if="!hasData(1)"
                                class="chart-empty"
                            >
                                <el-empty description="暂无数据" :image-size="60" />
                            </div>
                            
                            <div 
                                ref="chart2" 
                                class="chart-wrapper"
                            ></div>
                        </div>
                    </el-card>
                </el-col>
                
                <el-col :xs="24" :sm="24" :md="12" :lg="12" :xl="8">
                    <el-card class="chart-card" shadow="hover">
                        <template #header>
                            <div class="chart-header">
                                <span class="chart-title">
                                    {{ getEnvName(2) }}
                                </span>
                                <el-button 
                                    type="text" 
                                    size="small" 
                                    :loading="chartLoadingStates[2]"
                                    @click="refreshChart(2)"
                                >
                                    <el-icon><Refresh /></el-icon>
                                </el-button>
                            </div>
                        </template>
                        
                        <div class="chart-wrapper-container">
                            <div 
                                v-if="chartLoadingStates[2]" 
                                class="chart-loading-overlay"
                            >
                                <div class="loading-content">
                                    <el-icon class="loading-spin"><Loading /></el-icon>
                                    <span class="loading-text">加载中...</span>
                                </div>
                            </div>
                            
                            <div 
                                v-else-if="!hasData(2)"
                                class="chart-empty"
                            >
                                <el-empty description="暂无数据" :image-size="60" />
                            </div>
                            
                            <div 
                                ref="chart3" 
                                class="chart-wrapper"
                            ></div>
                        </div>
                    </el-card>
                </el-col>
                
                <el-col :xs="24" :sm="24" :md="12" :lg="12" :xl="8">
                    <el-card class="chart-card" shadow="hover">
                        <template #header>
                            <div class="chart-header">
                                <span class="chart-title">
                                    {{ getEnvName(3) }}
                                </span>
                                <el-button 
                                    type="text" 
                                    size="small" 
                                    :loading="chartLoadingStates[3]"
                                    @click="refreshChart(3)"
                                >
                                    <el-icon><Refresh /></el-icon>
                                </el-button>
                            </div>
                        </template>
                        
                        <div class="chart-wrapper-container">
                            <div 
                                v-if="chartLoadingStates[3]" 
                                class="chart-loading-overlay"
                            >
                                <div class="loading-content">
                                    <el-icon class="loading-spin"><Loading /></el-icon>
                                    <span class="loading-text">加载中...</span>
                                </div>
                            </div>
                            
                            <div 
                                v-else-if="!hasData(3)"
                                class="chart-empty"
                            >
                                <el-empty description="暂无数据" :image-size="60" />
                            </div>
                            
                            <div 
                                ref="chart4" 
                                class="chart-wrapper"
                            ></div>
                        </div>
                    </el-card>
                </el-col>
                
                <el-col :xs="24" :sm="24" :md="12" :lg="12" :xl="8">
                    <el-card class="chart-card" shadow="hover">
                        <template #header>
                            <div class="chart-header">
                                <span class="chart-title">
                                    {{ getEnvName(4) }}
                                </span>
                                <el-button 
                                    type="text" 
                                    size="small" 
                                    :loading="chartLoadingStates[4]"
                                    @click="refreshChart(4)"
                                >
                                    <el-icon><Refresh /></el-icon>
                                </el-button>
                            </div>
                        </template>
                        
                        <div class="chart-wrapper-container">
                            <div 
                                v-if="chartLoadingStates[4]" 
                                class="chart-loading-overlay"
                            >
                                <div class="loading-content">
                                    <el-icon class="loading-spin"><Loading /></el-icon>
                                    <span class="loading-text">加载中...</span>
                                </div>
                            </div>
                            
                            <div 
                                v-else-if="!hasData(4)"
                                class="chart-empty"
                            >
                                <el-empty description="暂无数据" :image-size="60" />
                            </div>
                            
                            <div 
                                ref="chart5" 
                                class="chart-wrapper"
                            ></div>
                        </div>
                    </el-card>
                </el-col>
                
                <el-col :xs="24" :sm="24" :md="12" :lg="12" :xl="8">
                    <el-card class="chart-card" shadow="hover">
                        <template #header>
                            <div class="chart-header">
                                <span class="chart-title">
                                    {{ getEnvName(5) }}
                                </span>
                                <el-button 
                                    type="text" 
                                    size="small" 
                                    :loading="chartLoadingStates[5]"
                                    @click="refreshChart(5)"
                                >
                                    <el-icon><Refresh /></el-icon>
                                </el-button>
                            </div>
                        </template>
                        
                        <div class="chart-wrapper-container">
                            <div 
                                v-if="chartLoadingStates[5]" 
                                class="chart-loading-overlay"
                            >
                                <div class="loading-content">
                                    <el-icon class="loading-spin"><Loading /></el-icon>
                                    <span class="loading-text">加载中...</span>
                                </div>
                            </div>
                            
                            <div 
                                v-else-if="!hasData(5)"
                                class="chart-empty"
                            >
                                <el-empty description="暂无数据" :image-size="60" />
                            </div>
                            
                            <div 
                                ref="chart6" 
                                class="chart-wrapper"
                            ></div>
                        </div>
                    </el-card>
                </el-col>
                
                <el-col :xs="24" :sm="24" :md="12" :lg="12" :xl="8">
                    <el-card class="chart-card" shadow="hover">
                        <template #header>
                            <div class="chart-header">
                                <span class="chart-title">
                                    {{ getEnvName(6) }}
                                </span>
                                <el-button 
                                    type="text" 
                                    size="small" 
                                    :loading="chartLoadingStates[6]"
                                    @click="refreshChart(6)"
                                >
                                    <el-icon><Refresh /></el-icon>
                                </el-button>
                            </div>
                        </template>
                        
                        <div class="chart-wrapper-container">
                            <div 
                                v-if="chartLoadingStates[6]" 
                                class="chart-loading-overlay"
                            >
                                <div class="loading-content">
                                    <el-icon class="loading-spin"><Loading /></el-icon>
                                    <span class="loading-text">加载中...</span>
                                </div>
                            </div>
                            
                            <div 
                                v-else-if="!hasData(6)"
                                class="chart-empty"
                            >
                                <el-empty description="暂无数据" :image-size="60" />
                            </div>
                            
                            <div 
                                ref="chart7" 
                                class="chart-wrapper"
                            ></div>
                        </div>
                    </el-card>
                </el-col>
            </el-row>
        </div>
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

.charts-wrapper {
    position: relative;
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

.global-loading-container {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    display: flex;
    justify-content: center;
    align-items: center;
    background-color: rgba(255, 255, 255, 0.9);
    z-index: 100;
    border-radius: 8px;
}

.global-loading-container .loading-content {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 16px;
}

.global-loading-container .loading-icon {
    font-size: 48px;
    color: #409EFF;
    animation: rotate 1s linear infinite;
}

.global-loading-container .loading-text {
    font-size: 16px;
    color: #606266;
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

.chart-loading-overlay {
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

.chart-loading-overlay .loading-content {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 12px;
}

.loading-spin {
    font-size: 32px;
    color: #409EFF;
    animation: rotate 1s linear infinite;
}

.chart-loading-overlay .loading-text {
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
    z-index: 5;
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
