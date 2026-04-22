<script>
export default {
    name: 'LogIntake',
    data() {
        return {
            charts: [],
            process: true,
            logDataList: []
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
                    if (ref && logDataList[index]) {
                        const chart = echarts.init(ref);
                        chart.setOption(this.chartOption(logDataList[index]));
                        return chart;
                    }
                    return null;
                }).filter(chart => chart !== null);
            });
        },
        fetchLogData() {
            axios.get('/api/aws/get_cloudwatch_IncomingBytes')
                .then(response => {
                    const logData = response.data;
                    this.drawChart(logData);
                })
                .catch(error => {
                    console.log(error);
                    this.showMockData();
                })
                .finally(() => {
                    this.process = false;
                });
        },
        showMockData() {
            const mockData = [];
            const environments = ['生产环境', '测试环境', '开发环境', '预发布环境', 'UAT环境', 'Staging环境', 'Demo环境'];
            
            environments.forEach(env => {
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
                </div>
                <div class="header-right">
                    <el-tag type="primary" effect="plain">实时监控</el-tag>
                    <el-button type="primary" size="small" @click="fetchLogData">
                        <el-icon><Refresh /></el-icon>
                        刷新数据
                    </el-button>
                </div>
            </div>
        </el-card>

        <div v-if="process" class="loading-container">
            <el-loading text="加载中..." />
        </div>

        <div v-else class="charts-container">
            <el-row :gutter="24">
                <el-col :xs="24" :sm="24" :md="12" :lg="12" :xl="8">
                    <el-card class="chart-card" shadow="hover">
                        <div ref="chart" class="chart-wrapper"></div>
                    </el-card>
                </el-col>
                
                <el-col :xs="24" :sm="24" :md="12" :lg="12" :xl="8">
                    <el-card class="chart-card" shadow="hover">
                        <div ref="chart2" class="chart-wrapper"></div>
                    </el-card>
                </el-col>
                
                <el-col :xs="24" :sm="24" :md="12" :lg="12" :xl="8">
                    <el-card class="chart-card" shadow="hover">
                        <div ref="chart3" class="chart-wrapper"></div>
                    </el-card>
                </el-col>
                
                <el-col :xs="24" :sm="24" :md="12" :lg="12" :xl="8">
                    <el-card class="chart-card" shadow="hover">
                        <div ref="chart4" class="chart-wrapper"></div>
                    </el-card>
                </el-col>
                
                <el-col :xs="24" :sm="24" :md="12" :lg="12" :xl="8">
                    <el-card class="chart-card" shadow="hover">
                        <div ref="chart5" class="chart-wrapper"></div>
                    </el-card>
                </el-col>
                
                <el-col :xs="24" :sm="24" :md="12" :lg="12" :xl="8">
                    <el-card class="chart-card" shadow="hover">
                        <div ref="chart6" class="chart-wrapper"></div>
                    </el-card>
                </el-col>
                
                <el-col :xs="24" :sm="24" :md="12" :lg="12" :xl="8">
                    <el-card class="chart-card" shadow="hover">
                        <div ref="chart7" class="chart-wrapper"></div>
                    </el-card>
                </el-col>
            </el-row>
        </div>
    </div>
</template>

<script setup>
import { DataLine, Refresh } from '@element-plus/icons-vue';
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

.loading-container {
    display: flex;
    justify-content: center;
    align-items: center;
    min-height: 400px;
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

.chart-wrapper {
    width: 100%;
    height: 350px;
}

@media (max-width: 768px) {
    .page-header {
        flex-direction: column;
        align-items: flex-start;
    }
    
    .page-title {
        font-size: 18px;
    }
    
    .chart-wrapper {
        height: 300px;
    }
}
</style>