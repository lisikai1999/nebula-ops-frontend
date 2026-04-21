<script>

export default {
    data() {
        return {
            chart: null,
            chart2: null,
            chart3: null,
            chart4: null,
            chart5: null,
            chart6: null,
            chart7: null,
            process: true
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
            // 获取时间标签和日志量数据
            const timeLabels = logData.map(data => new Date(data.timestamp).toLocaleDateString('zh-CN'));
            const logCounts = logData.map(data => data.count);
            // 配置图表的选项
            const option = {
                title: {
                    text: logData[0].env + " 近30天每日日志摄入量"
                },
                tooltip: {
                    trigger: 'axis'
                },
                xAxis: {
                    type: 'category',
                    boundaryGap: false,
                    data: timeLabels
                },
                yAxis: {
                    type: 'value',
                    axisLabel: {
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
                        smooth: true,  // 让折线平滑
                        areaStyle: {}  // 显示区域样式
                    }
                ]
            };
            return option
        },
        drawChart(logData) {

            // 初始化图表实例
            this.chart = echarts.init(this.$refs.chart);
            this.chart2 = echarts.init(this.$refs.chart2);
            this.chart3 = echarts.init(this.$refs.chart3);
            this.chart4 = echarts.init(this.$refs.chart4);
            this.chart5 = echarts.init(this.$refs.chart5);
            this.chart6 = echarts.init(this.$refs.chart6);
            this.chart7 = echarts.init(this.$refs.chart7);


            // 设置图表选项
            this.chart.setOption(this.chartOption(logData[0]));
            this.chart2.setOption(this.chartOption(logData[1]));
            this.chart3.setOption(this.chartOption(logData[2]));
            this.chart4.setOption(this.chartOption(logData[3]));
            this.chart5.setOption(this.chartOption(logData[4]));
            this.chart6.setOption(this.chartOption(logData[5]));
            this.chart7.setOption(this.chartOption(logData[6]));
        },

        // 获取日志数据
        fetchLogData() {
            axios.get('/api/aws/get_cloudwatch_IncomingBytes').
                then(response => {
                    const logData = response.data
                    this.drawChart(logData);
                }).catch(function (error) {
                    console.log(error);
                }).finally(()=>{
                    this.process = false
                });

        }
    },
    mounted() {
        this.fetchLogData();
    },
    beforeDestroy() {
        // 在组件销毁前销毁图表实例，防止内存泄漏
        if (this.chart) {
            this.chart.dispose();
        }
    }
};
</script>

<template>

    <div id="app" style="background-color: #ffffff;padding: 10px;">
        <el-container>
            <el-header>
                <h2>首页</h2>
            </el-header>
            <el-main>
                <!-- 环状旋转器 -->
                <div v-if="process" class="spinner-border" style="width: 4rem; height: 4rem;" role="status">
                    <span class="sr-only"></span>
                </div>

                <!-- 创建一个 div 来放置折线图 -->
                <div ref="chart" style="width: 100%; height: 400px;"></div>

                <div ref="chart2" style="width: 100%; height: 400px;"></div>

                <div ref="chart3" style="width: 100%; height: 400px;"></div>

                <div ref="chart4" style="width: 100%; height: 400px;"></div>

                <div ref="chart5" style="width: 100%; height: 400px;"></div>

                <div ref="chart6" style="width: 100%; height: 400px;"></div>

                <div ref="chart7" style="width: 100%; height: 400px;"></div>
            </el-main>
        </el-container>


    </div>





</template>