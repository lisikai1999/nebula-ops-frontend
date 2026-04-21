<template>
  <h2>
      域名路由解析 
  </h2>
  <!-- 环状旋转器 -->
  <div v-if="loading" class="spinner-border" style="width: 4rem; height: 4rem;" role="status">
    <span class="sr-only"></span>
  </div>
  <!-- 操作区域 -->
  <div class="action-section">
    <!-- 环境选择 -->
    <div class="filter-group">
      <el-select v-model="env" placeholder="请选择环境" @change="changeEnv" class="env-select">
        <el-option v-for="item in envs" :key="item" :label="item" :value="item" />
      </el-select>
      <el-select v-model="ZoneId" placeholder="请选择托管区域" class="env-select">
        <el-option v-for="item in ZonesId" :key="item['HostedZone']" :label="item['RecordName']"
          :value="item['HostedZone']" />
      </el-select>
      <el-button type="success" icon="el-icon-refresh" @click="updateChart" class="action-btn">
        采集数据
      </el-button>
      <el-input v-model="port" placeholder="侦听器端口，默认443" clearable class="search-input">
        <template #prefix>
          <i class="el-icon-search"></i>
        </template>
      </el-input>
    </div>

  </div>

  <div ref="chart" style="min-height: 1000px;height: auto;border: 1px solid #eee;"></div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue';

const chart = ref(null);
const myChart = ref(null);
var env = ref(null);
var port = ref(443);
var ZoneId = ref(null);
var ZonesId = ref(null);
const loading = ref(false);
const envs = ref(["china dev", "china dev-staging", "china prod", "singapore-dev", "singapore-staging", "singapore-prod", "usa-prod"])


// 定义静态布局坐标计算器
const calcLayout = (nodes) => {
  const layerGap = 300; // 层级水平间距
  // const nodeGap = 80;   // 同层级垂直间距
  // 动态间距：基础80px + 每多5个节点减少10px（最小40px）
  const nodeGap = Math.max(40, 80 - Math.floor(nodes.length / 5) * 10);

  return nodes.map((node, index) => {
    // 按category分三列
    let x = 100 + node.category * layerGap;

    // 计算同层级Y坐标（垂直居中）
    const sameLayerNodes = nodes.filter(n => n.category === node.category);
    const layerIndex = sameLayerNodes.findIndex(n => n.id === node.id);
    const totalHeight = (sameLayerNodes.length - 1) * nodeGap;
    const y = (chart.value.clientHeight / 2) - (totalHeight / 2) + (layerIndex + 1) * nodeGap;
    return { ...node, x, y }; // fixed:true 锁定位置
  });
};




// 初始化图表
const initChart = () => {
  myChart.value = echarts.init(chart.value);

  const option = {
    tooltip: { trigger: 'item' },
    series: [{
      roam: true, // 开启拖拽缩放
      zoom: 2,    // 初始缩放比例
      focusNodeAdjacency: true,  // 高亮关联节点
      type: 'graph',
      layout: 'none', // 关闭力导向
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
        curveness: 0 // 直线连接
      },
      edgeLabel: {
        show: true,
        formatter: '调用',
        fontSize: 12,
        color: '#666',
        position: 'middle' // 标签显示在线中间
      },
      itemStyle: {
        color: ({ data }) => data.category === 0 ? '#5470c6' :
          data.category === 1 ? '#91cc75' : '#e6a23c'
      }
    }],
    dataZoom: [{
      type: 'slider',    // 滑动条型数据区域缩放
      show: true,
      start: 0,          // 初始位置
      end: 100,          // 初始位置
      height: 20,        // 控件高度
      bottom: 10         // 距离底部位置
    }]
  };

  myChart.value.setOption(option);
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
    console.error(err);
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
</style>