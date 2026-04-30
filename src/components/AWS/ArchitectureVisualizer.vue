<template>
  <div class="architecture-visualizer-page">
    <el-card class="page-header-card" shadow="never">
      <div class="page-header">
        <div class="header-left">
          <el-icon class="header-icon"><Share /></el-icon>
          <h1 class="page-title">AWS 架构图可视化</h1>
          <el-tag v-if="hasResources" type="success" effect="plain">
            已加载 {{ resourceNodes.length }} 个资源, {{ connections.length }} 条连接
          </el-tag>
        </div>
        <div class="header-right" v-if="hasResources">
          <el-button type="primary" @click="downloadAsPNG">
            <el-icon><Download /></el-icon>
            下载 PNG
          </el-button>
          <el-button type="success" @click="downloadAsSVG">
            <el-icon><Picture /></el-icon>
            下载 SVG
          </el-button>
          <el-button @click="resetDiagram">
            <el-icon><Refresh /></el-icon>
            重置
          </el-button>
        </div>
      </div>
    </el-card>

    <el-card class="input-card" shadow="never">
      <template #header>
        <span>资源采集配置</span>
      </template>
      <div class="input-section">
        <div class="input-row">
          <div class="input-group">
            <label class="input-label">AWS 环境</label>
            <el-select 
              v-model="selectedEnv" 
              placeholder="请选择 AWS 环境" 
              class="env-select"
              clearable
              filterable
              :loading="isLoadingEnv"
            >
              <el-option 
                v-for="env in envs" 
                :key="env.name" 
                :label="env.name" 
                :value="env.name"
              >
                <span class="env-name">{{ env.name }}</span>
                <el-tag v-if="env.is_default" type="warning" size="small" effect="plain">默认</el-tag>
              </el-option>
            </el-select>
          </div>

          <div class="input-group">
            <label class="input-label">ECS 服务 ARN</label>
            <el-input 
              v-model="ecsServiceArn" 
              placeholder="请输入 ECS 服务 ARN"
              class="arn-input"
              clearable
            >
              <template #prefix>
                <el-icon><Link /></el-icon>
              </template>
            </el-input>
          </div>
        </div>

        <div class="action-row">
          <el-button 
            type="primary" 
            :icon="Search" 
            @click="collectResources" 
            :loading="isCollecting"
            :disabled="!selectedEnv || !ecsServiceArn"
          >
            {{ isCollecting ? '采集中...' : '采集资源并生成架构图' }}
          </el-button>
          <el-button 
            @click="loadSampleData"
            :disabled="isCollecting"
          >
            <el-icon><Document /></el-icon>
            加载示例数据
          </el-button>
        </div>

        <el-alert 
          v-if="errorMessage" 
          :title="errorMessage" 
          type="error" 
          :closable="true"
          @close="errorMessage = ''"
          style="margin-top: 16px;"
        />
      </div>
    </el-card>

    <el-card class="editor-toolbar-card" shadow="never" v-if="hasResources">
      <div class="editor-toolbar">
        <div class="toolbar-section">
          <span class="toolbar-label">编辑模式:</span>
          <el-radio-group v-model="editMode" size="small">
            <el-radio-button value="select">
              <el-icon><Mouse /></el-icon>
              选择
            </el-radio-button>
            <el-radio-button value="connect">
              <el-icon><Connection /></el-icon>
              连线
            </el-radio-button>
          </el-radio-group>
        </div>

        <el-divider direction="vertical" />

        <div class="toolbar-section">
          <el-button 
            type="primary" 
            size="small" 
            @click="openAddNodeDialog"
          >
            <el-icon><Plus /></el-icon>
            新增资源
          </el-button>
          <el-button 
            type="danger" 
            size="small" 
            @click="handleDeleteSelected"
            :disabled="!selectedNode && !selectedConnection"
          >
            <el-icon><Delete /></el-icon>
            删除选中
          </el-button>
        </div>

        <el-divider direction="vertical" />

        <div class="toolbar-section">
          <el-button-group size="small">
            <el-button @click="zoomIn">
              <el-icon><ZoomIn /></el-icon>
            </el-button>
            <el-button @click="zoomOut">
              <el-icon><ZoomOut /></el-icon>
            </el-button>
            <el-button @click="resetZoom">
              <el-icon><FullScreen /></el-icon>
            </el-button>
          </el-button-group>
          <span class="zoom-level">{{ Math.round(scale * 100) }}%</span>
        </div>
      </div>
    </el-card>

    <el-card class="diagram-card" shadow="never" v-if="hasResources">
      <template #header>
        <div class="diagram-header">
          <span>架构图</span>
          <div class="diagram-hints">
            <el-tag v-if="editMode === 'select'" type="info" size="small">
              选择模式: 点击节点或连线进行编辑，拖动节点调整位置
            </el-tag>
            <el-tag v-if="editMode === 'connect'" type="warning" size="small">
              连线模式: 先点击起点节点，再点击终点节点创建连接
            </el-tag>
            <el-tag v-if="connectingFrom" type="success" size="small">
              已选择起点: {{ connectingFrom.title }}，请点击终点节点
            </el-tag>
          </div>
        </div>
      </template>

      <div class="diagram-container" ref="diagramContainerRef">
        <div 
          class="canvas-wrapper"
          :style="{ transform: `scale(${scale})`, transformOrigin: 'top left' }"
          @mousedown="onCanvasMouseDown"
          @mousemove="onCanvasMouseMove"
          @mouseup="onCanvasMouseUp"
          @mouseleave="onCanvasMouseUp"
        >
          <svg 
            ref="svgRef"
            :width="canvasWidth" 
            :height="canvasHeight"
            class="diagram-svg"
          >
            <defs>
              <marker 
                id="arrowhead" 
                markerWidth="10" 
                markerHeight="7" 
                refX="9" 
                refY="3.5" 
                orient="auto"
              >
                <polygon points="0 0, 10 3.5, 0 7" fill="#909399" />
              </marker>
              <marker 
                id="arrowhead-highlight" 
                markerWidth="10" 
                markerHeight="7" 
                refX="9" 
                refY="3.5" 
                orient="auto"
              >
                <polygon points="0 0, 10 3.5, 0 7" fill="#409EFF" />
              </marker>
              <marker 
                id="arrowhead-hover" 
                markerWidth="10" 
                markerHeight="7" 
                refX="9" 
                refY="3.5" 
                orient="auto"
              >
                <polygon points="0 0, 10 3.5, 0 7" fill="#F56C6C" />
              </marker>
              <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
                <feDropShadow dx="0" dy="2" stdDeviation="3" flood-opacity="0.2"/>
              </filter>
            </defs>

            <g class="connections">
              <g 
                v-for="conn in connections"
                :key="conn.id"
                @mousedown.stop="onConnectionClick(conn)"
                class="connection-group"
              >
                <line 
                  :x1="conn.x1"
                  :y1="conn.y1"
                  :x2="conn.x2"
                  :y2="conn.y2"
                  :stroke="conn.highlighted ? '#409EFF' : (conn.hovered ? '#F56C6C' : (conn.color || '#909399'))"
                  :stroke-width="conn.highlighted ? 4 : (conn.hovered ? 3 : (conn.width || 2))"
                  :marker-end="conn.highlighted ? 'url(#arrowhead-highlight)' : (conn.hovered ? 'url(#arrowhead-hover)' : 'url(#arrowhead)')"
                  :class="{ 'connection-highlight': conn.highlighted }"
                  @mouseenter="conn.hovered = true"
                  @mouseleave="conn.hovered = false"
                />
                <circle 
                  :cx="(conn.x1 + conn.x2) / 2"
                  :cy="(conn.y1 + conn.y2) / 2"
                  r="8"
                  :fill="conn.highlighted ? '#409EFF' : (conn.hovered ? '#F56C6C' : 'transparent')"
                  :stroke="conn.highlighted ? '#409EFF' : (conn.hovered ? '#F56C6C' : '#C0C4CC')"
                  stroke-width="1"
                  class="connection-handle"
                />
              </g>
            </g>

            <g class="nodes">
              <g 
                v-for="node in resourceNodes"
                :key="node.id"
                :transform="`translate(${node.x}, ${node.y})`"
                :class="{ 
                  'node-selected': selectedNode?.id === node.id,
                  'node-dragging': draggingNode?.id === node.id,
                  'node-connecting': connectingFrom?.id === node.id || (connectingFrom && editMode === 'connect')
                }"
                @mousedown.stop="onNodeMouseDown($event, node)"
                @click.stop="onNodeClick(node)"
              >
                <rect 
                  :width="node.width"
                  :height="node.height"
                  :rx="8"
                  :ry="8"
                  :fill="getNodeFill(node.type)"
                  :stroke="selectedNode?.id === node.id ? '#409EFF' : (connectingFrom?.id === node.id ? '#67C23A' : getNodeStroke(node.type))"
                  :stroke-width="selectedNode?.id === node.id ? 3 : (connectingFrom?.id === node.id ? 3 : 2)"
                  filter="url(#shadow)"
                />
                
                <rect 
                  :width="node.width"
                  height="36"
                  :rx="8"
                  :ry="8"
                  :fill="getNodeHeaderFill(node.type)"
                  style="border-radius: 8px 8px 0 0;"
                />
                <rect 
                  :width="node.width"
                  height="36"
                  :fill="getNodeHeaderFill(node.type)"
                  y="0"
                  style="clip-path: inset(0 0 round 8px 8px 0 0);"
                />

                <text 
                  :x="node.width / 2" 
                  y="24" 
                  text-anchor="middle" 
                  class="node-title"
                  :fill="getNodeTextColor(node.type)"
                >
                  {{ getNodeIcon(node.type) }} {{ node.title }}
                </text>

                <text 
                  :x="node.width / 2" 
                  y="55" 
                  text-anchor="middle" 
                  class="node-subtitle"
                >
                  {{ node.subtitle }}
                </text>

                <text 
                  v-for="(detail, idx) in node.details"
                  :key="idx"
                  :x="node.width / 2" 
                  :y="75 + idx * 18" 
                  text-anchor="middle" 
                  class="node-detail"
                >
                  {{ detail }}
                </text>

                <g 
                  v-if="selectedNode?.id === node.id" 
                  class="node-resize-handles"
                >
                  <circle 
                    :cx="node.width" 
                    :cy="node.height" 
                    r="6" 
                    fill="#409EFF" 
                    stroke="#fff"
                    stroke-width="2"
                    class="resize-handle"
                    @mousedown.stop="onResizeStart($event, node)"
                  />
                </g>
              </g>
            </g>
          </svg>
        </div>
      </div>
    </el-card>

    <el-dialog 
      v-model="addNodeDialogVisible" 
      title="新增资源节点"
      width="500px"
    >
      <el-form :model="newNodeForm" label-width="100px">
        <el-form-item label="资源类型" required>
          <el-select v-model="newNodeForm.type" placeholder="请选择资源类型" style="width: 100%;">
            <el-option 
              v-for="(config, type) in nodeTypeConfig" 
              :key="type" 
              :label="config.name" 
              :value="type"
            >
              <span>{{ config.icon }} {{ config.name }}</span>
            </el-option>
          </el-select>
        </el-form-item>
        <el-form-item label="资源名称" required>
          <el-input v-model="newNodeForm.title" placeholder="请输入资源名称" />
        </el-form-item>
        <el-form-item label="副标题">
          <el-input v-model="newNodeForm.subtitle" placeholder="请输入副标题（可选）" />
        </el-form-item>
        <el-form-item label="ARN/ID">
          <el-input v-model="newNodeForm.arn" placeholder="请输入 ARN 或 ID（可选）" />
        </el-form-item>
        <el-form-item label="描述详情">
          <el-input 
            v-model="newNodeForm.detailsText" 
            type="textarea" 
            :rows="3" 
            placeholder="每行一个详情项（可选）"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="addNodeDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="addNewNode">确定</el-button>
      </template>
    </el-dialog>

    <el-dialog 
      v-model="editConnectionDialogVisible" 
      title="编辑连接线"
      width="400px"
    >
      <el-form :model="editConnectionForm" label-width="100px" v-if="selectedConnection">
        <el-form-item label="起点">
          <el-tag>{{ getNodeById(selectedConnection.from)?.title || '未知' }}</el-tag>
        </el-form-item>
        <el-form-item label="终点">
          <el-tag>{{ getNodeById(selectedConnection.to)?.title || '未知' }}</el-tag>
        </el-form-item>
        <el-form-item label="线条颜色">
          <el-color-picker v-model="editConnectionForm.color" />
        </el-form-item>
        <el-form-item label="线条宽度">
          <el-slider v-model="editConnectionForm.width" :min="1" :max="6" :step="1" show-input />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="editConnectionDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="saveConnectionEdit">保存</el-button>
      </template>
    </el-dialog>

    <el-drawer 
      v-model="detailDrawerVisible" 
      :title="selectedNode ? '编辑资源 - ' + selectedNode.title : '资源详情'"
      direction="right"
      size="450px"
    >
      <div class="resource-detail" v-if="selectedNode">
        <el-descriptions :column="1" border>
          <el-descriptions-item label="资源类型">
            <el-tag :type="getNodeTagType(selectedNode.type)">
              {{ getNodeIcon(selectedNode.type) }} {{ getNodeTypeName(selectedNode.type) }}
            </el-tag>
          </el-descriptions-item>
        </el-descriptions>

        <el-divider>基本信息</el-divider>
        <el-form :model="selectedNode" label-width="100px">
          <el-form-item label="资源名称">
            <el-input v-model="selectedNode.title" placeholder="请输入资源名称" />
          </el-form-item>
          <el-form-item label="副标题">
            <el-input v-model="selectedNode.subtitle" placeholder="请输入副标题" />
          </el-form-item>
          <el-form-item label="ARN / ID">
            <el-input 
              v-model="selectedNode.arn" 
              placeholder="请输入 ARN 或 ID"
              type="textarea"
              :rows="2"
            />
          </el-form-item>
          <el-form-item label="详情列表">
            <div class="details-editor">
              <div 
                v-for="(detail, idx) in selectedNode.details" 
                :key="idx"
                class="detail-item"
              >
                <el-input 
                  v-model="selectedNode.details[idx]" 
                  size="small"
                  style="flex: 1;"
                />
                <el-button 
                  type="danger" 
                  size="small" 
                  :icon="Delete"
                  @click="removeDetail(idx)"
                />
              </div>
              <el-button 
                type="primary" 
                size="small" 
                :icon="Plus"
                @click="addDetail"
                plain
              >
                添加详情
              </el-button>
            </div>
          </el-form-item>
        </el-form>

        <el-divider>位置和尺寸</el-divider>
        <el-form label-width="100px">
          <el-form-item label="X 坐标">
            <el-input-number 
              v-model="selectedNode.x" 
              :min="0" 
              :max="5000"
              @change="onNodePositionChange"
            />
          </el-form-item>
          <el-form-item label="Y 坐标">
            <el-input-number 
              v-model="selectedNode.y" 
              :min="0" 
              :max="5000"
              @change="onNodePositionChange"
            />
          </el-form-item>
          <el-form-item label="宽度">
            <el-input-number 
              v-model="selectedNode.width" 
              :min="100" 
              :max="500"
              :step="50"
            />
          </el-form-item>
          <el-form-item label="高度">
            <el-input-number 
              v-model="selectedNode.height" 
              :min="60" 
              :max="300"
              :step="20"
            />
          </el-form-item>
        </el-form>

        <el-divider>元数据</el-divider>
        <div class="metadata-section">
          <pre class="metadata-json">{{ JSON.stringify(selectedNode.rawData || {}, null, 2) }}</pre>
        </div>

        <el-divider>操作</el-divider>
        <div class="detail-actions">
          <el-button type="danger" @click="handleDeleteNode(selectedNode)">
            <el-icon><Delete /></el-icon>
            删除此资源
          </el-button>
        </div>
      </div>
    </el-drawer>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, reactive } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { 
  Share, Download, Picture, Refresh, Search, Link, Document,
  ZoomIn, ZoomOut, FullScreen, Plus, Delete, Mouse, Connection
} from '@element-plus/icons-vue'
import { useAwsEnvironmentsStore } from '@/stores/aws-environments'

const awsEnvironmentsStore = useAwsEnvironmentsStore()

const selectedEnv = ref('')
const ecsServiceArn = ref('')
const isLoadingEnv = ref(false)
const isCollecting = ref(false)
const errorMessage = ref('')

const resourceNodes = ref([])
const connections = ref([])
const selectedNode = ref(null)
const selectedConnection = ref(null)
const draggingNode = ref(null)
const dragOffset = ref({ x: 0, y: 0 })
const isDragging = ref(false)
const isResizing = ref(false)
const detailDrawerVisible = ref(false)

const editMode = ref('select')
const connectingFrom = ref(null)

const addNodeDialogVisible = ref(false)
const editConnectionDialogVisible = ref(false)

const newNodeForm = reactive({
  type: 'ecs_service',
  title: '',
  subtitle: '',
  arn: '',
  detailsText: ''
})

const editConnectionForm = reactive({
  color: '#909399',
  width: 2
})

const canvasWidth = ref(1200)
const canvasHeight = ref(800)
const scale = ref(1)

const diagramContainerRef = ref(null)
const svgRef = ref(null)

const envs = computed(() => awsEnvironmentsStore.environments)
const hasResources = computed(() => resourceNodes.value.length > 0)

const nodeTypeConfig = {
  ecs_cluster: {
    fill: '#FFF7ED',
    stroke: '#F59E0B',
    headerFill: '#F59E0B',
    textColor: '#FFFFFF',
    tagType: 'warning',
    name: 'ECS 集群',
    icon: '🗄️'
  },
  ecs_service: {
    fill: '#EFF6FF',
    stroke: '#3B82F6',
    headerFill: '#3B82F6',
    textColor: '#FFFFFF',
    tagType: 'primary',
    name: 'ECS 服务',
    icon: '⚙️'
  },
  ecs_task: {
    fill: '#ECFDF5',
    stroke: '#10B981',
    headerFill: '#10B981',
    textColor: '#FFFFFF',
    tagType: 'success',
    name: 'ECS 任务',
    icon: '📦'
  },
  container: {
    fill: '#F0FDF4',
    stroke: '#22C55E',
    headerFill: '#22C55E',
    textColor: '#FFFFFF',
    tagType: 'success',
    name: '容器',
    icon: '🐳'
  },
  alb: {
    fill: '#FDF4FF',
    stroke: '#D946EF',
    headerFill: '#D946EF',
    textColor: '#FFFFFF',
    tagType: 'danger',
    name: '应用负载均衡器',
    icon: '⚖️'
  },
  target_group: {
    fill: '#FAF5FF',
    stroke: '#A855F7',
    headerFill: '#A855F7',
    textColor: '#FFFFFF',
    tagType: '',
    name: '目标组',
    icon: '🎯'
  },
  rds: {
    fill: '#FEF3C7',
    stroke: '#D97706',
    headerFill: '#D97706',
    textColor: '#FFFFFF',
    tagType: 'warning',
    name: 'RDS 数据库',
    icon: '🗄️'
  },
  redis: {
    fill: '#FEE2E2',
    stroke: '#DC2626',
    headerFill: '#DC2626',
    textColor: '#FFFFFF',
    tagType: 'danger',
    name: 'ElastiCache Redis',
    icon: '💾'
  },
  s3: {
    fill: '#E0F2FE',
    stroke: '#0284C7',
    headerFill: '#0284C7',
    textColor: '#FFFFFF',
    tagType: 'info',
    name: 'S3 存储桶',
    icon: '🪣'
  },
  cloudwatch: {
    fill: '#F1F5F9',
    stroke: '#475569',
    headerFill: '#475569',
    textColor: '#FFFFFF',
    tagType: 'info',
    name: 'CloudWatch',
    icon: '📊'
  },
  vpc: {
    fill: '#ECFEFF',
    stroke: '#06B6D4',
    headerFill: '#06B6D4',
    textColor: '#FFFFFF',
    tagType: 'info',
    name: 'VPC',
    icon: '🌐'
  },
  subnet: {
    fill: '#F0FDFA',
    stroke: '#14B8A6',
    headerFill: '#14B8A6',
    textColor: '#FFFFFF',
    tagType: 'success',
    name: '子网',
    icon: '🔌'
  },
  security_group: {
    fill: '#FEFCE8',
    stroke: '#CA8A04',
    headerFill: '#CA8A04',
    textColor: '#FFFFFF',
    tagType: 'warning',
    name: '安全组',
    icon: '🔒'
  }
}

const getNodeFill = (type) => nodeTypeConfig[type]?.fill || '#F5F7FA'
const getNodeStroke = (type) => nodeTypeConfig[type]?.stroke || '#909399'
const getNodeHeaderFill = (type) => nodeTypeConfig[type]?.headerFill || '#409EFF'
const getNodeTextColor = (type) => nodeTypeConfig[type]?.textColor || '#FFFFFF'
const getNodeTagType = (type) => nodeTypeConfig[type]?.tagType || 'info'
const getNodeTypeName = (type) => nodeTypeConfig[type]?.name || '未知资源'
const getNodeIcon = (type) => nodeTypeConfig[type]?.icon || '📦'

const getNodeById = (id) => {
  return resourceNodes.value.find(n => n.id === id) || null
}

const loadEnvironments = async () => {
  isLoadingEnv.value = true
  try {
    await awsEnvironmentsStore.fetchEnvironments()
    if (awsEnvironmentsStore.selectedEnvironment) {
      selectedEnv.value = awsEnvironmentsStore.selectedEnvironment.name
    }
  } catch (error) {
    console.error('加载环境列表失败:', error)
  } finally {
    isLoadingEnv.value = false
  }
}

const parseEcsArn = (arn) => {
  const parts = arn.split(':')
  if (parts.length < 6) return null
  
  const resourceParts = parts[5].split('/')
  return {
    region: parts[3],
    accountId: parts[4],
    clusterName: resourceParts[1] || '',
    serviceName: resourceParts[2] || ''
  }
}

const collectResources = async () => {
  if (!selectedEnv.value) {
    ElMessage.warning('请选择 AWS 环境')
    return
  }
  
  if (!ecsServiceArn.value) {
    ElMessage.warning('请输入 ECS 服务 ARN')
    return
  }

  const arnInfo = parseEcsArn(ecsServiceArn.value)
  if (!arnInfo) {
    ElMessage.error('无效的 ECS 服务 ARN 格式')
    return
  }

  isCollecting.value = true
  errorMessage.value = ''

  try {
    const response = await axios.get('/api/aws/collect-resources', {
      params: {
        env: selectedEnv.value,
        ecs_service_arn: ecsServiceArn.value
      }
    })

    if (response.data.status === 'success') {
      const resources = response.data.data
      processResources(resources)
      ElMessage.success(`成功采集 ${resourceNodes.value.length} 个资源`)
    } else {
      errorMessage.value = response.data.message || '采集资源失败'
      ElMessage.error(errorMessage.value)
    }
  } catch (error) {
    console.error('采集资源失败:', error)
    if (error.response) {
      errorMessage.value = error.response.data?.message || 'API 调用失败'
    } else {
      errorMessage.value = '网络错误，请检查后端服务是否可用。您可以点击"加载示例数据"查看功能演示。'
    }
    ElMessage.error(errorMessage.value)
  } finally {
    isCollecting.value = false
  }
}

let nextNodeId = 1
let nextConnId = 1

const processResources = (resources) => {
  const nodes = []
  const conns = []
  let nodeId = 0
  let connId = 0

  const addNode = (type, title, subtitle, details, arn, rawData = {}) => {
    const node = {
      id: `node-${++nodeId}`,
      type,
      title,
      subtitle,
      details: details || [],
      arn,
      rawData,
      x: 0,
      y: 0,
      width: 200,
      height: 100
    }
    nodes.push(node)
    return node
  }

  const addConnection = (fromNode, toNode, color = null) => {
    if (!fromNode || !toNode) return
    const conn = {
      id: `conn-${++connId}`,
      from: fromNode.id,
      to: toNode.id,
      x1: fromNode.x + fromNode.width / 2,
      y1: fromNode.y + fromNode.height,
      x2: toNode.x + toNode.width / 2,
      y2: toNode.y,
      color,
      width: 2,
      highlighted: false,
      hovered: false
    }
    conns.push(conn)
    return conn
  }

  if (resources.vpc) {
    addNode('vpc', resources.vpc.name || 'VPC', resources.vpc.id, [], resources.vpc.arn, resources.vpc)
  }

  if (resources.subnets && resources.subnets.length > 0) {
    resources.subnets.forEach(subnet => {
      addNode('subnet', subnet.name || 'Subnet', subnet.id, 
        [`可用区: ${subnet.availabilityZone || 'N/A'}`], subnet.arn, subnet)
    })
  }

  if (resources.securityGroups && resources.securityGroups.length > 0) {
    resources.securityGroups.forEach(sg => {
      addNode('security_group', sg.name || 'Security Group', sg.id, 
        [`入站规则: ${sg.inboundRules || 0}`, `出站规则: ${sg.outboundRules || 0}`], sg.id, sg)
    })
  }

  if (resources.cluster) {
    addNode('ecs_cluster', resources.cluster.name || 'ECS Cluster', 
      `状态: ${resources.cluster.status || 'N/A'}`, 
      [`服务数: ${resources.cluster.services || 0}`, `任务数: ${resources.cluster.tasks || 0}`],
      resources.cluster.arn, resources.cluster)
  }

  if (resources.service) {
    addNode('ecs_service', resources.service.name || 'ECS Service',
      `期望任务数: ${resources.service.desiredCount || 0}`,
      [`运行中: ${resources.service.runningCount || 0}`, `待处理: ${resources.service.pendingCount || 0}`],
      resources.service.arn, resources.service)
  }

  if (resources.tasks && resources.tasks.length > 0) {
    resources.tasks.slice(0, 3).forEach((task, idx) => {
      addNode('ecs_task', `Task ${idx + 1}`, task.lastStatus || 'UNKNOWN',
        [`CPU: ${task.cpu || 'N/A'}`, `内存: ${task.memory || 'N/A'}`],
        task.taskArn, task)
    })
    if (resources.tasks.length > 3) {
      addNode('ecs_task', `+${resources.tasks.length - 3} 更多任务`, '...', [], '', { total: resources.tasks.length })
    }
  }

  if (resources.containers && resources.containers.length > 0) {
    resources.containers.slice(0, 3).forEach((container, idx) => {
      addNode('container', container.name || `Container ${idx + 1}`,
        `镜像: ${container.image?.split('/').pop() || 'N/A'}`,
        [`状态: ${container.lastStatus || 'N/A'}`],
        '', container)
    })
  }

  if (resources.loadBalancers && resources.loadBalancers.length > 0) {
    resources.loadBalancers.forEach(lb => {
      addNode('alb', lb.name || 'Load Balancer', lb.type || 'application',
        [`DNS: ${lb.dnsName?.substring(0, 30) || 'N/A'}...`, `状态: ${lb.state || 'N/A'}`],
        lb.arn, lb)
    })
  }

  if (resources.targetGroups && resources.targetGroups.length > 0) {
    resources.targetGroups.forEach(tg => {
      addNode('target_group', tg.name || 'Target Group', tg.protocol || 'HTTP',
        [`端口: ${tg.port || 80}`, `目标类型: ${tg.targetType || 'instance'}`],
        tg.arn, tg)
    })
  }

  if (resources.databases && resources.databases.length > 0) {
    resources.databases.forEach(db => {
      addNode('rds', db.name || 'RDS Database', db.engine || 'MySQL',
        [`实例类: ${db.instanceClass || 'N/A'}`, `状态: ${db.status || 'N/A'}`],
        db.arn, db)
    })
  }

  if (resources.caches && resources.caches.length > 0) {
    resources.caches.forEach(cache => {
      addNode('redis', cache.name || 'ElastiCache', cache.engine || 'redis',
        [`节点数: ${cache.nodeCount || 1}`, `状态: ${cache.status || 'N/A'}`],
        cache.arn, cache)
    })
  }

  if (resources.buckets && resources.buckets.length > 0) {
    resources.buckets.slice(0, 3).forEach(bucket => {
      addNode('s3', bucket.name || 'S3 Bucket', '对象存储',
        [`区域: ${bucket.region || 'N/A'}`],
        bucket.arn || '', bucket)
    })
  }

  if (resources.cloudWatch) {
    addNode('cloudwatch', 'CloudWatch', '监控与日志',
      [`日志组: ${resources.cloudWatch.logGroups || 0}`, `告警: ${resources.cloudWatch.alarms || 0}`],
      '', resources.cloudWatch)
  }

  layoutNodes(nodes)
  createConnections(nodes, conns)

  nextNodeId = nodeId + 1
  nextConnId = connId + 1

  resourceNodes.value = nodes
  connections.value = conns
  adjustCanvasSize()
}

const layoutNodes = (nodes) => {
  const typeOrder = [
    'vpc',
    'subnet', 'security_group',
    'alb',
    'target_group',
    'ecs_cluster',
    'ecs_service',
    'ecs_task',
    'container',
    'rds', 'redis', 's3',
    'cloudwatch'
  ]

  const grouped = {}
  typeOrder.forEach(type => grouped[type] = [])
  nodes.forEach(node => {
    if (!grouped[node.type]) grouped[node.type] = []
    grouped[node.type].push(node)
  })

  let currentY = 40
  const columnWidth = 240
  const rowHeight = 140
  const paddingX = 40
  const maxPerRow = 3

  typeOrder.forEach(type => {
    const typeNodes = grouped[type]
    if (typeNodes.length === 0) return

    const rows = Math.ceil(typeNodes.length / maxPerRow)
    let rowIdx = 0
    let colIdx = 0

    typeNodes.forEach((node, idx) => {
      colIdx = idx % maxPerRow
      rowIdx = Math.floor(idx / maxPerRow)

      node.x = paddingX + colIdx * columnWidth
      node.y = currentY + rowIdx * rowHeight
    })

    currentY += rows * rowHeight + 40
  })
}

const createConnections = (nodes, conns) => {
  const getNodesByType = (type) => nodes.filter(n => n.type === type)
  
  const ecsCluster = nodes.find(n => n.type === 'ecs_cluster')
  const ecsService = nodes.find(n => n.type === 'ecs_service')
  const ecsTasks = getNodesByType('ecs_task')
  const containers = getNodesByType('container')
  const albs = getNodesByType('alb')
  const targetGroups = getNodesByType('target_group')
  const rds = getNodesByType('rds')
  const redis = getNodesByType('redis')
  const s3 = getNodesByType('s3')

  const addConnectionWithCoords = (from, to, color) => {
    if (!from || !to) return
    conns.push({
      id: `conn-${conns.length + 1}`,
      from: from.id,
      to: to.id,
      x1: from.x + from.width / 2,
      y1: from.y + from.height,
      x2: to.x + to.width / 2,
      y2: to.y,
      color,
      width: 2,
      highlighted: false,
      hovered: false
    })
  }

  if (ecsCluster && ecsService) {
    addConnectionWithCoords(ecsCluster, ecsService, '#3B82F6')
  }

  if (ecsService && ecsTasks.length > 0) {
    ecsTasks.forEach(task => {
      addConnectionWithCoords(ecsService, task, '#10B981')
    })
  }

  if (ecsTasks.length > 0 && containers.length > 0) {
    const tasksToConnect = Math.min(ecsTasks.length, containers.length)
    for (let i = 0; i < tasksToConnect; i++) {
      addConnectionWithCoords(ecsTasks[i], containers[i], '#22C55E')
    }
  }

  if (albs.length > 0 && targetGroups.length > 0) {
    albs.forEach(alb => {
      targetGroups.forEach(tg => {
        addConnectionWithCoords(alb, tg, '#D946EF')
      })
    })
  }

  if (targetGroups.length > 0 && ecsService) {
    targetGroups.forEach(tg => {
      addConnectionWithCoords(tg, ecsService, '#A855F7')
    })
  }

  if (ecsTasks.length > 0) {
    const mainTask = ecsTasks[0]
    rds.forEach(db => {
      addConnectionWithCoords(mainTask, db, '#D97706')
    })
    redis.forEach(cache => {
      addConnectionWithCoords(mainTask, cache, '#DC2626')
    })
    s3.forEach(bucket => {
      addConnectionWithCoords(mainTask, bucket, '#0284C7')
    })
  }
}

const loadSampleData = () => {
  const sampleResources = {
    vpc: { name: 'production-vpc', id: 'vpc-0abc123def456', arn: 'arn:aws:ec2:us-east-1:123456789012:vpc/vpc-0abc123def456' },
    subnets: [
      { name: 'subnet-public-1a', id: 'subnet-01234567', availabilityZone: 'us-east-1a', arn: 'arn:aws:ec2:us-east-1:123456789012:subnet/subnet-01234567' },
      { name: 'subnet-public-1b', id: 'subnet-76543210', availabilityZone: 'us-east-1b', arn: 'arn:aws:ec2:us-east-1:123456789012:subnet/subnet-76543210' }
    ],
    securityGroups: [
      { name: 'web-sg', id: 'sg-0abcdef123456', inboundRules: 5, outboundRules: 3 },
      { name: 'db-sg', id: 'sg-654321fedcba', inboundRules: 2, outboundRules: 1 }
    ],
    cluster: { name: 'production-cluster', status: 'ACTIVE', services: 5, tasks: 12, arn: 'arn:aws:ecs:us-east-1:123456789012:cluster/production-cluster' },
    service: { 
      name: 'web-service', 
      desiredCount: 3, 
      runningCount: 3, 
      pendingCount: 0,
      arn: 'arn:aws:ecs:us-east-1:123456789012:service/production-cluster/web-service'
    },
    tasks: [
      { lastStatus: 'RUNNING', cpu: '256', memory: '512', taskArn: 'arn:aws:ecs:us-east-1:123456789012:task/production-cluster/abc123' },
      { lastStatus: 'RUNNING', cpu: '256', memory: '512', taskArn: 'arn:aws:ecs:us-east-1:123456789012:task/production-cluster/def456' },
      { lastStatus: 'RUNNING', cpu: '256', memory: '512', taskArn: 'arn:aws:ecs:us-east-1:123456789012:task/production-cluster/ghi789' },
      { lastStatus: 'RUNNING', cpu: '256', memory: '512', taskArn: 'arn:aws:ecs:us-east-1:123456789012:task/production-cluster/jkl012' }
    ],
    containers: [
      { name: 'nginx', image: 'nginx:1.21-alpine', lastStatus: 'RUNNING' },
      { name: 'app', image: 'myapp:v2.3.1', lastStatus: 'RUNNING' },
      { name: 'sidecar', image: 'envoy:v1.20', lastStatus: 'RUNNING' }
    ],
    loadBalancers: [
      { name: 'web-alb', type: 'application', dnsName: 'web-alb-1234567890.us-east-1.elb.amazonaws.com', state: 'active', arn: 'arn:aws:elasticloadbalancing:us-east-1:123456789012:loadbalancer/app/web-alb/abc123' }
    ],
    targetGroups: [
      { name: 'web-target-group', protocol: 'HTTP', port: 80, targetType: 'ip', arn: 'arn:aws:elasticloadbalancing:us-east-1:123456789012:targetgroup/web-target-group/def456' }
    ],
    databases: [
      { name: 'production-db', engine: 'aurora-mysql', instanceClass: 'db.r5.large', status: 'available', arn: 'arn:aws:rds:us-east-1:123456789012:cluster:production-db' }
    ],
    caches: [
      { name: 'session-cache', engine: 'redis', nodeCount: 2, status: 'available', arn: 'arn:aws:elasticache:us-east-1:123456789012:cluster:session-cache' }
    ],
    buckets: [
      { name: 'prod-assets-123456', region: 'us-east-1', arn: 'arn:aws:s3:::prod-assets-123456' },
      { name: 'prod-logs-654321', region: 'us-east-1', arn: 'arn:aws:s3:::prod-logs-654321' }
    ],
    cloudWatch: { logGroups: 15, alarms: 8 }
  }

  processResources(sampleResources)
  ElMessage.success('示例数据加载成功')
}

const adjustCanvasSize = () => {
  if (resourceNodes.value.length === 0) return

  let maxX = 800
  let maxY = 600

  resourceNodes.value.forEach(node => {
    maxX = Math.max(maxX, node.x + node.width + 40)
    maxY = Math.max(maxY, node.y + node.height + 40)
  })

  canvasWidth.value = maxX
  canvasHeight.value = maxY
}

const onNodeMouseDown = (event, node) => {
  if (editMode.value === 'select') {
    selectedNode.value = node
    draggingNode.value = node
    isDragging.value = true
    dragOffset.value = {
      x: event.offsetX - node.x,
      y: event.offsetY - node.y
    }
    selectedConnection.value = null
    connections.value.forEach(c => c.highlighted = false)
    detailDrawerVisible.value = true
  }
}

const onNodeClick = (node) => {
  if (editMode.value === 'connect') {
    if (!connectingFrom.value) {
      connectingFrom.value = node
      ElMessage.info(`已选择起点: ${node.title}，请点击终点节点`)
    } else if (connectingFrom.value.id !== node.id) {
      const exists = connections.value.some(
        c => (c.from === connectingFrom.value.id && c.to === node.id) ||
             (c.from === node.id && c.to === connectingFrom.value.id)
      )
      
      if (exists) {
        ElMessage.warning('这两个节点之间已经存在连接')
      } else {
        const newConn = {
          id: `conn-${nextConnId++}`,
          from: connectingFrom.value.id,
          to: node.id,
          x1: connectingFrom.value.x + connectingFrom.value.width / 2,
          y1: connectingFrom.value.y + connectingFrom.value.height,
          x2: node.x + node.width / 2,
          y2: node.y,
          color: '#909399',
          width: 2,
          highlighted: false,
          hovered: false
        }
        connections.value.push(newConn)
        ElMessage.success('连接创建成功')
      }
      connectingFrom.value = null
    } else {
      connectingFrom.value = null
    }
  }
}

const onConnectionClick = (conn) => {
  if (editMode.value === 'select') {
    selectedConnection.value = conn
    selectedNode.value = null
    connections.value.forEach(c => c.highlighted = c.id === conn.id)
    detailDrawerVisible.value = false
    
    editConnectionForm.color = conn.color || '#909399'
    editConnectionForm.width = conn.width || 2
    editConnectionDialogVisible.value = true
  }
}

const saveConnectionEdit = () => {
  if (selectedConnection.value) {
    selectedConnection.value.color = editConnectionForm.color
    selectedConnection.value.width = editConnectionForm.width
    editConnectionDialogVisible.value = false
    ElMessage.success('连接线已更新')
  }
}

const onCanvasMouseDown = (event) => {
  if (editMode.value === 'select') {
    if (event.target === svgRef.value || 
        event.target.classList.contains('diagram-svg') ||
        event.target.tagName.toLowerCase() === 'rect') {
      selectedNode.value = null
      selectedConnection.value = null
      detailDrawerVisible.value = false
      connections.value.forEach(c => c.highlighted = false)
    }
    connectingFrom.value = null
  }
}

const onCanvasMouseMove = (event) => {
  if (!isDragging.value || !draggingNode.value) return

  const rect = event.currentTarget.getBoundingClientRect()
  const x = (event.clientX - rect.left) / scale.value - dragOffset.value.x
  const y = (event.clientY - rect.top) / scale.value - dragOffset.value.y

  draggingNode.value.x = Math.max(0, x)
  draggingNode.value.y = Math.max(0, y)

  updateConnectionCoords(draggingNode.value)
}

const onCanvasMouseUp = () => {
  if (isDragging.value && draggingNode.value) {
    adjustCanvasSize()
  }
  draggingNode.value = null
  isDragging.value = false
}

const onResizeStart = (event, node) => {
  event.stopPropagation()
  isResizing.value = true
}

const updateConnectionCoords = (node) => {
  connections.value.forEach(conn => {
    if (conn.from === node.id) {
      conn.x1 = node.x + node.width / 2
      conn.y1 = node.y + node.height
    }
    if (conn.to === node.id) {
      conn.x2 = node.x + node.width / 2
      conn.y2 = node.y
    }
  })
}

const onNodePositionChange = () => {
  if (selectedNode.value) {
    updateConnectionCoords(selectedNode.value)
    adjustCanvasSize()
  }
}

const zoomIn = () => {
  scale.value = Math.min(scale.value + 0.1, 2)
}

const zoomOut = () => {
  scale.value = Math.max(scale.value - 0.1, 0.3)
}

const resetZoom = () => {
  scale.value = 1
}

const resetDiagram = () => {
  resourceNodes.value = []
  connections.value = []
  selectedNode.value = null
  selectedConnection.value = null
  connectingFrom.value = null
  detailDrawerVisible.value = false
  editConnectionDialogVisible.value = false
  errorMessage.value = ''
  scale.value = 1
  editMode.value = 'select'
}

const openAddNodeDialog = () => {
  newNodeForm.type = 'ecs_service'
  newNodeForm.title = ''
  newNodeForm.subtitle = ''
  newNodeForm.arn = ''
  newNodeForm.detailsText = ''
  addNodeDialogVisible.value = true
}

const addNewNode = () => {
  if (!newNodeForm.type || !newNodeForm.title) {
    ElMessage.warning('请填写资源类型和名称')
    return
  }

  let maxX = 0
  let maxY = 0
  resourceNodes.value.forEach(node => {
    maxX = Math.max(maxX, node.x)
    maxY = Math.max(maxY, node.y)
  })

  const details = newNodeForm.detailsText 
    ? newNodeForm.detailsText.split('\n').filter(d => d.trim())
    : []

  const newNode = {
    id: `node-${nextNodeId++}`,
    type: newNodeForm.type,
    title: newNodeForm.title,
    subtitle: newNodeForm.subtitle || '',
    details,
    arn: newNodeForm.arn || '',
    rawData: {},
    x: maxX + 50,
    y: maxY + 50,
    width: 200,
    height: 100
  }

  resourceNodes.value.push(newNode)
  addNodeDialogVisible.value = false
  adjustCanvasSize()
  ElMessage.success('资源节点添加成功')
}

const handleDeleteSelected = async () => {
  if (selectedNode.value) {
    await handleDeleteNode(selectedNode.value)
  } else if (selectedConnection.value) {
    await handleDeleteConnection(selectedConnection.value)
  }
}

const handleDeleteNode = async (node) => {
  try {
    await ElMessageBox.confirm(
      `确定要删除资源 "${node.title}" 吗？所有相关的连接线也会被删除。`,
      '确认删除',
      {
        confirmButtonText: '确认删除',
        cancelButtonText: '取消',
        type: 'warning'
      }
    )

    connections.value = connections.value.filter(
      c => c.from !== node.id && c.to !== node.id
    )

    resourceNodes.value = resourceNodes.value.filter(n => n.id !== node.id)
    
    if (selectedNode.value?.id === node.id) {
      selectedNode.value = null
      detailDrawerVisible.value = false
    }

    adjustCanvasSize()
    ElMessage.success('资源已删除')
  } catch (error) {
    if (error !== 'cancel') {
      console.error('删除失败:', error)
    }
  }
}

const handleDeleteConnection = async (conn) => {
  try {
    const fromNode = getNodeById(conn.from)
    const toNode = getNodeById(conn.to)
    
    await ElMessageBox.confirm(
      `确定要删除从 "${fromNode?.title || '未知'}" 到 "${toNode?.title || '未知'}" 的连接线吗？`,
      '确认删除',
      {
        confirmButtonText: '确认删除',
        cancelButtonText: '取消',
        type: 'warning'
      }
    )

    connections.value = connections.value.filter(c => c.id !== conn.id)
    selectedConnection.value = null
    editConnectionDialogVisible.value = false
    ElMessage.success('连接线已删除')
  } catch (error) {
    if (error !== 'cancel') {
      console.error('删除失败:', error)
    }
  }
}

const addDetail = () => {
  if (selectedNode.value) {
    if (!selectedNode.value.details) {
      selectedNode.value.details = []
    }
    selectedNode.value.details.push('')
  }
}

const removeDetail = (idx) => {
  if (selectedNode.value && selectedNode.value.details) {
    selectedNode.value.details.splice(idx, 1)
  }
}

const downloadAsSVG = () => {
  if (!svgRef.value) return
  
  const svgData = new XMLSerializer().serializeToString(svgRef.value)
  const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' })
  const url = URL.createObjectURL(svgBlob)
  
  const link = document.createElement('a')
  link.href = url
  link.download = `architecture-diagram-${Date.now()}.svg`
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
  
  ElMessage.success('SVG 下载成功')
}

const downloadAsPNG = () => {
  if (!svgRef.value) return
  
  const svgData = new XMLSerializer().serializeToString(svgRef.value)
  const canvas = document.createElement('canvas')
  const ctx = canvas.getContext('2d')
  
  canvas.width = canvasWidth.value
  canvas.height = canvasHeight.value
  ctx.fillStyle = '#FFFFFF'
  ctx.fillRect(0, 0, canvas.width, canvas.height)
  
  const img = new Image()
  const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' })
  const url = URL.createObjectURL(svgBlob)
  
  img.onload = () => {
    ctx.drawImage(img, 0, 0)
    const pngUrl = canvas.toDataURL('image/png')
    const link = document.createElement('a')
    link.href = pngUrl
    link.download = `architecture-diagram-${Date.now()}.png`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
    ElMessage.success('PNG 下载成功')
  }
  
  img.onerror = () => {
    ElMessage.error('PNG 导出失败，请尝试 SVG 格式')
    URL.revokeObjectURL(url)
  }
  
  img.src = url
}

onMounted(() => {
  loadEnvironments()
})
</script>

<style scoped>
.architecture-visualizer-page {
  min-height: 100%;
}

.page-header-card,
.input-card,
.editor-toolbar-card,
.diagram-card {
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
  gap: 12px;
}

.input-section {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.input-row {
  display: flex;
  gap: 20px;
  flex-wrap: wrap;
}

.input-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
  flex: 1;
  min-width: 250px;
}

.input-label {
  font-size: 14px;
  font-weight: 500;
  color: #606266;
}

.env-select,
.arn-input {
  width: 100%;
}

.action-row {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
}

.editor-toolbar {
  display: flex;
  align-items: center;
  gap: 16px;
  flex-wrap: wrap;
}

.toolbar-section {
  display: flex;
  align-items: center;
  gap: 8px;
}

.toolbar-label {
  font-size: 14px;
  color: #606266;
  font-weight: 500;
}

.diagram-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 12px;
}

.diagram-hints {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.diagram-controls {
  display: flex;
  align-items: center;
  gap: 12px;
}

.zoom-level {
  font-size: 14px;
  color: #909399;
  min-width: 50px;
  text-align: center;
}

.diagram-container {
  width: 100%;
  height: 600px;
  overflow: auto;
  background-color: #f5f7fa;
  border: 1px solid #ebeef5;
  border-radius: 4px;
  position: relative;
}

.canvas-wrapper {
  transform-origin: top left;
  cursor: grab;
}

.canvas-wrapper:active {
  cursor: grabbing;
}

.diagram-svg {
  background: linear-gradient(90deg, #f0f2f5 1px, transparent 1px),
              linear-gradient(#f0f2f5 1px, transparent 1px);
  background-size: 20px 20px;
  background-color: #fafafa;
}

.node-title {
  font-size: 14px;
  font-weight: 600;
  dominant-baseline: middle;
}

.node-subtitle {
  font-size: 12px;
  fill: #606266;
  dominant-baseline: middle;
}

.node-detail {
  font-size: 11px;
  fill: #909399;
  dominant-baseline: middle;
}

g {
  cursor: pointer;
  transition: transform 0.1s ease;
}

g:hover rect {
  filter: url(#shadow) brightness(0.98);
}

.node-selected rect {
  stroke-width: 3 !important;
}

.node-dragging {
  opacity: 0.8;
}

.node-connecting rect {
  stroke: #67C23A !important;
  stroke-width: 3 !important;
}

.connection-group {
  cursor: pointer;
}

.connection-handle {
  cursor: pointer;
}

.connection-highlight {
  stroke: #409EFF !important;
  stroke-width: 4 !important;
}

.resource-detail {
  padding: 16px;
}

.metadata-section {
  background-color: #f5f7fa;
  border-radius: 4px;
  padding: 12px;
  max-height: 300px;
  overflow: auto;
}

.metadata-json {
  font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
  font-size: 12px;
  margin: 0;
  white-space: pre-wrap;
  word-break: break-all;
}

.details-editor {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.detail-item {
  display: flex;
  gap: 8px;
  align-items: center;
}

.detail-actions {
  display: flex;
  justify-content: flex-start;
}

.env-name {
  margin-right: 8px;
}

.node-resize-handles {
  pointer-events: all;
}

.resize-handle {
  cursor: se-resize;
}

@media (max-width: 768px) {
  .page-header {
    flex-direction: column;
    align-items: flex-start;
  }
  
  .page-title {
    font-size: 18px;
  }
  
  .input-row {
    flex-direction: column;
  }
  
  .input-group {
    min-width: 100%;
  }
  
  .action-row {
    width: 100%;
  }
  
  .action-row .el-button {
    flex: 1;
  }
  
  .diagram-container {
    height: 400px;
  }
  
  .editor-toolbar {
    flex-direction: column;
    align-items: flex-start;
  }
}
</style>