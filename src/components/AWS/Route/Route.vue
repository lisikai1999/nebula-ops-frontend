<template>
  <div class="route-page">
    <div class="page-header">
      <h2 class="page-title">域名路由解析</h2>
    </div>
    
    <!-- 操作区域 -->
    <div class="action-section">
      <div class="filter-group">
        <el-select v-model="env" placeholder="请选择环境" @change="changeEnv" class="env-select" clearable>
          <el-option v-for="item in envs" :key="item" :label="item" :value="item" />
        </el-select>
        
        <el-select v-model="ZoneId" placeholder="请选择托管区域" class="env-select" clearable :disabled="loadingZones">
          <el-option 
            v-for="item in ZonesId" 
            :key="item['HostedZone']" 
            :label="item['RecordName']"
            :value="item['HostedZone']" 
          />
        </el-select>
        
        <el-button type="primary" :icon="Refresh" @click="updateChart" class="action-btn" :loading="loadingChart">
          采集数据
        </el-button>
        
        <el-input v-model="port" placeholder="侦听器端口，默认443" clearable class="search-input">
          <template #prefix>
            <el-icon><Search /></el-icon>
          </template>
        </el-input>
        
        <el-input 
          v-model="searchKeyword" 
          placeholder="搜索节点名称..." 
          clearable 
          class="search-input"
          @input="filterNodes"
        >
          <template #prefix>
            <el-icon><Search /></el-icon>
          </template>
        </el-input>
        
        <el-select v-model="filterCategory" placeholder="按类别过滤" class="env-select" clearable @change="filterNodes">
          <el-option label="域名" :value="0" />
          <el-option label="负载均衡" :value="1" />
          <el-option label="目标组" :value="2" />
        </el-select>
      </div>
    </div>

    <!-- 图表区域 - 使用相对定位作为容器 -->
    <div class="chart-wrapper">
      <!-- 状态遮罩层 - 独立于图表容器，使用绝对定位 -->
      <!-- 骨架屏加载状态 -->
      <div v-if="loadingChart && !hasData" class="status-overlay skeleton-overlay">
        <el-skeleton :rows="10" animated>
          <template #template>
            <el-skeleton-item variant="h1" style="width: 50%; margin-bottom: 20px;" />
            <div class="skeleton-graph">
              <el-skeleton-item variant="circle" style="width: 40px; height: 40px; margin: 20px;" />
              <el-skeleton-item variant="rect" style="width: 100px; height: 2px; margin: 0 10px;" />
              <el-skeleton-item variant="circle" style="width: 40px; height: 40px; margin: 20px;" />
              <el-skeleton-item variant="rect" style="width: 100px; height: 2px; margin: 0 10px;" />
              <el-skeleton-item variant="circle" style="width: 40px; height: 40px; margin: 20px;" />
            </div>
            <el-skeleton-item variant="text" style="width: 80%; margin-top: 20px;" />
            <el-skeleton-item variant="text" style="width: 60%;" />
            <el-skeleton-item variant="text" style="width: 70%;" />
          </template>
        </el-skeleton>
      </div>
      
      <!-- 空状态 -->
      <div v-else-if="!hasData && !loadingChart" class="status-overlay empty-overlay">
        <el-empty description="暂无数据，请选择环境并点击采集数据">
          <el-button type="primary" :icon="Refresh" @click="updateChart" :disabled="!env">
            开始采集
          </el-button>
        </el-empty>
      </div>
      
      <!-- 搜索无结果 -->
      <div v-else-if="filteredNodes.length === 0 && hasData" class="status-overlay empty-overlay">
        <el-empty description="未找到匹配的节点">
          <el-button type="primary" @click="clearFilter">
            清除筛选
          </el-button>
        </el-empty>
      </div>
      
      <!-- 加载遮罩 - 已有数据时刷新显示 -->
      <div v-if="loadingChart && hasData" class="status-overlay loading-overlay">
        <el-icon class="loading-icon"><Loading /></el-icon>
        <span class="loading-text">正在加载路由数据...</span>
      </div>
      
      <!-- ECharts 图表容器 - 永远不使用 v-if，内部没有任何 Vue 条件渲染的子元素 -->
      <!-- 这个 div 一旦渲染就永远存在，ECharts 可以安全地在内部创建 canvas -->
      <div ref="chart" class="chart-container"></div>
    </div>
    
    <!-- 节点详情抽屉 -->
    <el-drawer
      v-model="drawerVisible"
      title="节点详情"
      direction="right"
      :size="400"
      :before-close="handleCloseDrawer"
    >
      <div v-if="selectedNode" class="node-detail">
        <div class="detail-section">
          <h4 class="detail-title">基本信息</h4>
          <el-descriptions :column="1" border>
            <el-descriptions-item label="节点名称">
              <span class="node-name">{{ selectedNode.name }}</span>
            </el-descriptions-item>
            <el-descriptions-item label="节点类别">
              <el-tag :type="getCategoryTagType(selectedNode.category)">
                {{ getCategoryLabel(selectedNode.category) }}
              </el-tag>
            </el-descriptions-item>
            <el-descriptions-item label="节点ID">
              {{ selectedNode.id }}
            </el-descriptions-item>
          </el-descriptions>
        </div>
        
        <div class="detail-section" v-if="selectedNode.details">
          <h4 class="detail-title">详细信息</h4>
          <el-descriptions :column="1" border>
            <template v-if="selectedNode.category === 0">
              <el-descriptions-item label="域名" v-if="selectedNode.details.domain">
                {{ selectedNode.details.domain }}
              </el-descriptions-item>
              <el-descriptions-item label="记录类型" v-if="selectedNode.details.recordType">
                {{ selectedNode.details.recordType }}
              </el-descriptions-item>
              <el-descriptions-item label="TTL" v-if="selectedNode.details.ttl">
                {{ selectedNode.details.ttl }}
              </el-descriptions-item>
            </template>
            <template v-else-if="selectedNode.category === 1">
              <el-descriptions-item label="负载均衡器名称" v-if="selectedNode.details.loadBalancerName">
                {{ selectedNode.details.loadBalancerName }}
              </el-descriptions-item>
              <el-descriptions-item label="DNS名称" v-if="selectedNode.details.dnsName">
                {{ selectedNode.details.dnsName }}
              </el-descriptions-item>
              <el-descriptions-item label="类型" v-if="selectedNode.details.type">
                {{ selectedNode.details.type }}
              </el-descriptions-item>
              <el-descriptions-item label="状态" v-if="selectedNode.details.state">
                <el-tag :type="selectedNode.details.state === 'active' ? 'success' : 'info'">
                  {{ selectedNode.details.state }}
                </el-tag>
              </el-descriptions-item>
            </template>
            <template v-else-if="selectedNode.category === 2">
              <el-descriptions-item label="目标组名称" v-if="selectedNode.details.targetGroupName">
                {{ selectedNode.details.targetGroupName }}
              </el-descriptions-item>
              <el-descriptions-item label="协议" v-if="selectedNode.details.protocol">
                {{ selectedNode.details.protocol }}
              </el-descriptions-item>
              <el-descriptions-item label="端口" v-if="selectedNode.details.port">
                {{ selectedNode.details.port }}
              </el-descriptions-item>
              <el-descriptions-item label="VPC ID" v-if="selectedNode.details.vpcId">
                {{ selectedNode.details.vpcId }}
              </el-descriptions-item>
              <el-descriptions-item label="目标数量" v-if="selectedNode.details.targetCount">
                {{ selectedNode.details.targetCount }}
              </el-descriptions-item>
            </template>
          </el-descriptions>
        </div>
        
        <div class="detail-section" v-if="relatedLinks.length > 0">
          <h4 class="detail-title">连接关系</h4>
          <div class="links-list">
            <div v-for="(link, index) in relatedLinks" :key="index" class="link-item">
              <el-tag size="small" class="link-source">{{ link.sourceName }}</el-tag>
              <el-icon class="link-arrow"><Right /></el-icon>
              <el-tag size="small" type="primary" class="link-target">{{ link.targetName }}</el-tag>
            </div>
          </div>
        </div>
      </div>
    </el-drawer>
    
    <!-- 数据统计卡片 -->
    <div v-if="hasData && !loadingChart" class="stats-section">
      <el-row :gutter="20">
        <el-col :span="6">
          <el-card shadow="hover" class="stat-card">
            <div class="stat-content">
              <div class="stat-value">{{ totalNodes }}</div>
              <div class="stat-label">总节点数</div>
            </div>
            <el-icon class="stat-icon"><DataLine /></el-icon>
          </el-card>
        </el-col>
        <el-col :span="6">
          <el-card shadow="hover" class="stat-card domain-card">
            <div class="stat-content">
              <div class="stat-value">{{ domainCount }}</div>
              <div class="stat-label">域名节点</div>
            </div>
            <el-icon class="stat-icon"><Document /></el-icon>
          </el-card>
        </el-col>
        <el-col :span="6">
          <el-card shadow="hover" class="stat-card lb-card">
            <div class="stat-content">
              <div class="stat-value">{{ lbCount }}</div>
              <div class="stat-label">负载均衡节点</div>
            </div>
            <el-icon class="stat-icon"><Share /></el-icon>
          </el-card>
        </el-col>
        <el-col :span="6">
          <el-card shadow="hover" class="stat-card tg-card">
            <div class="stat-content">
              <div class="stat-value">{{ tgCount }}</div>
              <div class="stat-label">目标组节点</div>
            </div>
            <el-icon class="stat-icon"><Folder /></el-icon>
          </el-card>
        </el-col>
      </el-row>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, nextTick } from 'vue';
import { Refresh, Search, Loading, Right, DataLine, Document, Share, Folder } from '@element-plus/icons-vue';
import { ElMessage } from 'element-plus';
import { useAwsEnvironmentsStore } from '@/stores/aws-environments';

const awsEnvironmentsStore = useAwsEnvironmentsStore();

// DOM 引用
const chart = ref(null);
const myChart = ref(null);

// 表单数据
const env = ref(null);
const port = ref(443);
const ZoneId = ref(null);
const ZonesId = ref([]);

// 加载状态
const loadingChart = ref(false);
const loadingZones = ref(false);
const loadingEnvs = ref(false);

// 搜索过滤
const searchKeyword = ref('');
const filterCategory = ref(null);

// 详情抽屉
const drawerVisible = ref(false);
const selectedNode = ref(null);
const relatedLinks = ref([]);

// 图表数据
const graphData = ref({
  nodes: [],
  links: []
});
const filteredNodes = ref([]);
const filteredLinks = ref([]);

// 环境列表 - 从store获取
const envs = computed(() => {
  return awsEnvironmentsStore.environments.map(envItem => envItem.name);
});

const loadEnvironments = async () => {
  loadingEnvs.value = true;
  try {
    await awsEnvironmentsStore.fetchEnvironments();
    
    if (awsEnvironmentsStore.selectedEnvironmentId) {
      const selectedEnv = awsEnvironmentsStore.selectedEnvironment;
      if (selectedEnv) {
        env.value = selectedEnv.name;
      }
    }
  } catch (error) {
    console.error('加载环境列表失败:', error);
  } finally {
    loadingEnvs.value = false;
  }
};

// 计算属性
const hasData = computed(() => graphData.value.nodes.length > 0);
const totalNodes = computed(() => graphData.value.nodes.length);
const domainCount = computed(() => graphData.value.nodes.filter(n => n.category === 0).length);
const lbCount = computed(() => graphData.value.nodes.filter(n => n.category === 1).length);
const tgCount = computed(() => graphData.value.nodes.filter(n => n.category === 2).length);

// 静态布局坐标计算器
const calcLayout = (nodes) => {
  const layerGap = 300;
  const nodeGap = Math.max(60, 100 - Math.floor(nodes.length / 3) * 15);

  return nodes.map((node, index) => {
    let x = 100 + node.category * layerGap;

    const sameLayerNodes = nodes.filter(n => n.category === node.category);
    const layerIndex = sameLayerNodes.findIndex(n => n.id === node.id);
    const totalHeight = (sameLayerNodes.length - 1) * nodeGap;
    
    let y = 100;
    if (chart.value && chart.value.clientHeight) {
      y = (chart.value.clientHeight / 2) - (totalHeight / 2) + (layerIndex + 1) * nodeGap;
    }
    
    return { ...node, x, y };
  });
};

// 获取类别标签
const getCategoryLabel = (category) => {
  const labels = { 0: '域名', 1: '负载均衡', 2: '目标组' };
  return labels[category] || '未知';
};

// 获取类别标签类型
const getCategoryTagType = (category) => {
  const types = { 0: 'info', 1: 'success', 2: 'warning' };
  return types[category] || '';
};

// 创建基础图表配置
const createBaseOption = () => {
  return {
    tooltip: { 
      trigger: 'item',
      formatter: (params) => {
        if (params.dataType === 'node') {
          return `
            <div style="font-weight: bold; margin-bottom: 5px;">${params.data.name}</div>
            <div>类别: ${getCategoryLabel(params.data.category)}</div>
            <div style="color: #999; font-size: 12px; margin-top: 5px;">点击查看详情</div>
          `;
        }
        return params.data.name || '连接关系';
      }
    },
    series: [{
      roam: true,
      zoom: 1.5,
      focusNodeAdjacency: true,
      type: 'graph',
      layout: 'none',
      symbolSize: 35,
      edgeSymbol: ['none', 'arrow'],
      edgeSymbolSize: [0, 12],
      label: {
        show: true,
        position: 'bottom',
        fontSize: 11,
        color: '#333',
        formatter: (params) => {
          const name = params.name;
          if (name.length > 20) {
            return name.substring(0, 17) + '...';
          }
          return name;
        }
      },
      lineStyle: {
        color: '#aaa',
        width: 2,
        curveness: 0.1
      },
      edgeLabel: {
        show: false,
        formatter: '调用',
        fontSize: 12,
        color: '#666',
        position: 'middle'
      },
      itemStyle: {
        color: ({ data }) => {
          if (data.isHighlighted) return '#ff6b6b';
          return data.category === 0 ? '#5470c6' :
            data.category === 1 ? '#91cc75' : '#e6a23c';
        },
        shadowBlur: 10,
        shadowColor: 'rgba(0, 0, 0, 0.2)'
      },
      emphasis: {
        label: { show: true, fontSize: 13, fontWeight: 'bold' },
        itemStyle: {
          shadowBlur: 20,
          shadowColor: 'rgba(0, 0, 0, 0.3)',
          borderWidth: 3,
          borderColor: '#fff'
        },
        lineStyle: { width: 4 }
      },
      select: {
        label: { show: true, fontSize: 14, fontWeight: 'bold' },
        itemStyle: {
          shadowBlur: 30,
          shadowColor: '#ff6b6b',
          borderWidth: 4,
          borderColor: '#ff6b6b'
        }
      },
      selectedMode: 'single',
      data: [],
      links: []
    }],
    dataZoom: [
      { type: 'inside', start: 0, end: 100 },
      { type: 'slider', show: true, start: 0, end: 100, height: 20, bottom: 10 }
    ],
    toolbox: {
      show: true,
      feature: {
        restore: { title: '重置' },
        saveAsImage: { title: '保存图片' },
        dataView: { title: '数据视图', readOnly: false }
      }
    }
  };
};

// 初始化图表 - 只在组件挂载时调用一次
const initChart = () => {
  if (!chart.value) {
    console.warn('Chart container not found, will retry in nextTick');
    return;
  }
  
  if (myChart.value) {
    console.log('Chart already initialized, skipping');
    return;
  }
  
  try {
    console.log('Initializing ECharts...');
    myChart.value = echarts.init(chart.value);
    myChart.value.setOption(createBaseOption());
    
    // 绑定点击事件
    myChart.value.on('click', (params) => {
      if (params.dataType === 'node') {
        showNodeDetail(params.data);
      }
    });
    
    // 窗口大小改变时重绘
    window.addEventListener('resize', handleResize);
    
    console.log('ECharts initialized successfully');
  } catch (error) {
    console.error('Failed to initialize ECharts:', error);
  }
};

// 窗口大小改变处理
const handleResize = () => {
  if (myChart.value) {
    myChart.value.resize();
  }
};

// 安全地设置图表数据
const setChartData = (nodes, links) => {
  if (!myChart.value) {
    console.warn('Chart not initialized, cannot set data');
    return false;
  }
  
  try {
    const positionedNodes = calcLayout(nodes);
    
    myChart.value.setOption({
      series: [{
        data: positionedNodes,
        links: links
      }]
    });
    
    return true;
  } catch (error) {
    console.error('Failed to set chart data:', error);
    return false;
  }
};

// 更新图表数据 - 主函数
const updateChart = async () => {
  if (!env.value) {
    ElMessage.warning('请先选择环境');
    return;
  }
  
  // 确保图表已初始化
  if (!myChart.value) {
    console.log('Chart not initialized, attempting to initialize now...');
    initChart();
    // 等待初始化
    await nextTick();
    if (!myChart.value) {
      ElMessage.error('图表初始化失败，请刷新页面重试');
      return;
    }
  }
  
  try {
    loadingChart.value = true;
    
    const res = await axios.get(
      '/api/aws/route_path?env=' + env.value + 
      "&port=" + port.value + 
      "&ZoneId=" + (ZoneId.value || '')
    );
    
    const dynamicData = res.data;
    
    if (!dynamicData.nodes || dynamicData.nodes.length === 0) {
      ElMessage.info('未获取到任何数据');
      graphData.value = { nodes: [], links: [] };
      filteredNodes.value = [];
      filteredLinks.value = [];
      return;
    }
    
    // 更新数据
    graphData.value = dynamicData;
    
    // 重置筛选
    searchKeyword.value = '';
    filterCategory.value = null;
    
    // 设置图表数据
    const success = setChartData(dynamicData.nodes, dynamicData.links);
    
    if (success) {
      ElMessage.success(`成功加载 ${dynamicData.nodes.length} 个节点，${dynamicData.links.length} 条连接`);
    } else {
      ElMessage.warning('数据加载完成，但图表渲染可能有问题');
    }
    
  } catch (err) {
    console.error('Failed to update chart:', err);
    ElMessage.error('获取数据失败: ' + (err.message || '未知错误'));
  } finally {
    loadingChart.value = false;
  }
};

// 更新托管区域数据
const changeEnv = async () => {
  if (!env.value) {
    ZonesId.value = [];
    ZoneId.value = null;
    return;
  }
  
  try {
    loadingZones.value = true;
    const res = await axios.get('/api/aws/get_zones?env=' + env.value);
    ZonesId.value = res.data || [];
    
    if (ZonesId.value.length === 0) {
      ElMessage.info('当前环境没有托管区域');
    }
  } catch (err) {
    console.error(err);
    ElMessage.error('获取托管区域失败');
  } finally {
    loadingZones.value = false;
  }
};

// 过滤节点
const filterNodes = () => {
  if (!graphData.value.nodes || graphData.value.nodes.length === 0) {
    filteredNodes.value = [];
    filteredLinks.value = [];
    return;
  }
  
  let nodes = [...graphData.value.nodes];
  
  // 按关键词搜索
  if (searchKeyword.value) {
    const keyword = searchKeyword.value.toLowerCase();
    nodes = nodes.filter(node => 
      node.name.toLowerCase().includes(keyword) ||
      node.id.toLowerCase().includes(keyword)
    );
  }
  
  // 按类别过滤
  if (filterCategory.value !== null && filterCategory.value !== undefined) {
    nodes = nodes.filter(node => node.category === filterCategory.value);
  }
  
  // 找到相关的连接
  const nodeIds = new Set(nodes.map(n => n.id));
  const links = graphData.value.links.filter(link => 
    nodeIds.has(link.source) && nodeIds.has(link.target)
  );
  
  filteredNodes.value = nodes;
  filteredLinks.value = links;
  
  // 更新图表显示高亮
  if (myChart.value && graphData.value.nodes.length > 0) {
    const highlightedIds = new Set(nodes.map(n => n.id));
    const updatedNodes = graphData.value.nodes.map(node => ({
      ...node,
      isHighlighted: searchKeyword.value || filterCategory.value !== null ? highlightedIds.has(node.id) : false,
      itemStyle: {
        opacity: searchKeyword.value || filterCategory.value !== null ? (highlightedIds.has(node.id) ? 1 : 0.3) : 1
      }
    }));
    
    setChartData(updatedNodes, graphData.value.links);
  }
};

// 清除筛选
const clearFilter = () => {
  searchKeyword.value = '';
  filterCategory.value = null;
  filterNodes();
};

// 显示节点详情
const showNodeDetail = (node) => {
  selectedNode.value = node;
  
  // 找到相关的连接
  relatedLinks.value = graphData.value.links
    .filter(link => link.source === node.id || link.target === node.id)
    .map(link => {
      const sourceNode = graphData.value.nodes.find(n => n.id === link.source);
      const targetNode = graphData.value.nodes.find(n => n.id === link.target);
      return {
        ...link,
        sourceName: sourceNode?.name || link.source,
        targetName: targetNode?.name || link.target
      };
    });
  
  drawerVisible.value = true;
};

// 关闭抽屉
const handleCloseDrawer = (done) => {
  drawerVisible.value = false;
  selectedNode.value = null;
  relatedLinks.value = [];
  done();
};

// 组件挂载
onMounted(() => {
  console.log('Route component mounted');
  // 加载环境列表
  loadEnvironments();
  // 立即尝试初始化
  initChart();
  // 在下一个 tick 再次尝试（确保 DOM 完全渲染）
  nextTick(() => {
    if (!myChart.value) {
      console.log('Retrying chart initialization in nextTick...');
      initChart();
    }
  });
});

// 组件卸载
onUnmounted(() => {
  window.removeEventListener('resize', handleResize);
  if (myChart.value) {
    myChart.value.dispose();
    myChart.value = null;
  }
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

.action-section {
  background: #fff;
  padding: 20px;
  border-radius: 8px;
  margin-bottom: 20px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.05);
}

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

/* 图表容器 - 使用相对定位作为所有子元素的定位参考 */
.chart-wrapper {
  background: #fff;
  border-radius: 8px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.05);
  min-height: 600px;
  border: 1px solid #ebeef5;
  margin-bottom: 20px;
  position: relative; /* 关键：作为定位参考 */
}

/* 状态遮罩层 - 使用绝对定位覆盖在图表之上 */
.status-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: #fff;
  z-index: 100; /* 确保在图表之上 */
  border-radius: 8px;
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 20px;
}

/* 骨架屏遮罩 */
.skeleton-overlay {
  display: block; /* 骨架屏使用块级布局 */
  overflow: auto;
}

/* 加载遮罩 - 半透明 */
.loading-overlay {
  background: rgba(255, 255, 255, 0.95);
  flex-direction: column;
}

/* ECharts 图表容器 - 永远存在，不使用任何条件渲染 */
/* 这个容器内部不应该有任何 Vue 管理的子元素 */
.chart-container {
  width: 100%;
  min-height: 550px;
  height: 550px; /* 固定高度，确保 ECharts 可以计算尺寸 */
  position: relative;
  z-index: 1; /* 确保在遮罩层之下 */
}

.loading-icon {
  font-size: 40px;
  color: #409eff;
  animation: rotate 1.5s linear infinite;
}

@keyframes rotate {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.loading-text {
  margin-top: 15px;
  color: #666;
  font-size: 14px;
}

.skeleton-graph {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 40px 0;
}

.stats-section {
  margin-bottom: 20px;
}

.stat-card {
  cursor: pointer;
  transition: all 0.3s ease;
}

.stat-card:hover {
  transform: translateY(-3px);
}

.stat-content {
  display: inline-block;
}

.stat-value {
  font-size: 28px;
  font-weight: bold;
  color: #303133;
}

.stat-label {
  font-size: 14px;
  color: #909399;
  margin-top: 5px;
}

.stat-icon {
  float: right;
  font-size: 48px;
  color: #409eff;
  opacity: 0.3;
}

.domain-card .stat-icon {
  color: #5470c6;
}

.lb-card .stat-icon {
  color: #91cc75;
}

.tg-card .stat-icon {
  color: #e6a23c;
}

.node-detail {
  padding: 10px 0;
}

.detail-section {
  margin-bottom: 25px;
}

.detail-title {
  font-size: 16px;
  font-weight: 600;
  color: #303133;
  margin-bottom: 15px;
  padding-bottom: 10px;
  border-bottom: 1px solid #ebeef5;
}

.node-name {
  font-weight: 600;
  color: #409eff;
  word-break: break-all;
}

.links-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.link-item {
  display: flex;
  align-items: center;
  padding: 10px;
  background: #f5f7fa;
  border-radius: 6px;
}

.link-source {
  margin-right: 10px;
}

.link-arrow {
  margin-right: 10px;
  color: #909399;
}

.link-target {
  margin-left: 10px;
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
