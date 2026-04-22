<template>
  <div class="route-page">
    <div class="page-header">
      <h2 class="page-title">域名路由解析</h2>
    </div>
    
    <!-- 加载状态 -->
    <div v-if="loading" class="loading-container">
      <el-loading text="加载中..." />
    </div>
    
    <!-- 操作区域 -->
    <div class="action-section">
      <div class="filter-group">
        <el-select v-model="env" placeholder="请选择环境" @change="changeEnv" class="env-select" clearable>
          <el-option v-for="item in envs" :key="item" :label="item" :value="item" />
        </el-select>
        
        <el-select v-model="ZoneId" placeholder="请选择托管区域" class="env-select" clearable>
          <el-option 
            v-for="item in ZonesId" 
            :key="item['HostedZone']" 
            :label="item['RecordName']"
            :value="item['HostedZone']" 
          />
        </el-select>
        
        <el-button type="primary" :icon="Refresh" @click="updateChart" class="action-btn">
          采集数据
        </el-button>
        
        <el-input v-model="port" placeholder="侦听器端口，默认443" clearable class="search-input">
          <template #prefix>
            <el-icon><Search /></el-icon>
          </template>
        </el-input>
      </div>
    </div>

    <div ref="chart" class="chart-container"></div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue';
import { Refresh, Search } from '@element-plus/icons-vue';

const chart = ref(null);
const myChart = ref(null);
const env = ref(null);
const port = ref(443);
const ZoneId = ref(null);
const ZonesId = ref(null);
const loading = ref(false);
const envs = ref(["china dev", "china dev-staging", "china prod", "singapore-dev", "singapore-staging", "singapore-prod", "usa-prod"]);

// 定义静态布局坐标计算器
const calcLayout = (nodes) => {
  const layerGap = 300; // 层级水平间距
  // 动态间距：基础80px + 每多5个节点减少10px（最小40px）
  const nodeGap = Math.max(40, 80 - Math.floor(nodes.length / 5) * 10);

  return nodes.map((node, index) => {
    // 按category分三列
    let x = 100 + node.category * layerGap;

    // 计算同层级Y坐标（垂直居中）
    const sameLayerNodes = nodes.filter(n => n.category === node.category);
    const layerIndex = sameLayerNodes.findIndex(n => n.id === node.id);
    const totalHeight = (sameLayerNodes.length - 1) * nodeGap;
    
    // 安全检查：确保 chart.value 存在
    let y = 100;
    if (chart.value && chart.value.clientHeight) {
      y = (chart.value.clientHeight / 2) - (totalHeight / 2) + (layerIndex + 1) * nodeGap;
    }
    
    return { ...node, x, y };
  });
};




// 初始化图表
const initChart = () => {
  try {
    if (!chart.value) {
      console.warn('Chart container not found');
      return;
    }
    
    myChart.value = echarts.init(chart.value);

    const option = {
      tooltip: { trigger: 'item' },
      series: [{
        roam: true,
        zoom: 2,
        focusNodeAdjacency: true,
        type: 'graph',
        layout: 'none',
        symbolSize: 10,
        edgeSymbol: ['none', 'arrow'],
        edgeSymbolSize: [0, 12],
        label: {
          show: true,
          position: 'right',
          fontSize: 14,
          color: '#333'
        },
        lineStyle: {
          color: '#aaa',
          width: 2,
          curveness: 0
        },
        edgeLabel: {
          show: true,
          formatter: '调用',
          fontSize: 12,
          color: '#666',
          position: 'middle'
        },
        itemStyle: {
          color: ({ data }) => data.category === 0 ? '#5470c6' :
            data.category === 1 ? '#91cc75' : '#e6a23c'
        }
      }],
      dataZoom: [{
        type: 'slider',
        show: true,
        start: 0,
        end: 100,
        height: 20,
        bottom: 10
      }]
    };

    myChart.value.setOption(option);
  } catch (error) {
    console.error('Failed to initialize chart:', error);
  }
};

// 模拟初始数据
const graphData = {
  nodes: [

  ],
  links: [

  ]
};

// 更新图表数据
const updateChart = async () => {
  try {
    loading.value = true;
    
    if (!myChart.value) {
      console.warn('Chart not initialized');
      return;
    }
    
    const res = await axios.get('/api/aws/route_path?env=' + env.value + "&port=" + port.value + "&ZoneId=" + ZoneId.value);
    const dynamicData = res.data;

    // 静态坐标计算
    const positionedNodes = calcLayout(dynamicData.nodes);

    myChart.value.setOption({
      series: [{
        data: positionedNodes,
        links: dynamicData.links
      }]
    });
  } catch (err) {
    console.error('Failed to update chart:', err);
  } finally {
    loading.value = false;
  }
};

// 更新托管区域数据
const changeEnv = async () => {
  try {
    loading.value = true;
    const res = await axios.get('/api/aws/get_zones?env=' + env.value);
    ZonesId.value = res.data;

  } catch (err) {
    console.error(err);
  } finally {
    loading.value = false;
  }
}

onMounted(() => {
  initChart();
});

onUnmounted(() => {
  myChart.value?.dispose();
});
</script>

<style scoped>
.route-page {
  min-height: 100%;
}

.page-header {
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

.action-section {
  background: #fff;
  padding: 20px;
  border-radius: 8px;
  margin-bottom: 20px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.05);
}

/* 筛选组样式 */
.filter-group {
  display: flex;
  flex-wrap: wrap;
  gap: 15px;
  align-items: center;
}

.env-select {
  width: 200px;
}

.search-input {
  width: 200px;
}

.action-btn {
  min-width: 100px;
}

.chart-container {
  background: #fff;
  border-radius: 8px;
  padding: 20px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.05);
  min-height: 600px;
  border: 1px solid #ebeef5;
}

@media (max-width: 768px) {
  .filter-group {
    flex-direction: column;
    align-items: stretch;
  }
  
  .env-select,
  .search-input,
  .action-btn {
    width: 100%;
  }
}
</style>