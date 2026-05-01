<template>
  <div class="incident-investigation-page">
    <div class="page-header">
      <div class="header-left">
        <h2 class="page-title">事件调查详情</h2>
        <el-tag :type="incidentStatus.type" effect="plain" class="status-tag">
          {{ incidentStatus.text }}
        </el-tag>
      </div>
      <div class="header-right">
        <el-button size="small" @click="goToList">
          <el-icon><List /></el-icon>
          返回列表
        </el-button>
        <el-button size="small" type="primary" @click="goToLaunch">
          <el-icon><Plus /></el-icon>
          发起新调查
        </el-button>
        <el-button size="small" @click="handleRefresh">
          <el-icon><Refresh /></el-icon>
          刷新
        </el-button>
        <el-button size="small" type="success" @click="handleExport">
          <el-icon><Download /></el-icon>
          导出报告
        </el-button>
      </div>
    </div>

    <el-card class="incident-info-card">
      <el-row :gutter="24">
        <el-col :span="6">
          <div class="info-item">
            <span class="info-label">事件ID</span>
            <span class="info-value">{{ incidentData.incidentId }}</span>
          </div>
        </el-col>
        <el-col :span="6">
          <div class="info-item">
            <span class="info-label">发生时间</span>
            <span class="info-value">{{ incidentData.occurredAt }}</span>
          </div>
        </el-col>
        <el-col :span="6">
          <div class="info-item">
            <span class="info-label">影响服务</span>
            <span class="info-value">{{ incidentData.affectedService }}</span>
          </div>
        </el-col>
        <el-col :span="6">
          <div class="info-item">
            <span class="info-label">严重程度</span>
            <el-tag :type="severityTag.type" size="small">{{ severityTag.text }}</el-tag>
          </div>
        </el-col>
      </el-row>
    </el-card>

    <el-card class="section-card">
      <template #header>
        <div class="section-header">
          <span class="section-title">调查进度</span>
          <el-tag :type="progressStatus.type" size="small">{{ progressStatus.text }}</el-tag>
        </div>
      </template>
      
      <div class="progress-section">
        <el-steps :active="currentStep" align-center finish-status="success">
          <el-step title="调查" :description="stepDetails[0].status">
            <template #icon>
              <div class="step-icon" :class="stepDetails[0].iconClass">
                <el-icon><component :is="stepDetails[0].icon" /></el-icon>
              </div>
            </template>
          </el-step>
          <el-step title="根因分析" :description="stepDetails[1].status">
            <template #icon>
              <div class="step-icon" :class="stepDetails[1].iconClass">
                <el-icon><component :is="stepDetails[1].icon" /></el-icon>
              </div>
            </template>
          </el-step>
          <el-step title="修复建议" :description="stepDetails[2].status">
            <template #icon>
              <div class="step-icon" :class="stepDetails[2].iconClass">
                <el-icon><component :is="stepDetails[2].icon" /></el-icon>
              </div>
            </template>
          </el-step>
        </el-steps>
        
        <div class="progress-bar-wrapper">
          <el-progress 
            :percentage="progressPercentage" 
            :status="progressElStatus"
            :stroke-width="12"
            :text-inside="true"
          />
        </div>
      </div>
    </el-card>

    <el-row :gutter="24">
      <el-col :span="14">
        <el-card class="section-card">
          <template #header>
            <div class="section-header">
              <span class="section-title">推理时间线</span>
              <el-button type="text" size="small" @click="toggleTimelineView">
                {{ timelineView === 'full' ? '只看关键节点' : '查看完整时间线' }}
              </el-button>
            </div>
          </template>
          
          <el-timeline class="reasoning-timeline">
            <el-timeline-item
              v-for="(event, index) in filteredTimeline"
              :key="event.id"
              :timestamp="event.timestamp"
              :type="event.type"
              placement="top"
            >
              <el-card class="timeline-card" :class="event.highlight ? 'highlight' : ''">
                <div class="timeline-header">
                  <div class="timeline-title">
                    <el-icon v-if="event.icon" class="timeline-icon">
                      <component :is="event.icon" />
                    </el-icon>
                    <span>{{ event.title }}</span>
                  </div>
                  <el-tag v-if="event.duration" type="info" size="small">
                    耗时 {{ event.duration }}
                  </el-tag>
                </div>
                <div class="timeline-content">
                  <p>{{ event.description }}</p>
                  
                  <template v-if="event.details && event.details.length > 0">
                    <el-divider content-position="left">详细信息</el-divider>
                    <ul class="timeline-details">
                      <li v-for="(detail, dIdx) in event.details" :key="dIdx">
                        <el-icon><ArrowRight /></el-icon>
                        <span>{{ detail }}</span>
                      </li>
                    </ul>
                  </template>

                  <template v-if="event.logs && event.logs.length > 0">
                    <el-divider content-position="left">相关日志</el-divider>
                    <div class="timeline-logs">
                      <pre v-for="(log, lIdx) in event.logs" :key="lIdx">{{ log }}</pre>
                    </div>
                  </template>

                  <template v-if="event.suggestions && event.suggestions.length > 0">
                    <el-divider content-position="left">初步建议</el-divider>
                    <el-alert
                      v-for="(suggestion, sIdx) in event.suggestions"
                      :key="sIdx"
                      :title="suggestion"
                      type="warning"
                      :closable="false"
                      show-icon
                      class="suggestion-alert"
                    />
                  </template>
                </div>
              </el-card>
            </el-timeline-item>
          </el-timeline>
        </el-card>
      </el-col>

      <el-col :span="10">
        <el-card class="section-card">
          <template #header>
            <div class="section-header">
              <span class="section-title">根因分析</span>
              <el-tag type="danger" size="small" effect="dark">已确认</el-tag>
            </div>
          </template>
          
          <div class="root-cause-section">
            <div class="cause-summary">
              <div class="cause-icon">
                <el-icon><Warning /></el-icon>
              </div>
              <div class="cause-text">
                <h4>{{ rootCauseData.mainCause }}</h4>
                <p>{{ rootCauseData.description }}</p>
              </div>
            </div>

            <el-divider />

            <div class="cause-analysis">
              <h5>影响链分析</h5>
              <div class="impact-chain">
                <div 
                  v-for="(link, index) in rootCauseData.impactChain" 
                  :key="index"
                  class="chain-link"
                >
                  <div class="link-content">
                    <span class="link-index">{{ index + 1 }}</span>
                    <span class="link-text">{{ link }}</span>
                  </div>
                  <el-icon v-if="index < rootCauseData.impactChain.length - 1" class="link-arrow">
                    <ArrowDown />
                  </el-icon>
                </div>
              </div>
            </div>

            <el-divider />

            <div class="contributing-factors">
              <h5>促成因素</h5>
              <el-row :gutter="16">
                <el-col :span="12" v-for="(factor, index) in rootCauseData.contributingFactors" :key="index">
                  <el-card class="factor-card" shadow="hover">
                    <div class="factor-header">
                      <el-icon :class="factor.type === 'critical' ? 'critical-icon' : 'warning-icon'">
                        <component :is="factor.type === 'critical' ? 'CircleCloseFilled' : 'WarningFilled'" />
                      </el-icon>
                      <span class="factor-name">{{ factor.name }}</span>
                    </div>
                    <p class="factor-desc">{{ factor.description }}</p>
                  </el-card>
                </el-col>
              </el-row>
            </div>

            <el-divider />

            <div class="evidence-section">
              <h5>证据支持</h5>
              <el-table :data="rootCauseData.evidence" stripe size="small">
                <el-table-column prop="source" label="来源" width="120">
                  <template #default="{ row }">
                    <el-tag size="small">{{ row.source }}</el-tag>
                  </template>
                </el-table-column>
                <el-table-column prop="evidence" label="证据内容" show-overflow-tooltip />
                <el-table-column label="相关性" width="100" align="center">
                  <template #default="{ row }">
                    <el-progress 
                      :percentage="row.relevance" 
                      :status="row.relevance > 70 ? 'success' : 'warning'"
                      :stroke-width="8"
                    />
                  </template>
                </el-table-column>
              </el-table>
            </div>
          </div>
        </el-card>

        <el-card class="section-card" style="margin-top: 24px;">
          <template #header>
            <div class="section-header">
              <span class="section-title">修复建议</span>
              <el-tag type="success" size="small">AI 生成</el-tag>
            </div>
          </template>
          
          <div class="fix-suggestions-section">
            <el-tabs v-model="activeFixTab">
              <el-tab-pane label="立即执行" name="immediate">
                <div class="suggestion-list">
                  <div 
                    v-for="(suggestion, index) in fixSuggestions.immediate" 
                    :key="index"
                    class="suggestion-item"
                  >
                    <div class="suggestion-header">
                      <el-checkbox v-model="suggestion.completed" @change="handleSuggestionChange(suggestion)">
                        <span class="suggestion-title">{{ suggestion.title }}</span>
                      </el-checkbox>
                      <el-tag :type="suggestion.priority === 'high' ? 'danger' : 'warning'" size="small">
                        {{ suggestion.priority === 'high' ? '高优先级' : '中优先级' }}
                      </el-tag>
                    </div>
                    <p class="suggestion-desc">{{ suggestion.description }}</p>
                    
                    <template v-if="suggestion.commands && suggestion.commands.length > 0">
                      <el-divider content-position="left">执行命令</el-divider>
                      <div class="command-blocks">
                        <div v-for="(cmd, cIdx) in suggestion.commands" :key="cIdx" class="command-item">
                          <div class="command-header">
                            <span class="command-label">{{ cmd.label }}</span>
                            <el-button type="primary" link size="small" @click="copyCommand(cmd.command)">
                              <el-icon><DocumentCopy /></el-icon>
                              复制
                            </el-button>
                          </div>
                          <pre class="command-code">{{ cmd.command }}</pre>
                        </div>
                      </div>
                    </template>

                    <template v-if="suggestion.verification">
                      <el-divider content-position="left">验证方法</el-divider>
                      <el-alert 
                        :title="suggestion.verification" 
                        type="info" 
                        :closable="false"
                        show-icon
                      />
                    </template>
                  </div>
                </div>
              </el-tab-pane>

              <el-tab-pane label="长期优化" name="longterm">
                <div class="suggestion-list">
                  <div 
                    v-for="(suggestion, index) in fixSuggestions.longterm" 
                    :key="index"
                    class="suggestion-item"
                  >
                    <div class="suggestion-header">
                      <el-checkbox v-model="suggestion.completed" @change="handleSuggestionChange(suggestion)">
                        <span class="suggestion-title">{{ suggestion.title }}</span>
                      </el-checkbox>
                      <el-tag type="info" size="small">建议执行</el-tag>
                    </div>
                    <p class="suggestion-desc">{{ suggestion.description }}</p>
                    
                    <div class="suggestion-benefits" v-if="suggestion.benefits">
                      <h6>预期收益</h6>
                      <el-tag v-for="(benefit, bIdx) in suggestion.benefits" :key="bIdx" size="small" class="benefit-tag">
                        {{ benefit }}
                      </el-tag>
                    </div>
                  </div>
                </div>
              </el-tab-pane>
            </el-tabs>

            <el-divider />

            <div class="suggestion-summary">
              <el-row :gutter="16">
                <el-col :span="8">
                  <el-statistic title="总建议数" :value="totalSuggestions" />
                </el-col>
                <el-col :span="8">
                  <el-statistic title="已完成" :value="completedSuggestions" value-style="color: #67c23a" />
                </el-col>
                <el-col :span="8">
                  <el-statistic title="待执行" :value="pendingSuggestions" value-style="color: #f56c6c" />
                </el-col>
              </el-row>
            </div>
          </div>
        </el-card>
      </el-col>
    </el-row>

    <el-card class="section-card" style="margin-top: 24px;">
      <template #header>
        <div class="section-header">
          <span class="section-title">AI 助手对话</span>
          <el-tag type="primary" size="small" effect="dark">实时</el-tag>
        </div>
      </template>
      
      <div class="chat-section">
        <div class="chat-messages" ref="chatMessagesRef">
          <div 
            v-for="(msg, index) in chatMessages" 
            :key="index"
            class="chat-message"
            :class="msg.role === 'user' ? 'user-message' : 'assistant-message'"
          >
            <div class="message-avatar">
              <el-avatar :size="40" :icon="msg.role === 'user' ? 'User' : 'Cpu'" />
            </div>
            <div class="message-content">
              <div class="message-header">
                <span class="message-sender">{{ msg.role === 'user' ? '您' : 'DevOps Agent' }}</span>
                <span class="message-time">{{ msg.time }}</span>
              </div>
              <div class="message-body" v-if="msg.role === 'user'">
                {{ msg.content }}
              </div>
              <div class="message-body" v-else>
                <div v-if="msg.type === 'thinking'">
                  <div class="thinking-dots">
                    <span></span>
                    <span></span>
                    <span></span>
                  </div>
                </div>
                <div v-else-if="msg.type === 'analysis'">
                  <div class="analysis-result">
                    <h6>{{ msg.title }}</h6>
                    <p>{{ msg.content }}</p>
                    <el-divider v-if="msg.details" content-position="left">详细分析</el-divider>
                    <ul v-if="msg.details" class="analysis-details">
                      <li v-for="(detail, dIdx) in msg.details" :key="dIdx">
                        <el-icon><Check /></el-icon>
                        <span>{{ detail }}</span>
                      </li>
                    </ul>
                    <el-alert 
                      v-if="msg.suggestion"
                      :title="msg.suggestion"
                      type="warning"
                      :closable="false"
                      show-icon
                      class="analysis-suggestion"
                    />
                  </div>
                </div>
                <div v-else>
                  {{ msg.content }}
                </div>
              </div>
            </div>
          </div>
        </div>

        <el-divider />

        <div class="chat-input-area">
          <div class="quick-actions">
            <el-button-group>
              <el-button size="small" @click="sendQuickMessage('如何确认根因？')">
                如何确认根因？
              </el-button>
              <el-button size="small" @click="sendQuickMessage('执行修复命令')">
                执行修复命令
              </el-button>
              <el-button size="small" @click="sendQuickMessage('验证修复效果')">
                验证修复效果
              </el-button>
              <el-button size="small" @click="sendQuickMessage('生成完整报告')">
                生成完整报告
              </el-button>
            </el-button-group>
          </div>

          <div class="input-wrapper">
            <el-input
              v-model="chatInput"
              type="textarea"
              :rows="2"
              placeholder="输入您的问题，DevOps Agent 将为您提供帮助..."
              @keyup.enter.ctrl="sendMessage"
              class="chat-textarea"
            />
            <div class="input-actions">
              <span class="input-hint">按 Ctrl + Enter 发送</span>
              <el-button type="primary" @click="sendMessage" :loading="isSending">
                <el-icon><Promotion /></el-icon>
                发送
              </el-button>
            </div>
          </div>
        </div>
      </div>
    </el-card>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, nextTick, watch } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  Refresh,
  Download,
  Warning,
  ArrowDown,
  ArrowRight,
  DocumentCopy,
  User,
  Cpu,
  Check,
  Promotion,
  CircleCheck,
  CircleCloseFilled,
  WarningFilled,
  Loading,
  Timer,
  Search,
  DataAnalysis,
  Tools,
  View,
  List,
  Plus
} from '@element-plus/icons-vue'
import { useDevOpsIncidentStore } from '@/stores/devops-incident-store'

const devOpsIncidentStore = useDevOpsIncidentStore()

const isLoading = computed(() => devOpsIncidentStore.isLoading)
const currentInvestigation = computed(() => devOpsIncidentStore.currentInvestigation)
const isPolling = computed(() => devOpsIncidentStore.isPolling)

const getInvestigationIdFromUrl = () => {
  const hash = window.location.hash
  const match = hash.match(/id=([^&]+)/)
  return match ? match[1] : null
}

const investigationId = ref(getInvestigationIdFromUrl())

const incidentData = computed(() => {
  if (!currentInvestigation.value) {
    return {
      incidentId: '-',
      occurredAt: '-',
      affectedService: '-',
      severity: 'low'
    }
  }
  return {
    incidentId: currentInvestigation.value.incidentId || currentInvestigation.value.id || '-',
    occurredAt: currentInvestigation.value.occurredAt || currentInvestigation.value.created_at || '-',
    affectedService: currentInvestigation.value.affectedService || currentInvestigation.value.affected_service || '-',
    severity: currentInvestigation.value.severity || 'low'
  }
})

const incidentStatus = computed(() => {
  const status = currentInvestigation.value?.status || 'investigating'
  const statusMap = {
    investigating: { type: 'warning', text: '调查中' },
    completed: { type: 'success', text: '已完成' },
    closed: { type: 'info', text: '已关闭' },
    cancelled: { type: 'info', text: '已取消' },
    failed: { type: 'danger', text: '失败' }
  }
  return statusMap[status] || statusMap.investigating
})

const severityTag = computed(() => {
  const severity = incidentData.value.severity
  const map = {
    critical: { type: 'danger', text: '严重' },
    high: { type: 'danger', text: '高' },
    medium: { type: 'warning', text: '中' },
    low: { type: 'info', text: '低' }
  }
  return map[severity] || map.low
})

const currentStep = computed(() => {
  const progress = currentInvestigation.value?.progress || {}
  return progress.currentStep || 0
})

const progressPercentage = computed(() => {
  const progress = currentInvestigation.value?.progress || {}
  return progress.percentage || Math.min(100, currentStep.value * 33.33)
})

const progressElStatus = computed(() => currentStep.value >= 3 ? 'success' : '')

const progressStatus = computed(() => {
  if (currentStep.value >= 3) return { type: 'success', text: '已完成' }
  if (currentStep.value >= 2) return { type: 'primary', text: '修复中' }
  if (currentStep.value >= 1) return { type: 'primary', text: '分析中' }
  return { type: 'info', text: '调查中' }
})

const stepDetails = computed(() => {
  const steps = currentInvestigation.value?.progress?.steps || []
  if (steps.length > 0) {
    return steps.map((step, index) => {
      let iconClass = 'pending'
      let icon = 'Timer'
      let status = '待处理'
      
      if (index < currentStep.value) {
        iconClass = 'completed'
        icon = 'CircleCheck'
        status = '已完成'
      } else if (index === currentStep.value) {
        iconClass = 'processing'
        icon = 'Loading'
        status = '进行中'
      }
      
      return {
        status: step.status || status,
        icon: step.icon || icon,
        iconClass: step.iconClass || iconClass
      }
    })
  }
  
  return [
    { status: currentStep.value >= 1 ? '已完成' : (currentStep.value === 0 ? '进行中' : '待处理'), 
      icon: currentStep.value >= 1 ? 'CircleCheck' : (currentStep.value === 0 ? 'Loading' : 'Timer'), 
      iconClass: currentStep.value >= 1 ? 'completed' : (currentStep.value === 0 ? 'processing' : 'pending') },
    { status: currentStep.value >= 2 ? '已完成' : (currentStep.value === 1 ? '进行中' : '待处理'), 
      icon: currentStep.value >= 2 ? 'CircleCheck' : (currentStep.value === 1 ? 'Loading' : 'Timer'), 
      iconClass: currentStep.value >= 2 ? 'completed' : (currentStep.value === 1 ? 'processing' : 'pending') },
    { status: currentStep.value >= 3 ? '已完成' : (currentStep.value === 2 ? '进行中' : '待处理'), 
      icon: currentStep.value >= 3 ? 'CircleCheck' : (currentStep.value === 2 ? 'Loading' : 'Timer'), 
      iconClass: currentStep.value >= 3 ? 'completed' : (currentStep.value === 2 ? 'processing' : 'pending') }
  ]
})

const timelineView = ref('full')

const fullTimeline = computed(() => {
  const timeline = currentInvestigation.value?.timeline || []
  if (timeline.length > 0) {
    return timeline.map((item, index) => ({
      id: item.id || index + 1,
      timestamp: item.timestamp || item.time || '-',
      type: item.type || 'primary',
      icon: item.icon || 'Search',
      title: item.title || '-',
      description: item.description || '',
      highlight: item.highlight || false,
      duration: item.duration,
      details: item.details || [],
      logs: item.logs || [],
      suggestions: item.suggestions || []
    }))
  }
  return []
})

const filteredTimeline = computed(() => {
  if (timelineView.value === 'full') {
    return fullTimeline.value
  }
  return fullTimeline.value.filter(item => item.highlight)
})

const rootCauseData = computed(() => {
  const rootCause = currentInvestigation.value?.rootCause || currentInvestigation.value?.root_cause
  if (rootCause) {
    return {
      mainCause: rootCause.mainCause || rootCause.main_cause || '-',
      description: rootCause.description || '-',
      impactChain: rootCause.impactChain || rootCause.impact_chain || [],
      contributingFactors: rootCause.contributingFactors || rootCause.contributing_factors || [],
      evidence: rootCause.evidence || []
    }
  }
  return {
    mainCause: '-',
    description: '根因分析进行中...',
    impactChain: [],
    contributingFactors: [],
    evidence: []
  }
})

const activeFixTab = ref('immediate')

const fixSuggestions = computed(() => {
  const suggestions = currentInvestigation.value?.fixSuggestions || currentInvestigation.value?.fix_suggestions
  if (suggestions) {
    return {
      immediate: suggestions.immediate || [],
      longterm: suggestions.longterm || []
    }
  }
  return {
    immediate: [],
    longterm: []
  }
})

const totalSuggestions = computed(() => {
  return fixSuggestions.value.immediate.length + fixSuggestions.value.longterm.length
})

const completedSuggestions = computed(() => {
  const immediate = fixSuggestions.value.immediate.filter(s => s.completed).length
  const longterm = fixSuggestions.value.longterm.filter(s => s.completed).length
  return immediate + longterm
})

const pendingSuggestions = computed(() => {
  return totalSuggestions.value - completedSuggestions.value
})

const chatMessagesRef = ref(null)
const chatInput = ref('')
const isSending = ref(false)

const chatMessages = computed(() => {
  const messages = currentInvestigation.value?.chatMessages || currentInvestigation.value?.chat_messages || []
  if (messages.length > 0) {
    return messages
  }
  return []
})

const toggleTimelineView = () => {
  timelineView.value = timelineView.value === 'full' ? 'key' : 'full'
}

const goToList = () => {
  window.location.hash = '#/aws/devops-incident-list'
}

const goToLaunch = () => {
  window.location.hash = '#/aws/devops-incident-launch'
}

const handleRefresh = async () => {
  if (!investigationId.value) return
  ElMessage.info('正在刷新事件数据...')
  await devOpsIncidentStore.fetchInvestigationDetail(investigationId.value)
}

const handleExport = async () => {
  if (!investigationId.value) {
    ElMessage.warning('无法导出：缺少调查ID')
    return
  }
  try {
    await devOpsIncidentStore.exportInvestigation(investigationId.value)
  } catch (error) {
    console.error('导出失败:', error)
  }
}

const handleSuggestionChange = (suggestion) => {
  if (suggestion.completed) {
    ElMessage.success(`已标记完成: ${suggestion.title}`)
  }
}

const copyCommand = async (command) => {
  try {
    await navigator.clipboard.writeText(command)
    ElMessage.success('命令已复制到剪贴板')
  } catch {
    ElMessage.error('复制失败，请手动复制')
  }
}

const sendMessage = async () => {
  if (!chatInput.value.trim() || isSending.value) return

  const userMessage = {
    role: 'user',
    content: chatInput.value,
    time: new Date().toLocaleTimeString()
  }
  
  const userInput = chatInput.value
  chatInput.value = ''
  isSending.value = true

  await scrollToBottom()

  const thinkingMsg = {
    role: 'assistant',
    type: 'thinking',
    time: new Date().toLocaleTimeString()
  }
  
  await scrollToBottom()

  await new Promise(resolve => setTimeout(resolve, 1500))

  const responses = {
    '如何确认根因？': {
      type: 'analysis',
      title: '根因确认方法',
      content: '您可以通过以下方式确认根因分析的准确性：',
      details: [
        '检查 RDS 慢查询日志中是否存在相同的 SQL 模式',
        '使用 EXPLAIN 分析查询执行计划，确认是否全表扫描',
        '验证在测试环境中添加索引后查询性能的提升',
        '检查代码提交历史，确认问题 SQL 的引入时间',
        '对比问题发生前后的数据库性能指标'
      ],
      suggestion: '建议先在测试环境验证索引创建的效果，确认无误后再在生产环境执行。'
    },
    '执行修复命令': {
      type: 'analysis',
      title: '修复命令执行指南',
      content: '执行修复命令前，请确保已完成以下准备工作：',
      details: [
        '确认已备份相关数据库表数据',
        '在测试环境验证过命令的效果',
        '确认操作窗口（低峰期执行更佳）',
        '准备好回滚方案',
        '通知相关团队成员'
      ],
      suggestion: '创建索引操作可能需要较长时间，建议在业务低峰期执行，避免影响正常业务。'
    },
    '验证修复效果': {
      type: 'analysis',
      title: '修复效果验证清单',
      content: '执行修复后，请通过以下指标验证效果：',
      details: [
        '数据库 CPU 使用率是否恢复正常 (< 70%)',
        '应用连接池等待队列是否清零',
        '健康检查是否全部通过',
        'ECS 任务是否停止重启循环',
        '业务接口响应时间是否恢复正常',
        '是否还有新的连接超时错误产生'
      ],
      suggestion: '建议持续监控至少 1 小时，确认问题完全解决且无复发迹象。'
    },
    '生成完整报告': {
      type: 'normal',
      content: '已为您生成完整的事件调查报告，包含以下内容：\n\n1. 事件概述\n2. 时间线分析\n3. 根因详细分析\n4. 影响范围评估\n5. 修复执行计划\n6. 长期优化建议\n7. 预防措施\n\n报告正在导出中，请稍候...'
    }
  }

  const defaultResponse = {
    type: 'analysis',
    title: '问题分析中',
    content: `我正在分析您的问题："${userInput}"`,
    details: [
      '检索相关事件上下文',
      '分析日志和监控数据',
      '匹配已知问题模式',
      '生成针对性建议'
    ],
    suggestion: '您可以尝试使用快捷按钮获取更精准的帮助，如"如何确认根因？"或"验证修复效果"。'
  }

  const response = responses[userInput] || defaultResponse

  isSending.value = false
  await scrollToBottom()
}

const sendQuickMessage = (message) => {
  chatInput.value = message
  sendMessage()
}

const scrollToBottom = async () => {
  await nextTick()
  if (chatMessagesRef.value) {
    chatMessagesRef.value.scrollTop = chatMessagesRef.value.scrollHeight
  }
}

const loadInvestigationDetail = async () => {
  const id = getInvestigationIdFromUrl()
  if (!id) {
    ElMessage.warning('未找到调查ID')
    return
  }
  investigationId.value = id
  await devOpsIncidentStore.fetchInvestigationDetail(id)
  
  const status = currentInvestigation.value?.status
  if (status === 'investigating') {
    devOpsIncidentStore.startPolling(id, 5000)
  }
}

const stopPollingIfNeeded = () => {
  const status = currentInvestigation.value?.status
  if (status !== 'investigating' && isPolling.value) {
    devOpsIncidentStore.stopPolling()
  }
}

watch(currentInvestigation, () => {
  stopPollingIfNeeded()
  scrollToBottom()
}, { deep: true })

onMounted(() => {
  loadInvestigationDetail()
})

onUnmounted(() => {
  devOpsIncidentStore.stopPolling()
  devOpsIncidentStore.clearCurrentInvestigation()
})
</script>

<style scoped>
.incident-investigation-page {
  min-height: 100%;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 12px;
}

.page-title {
  font-size: 20px;
  font-weight: 600;
  color: #303133;
  margin: 0;
}

.status-tag {
  font-size: 13px;
}

.incident-info-card {
  margin-bottom: 24px;
}

.info-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.info-label {
  font-size: 12px;
  color: #909399;
}

.info-value {
  font-size: 14px;
  font-weight: 500;
  color: #303133;
}

.section-card {
  margin-bottom: 0;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.section-title {
  font-size: 16px;
  font-weight: 600;
  color: #303133;
}

.progress-section {
  padding: 20px 0;
}

.step-icon {
  width: 48px;
  height: 48px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  font-size: 24px;
}

.step-icon.completed {
  background-color: #f0f9eb;
  color: #67c23a;
}

.step-icon.processing {
  background-color: #ecf5ff;
  color: #409eff;
  animation: pulse 1.5s ease-in-out infinite;
}

.step-icon.pending {
  background-color: #f4f4f5;
  color: #909399;
}

.progress-bar-wrapper {
  margin-top: 30px;
  max-width: 600px;
  margin-left: auto;
  margin-right: auto;
}

.reasoning-timeline {
  padding: 20px 0;
}

.timeline-card {
  transition: all 0.3s;
}

.timeline-card.highlight {
  border-left: 4px solid #409eff;
}

.timeline-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.timeline-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-weight: 600;
  color: #303133;
}

.timeline-icon {
  font-size: 18px;
  color: #409eff;
}

.timeline-content p {
  color: #606266;
  line-height: 1.6;
  margin: 0;
}

.timeline-details {
  list-style: none;
  padding: 0;
  margin: 0;
}

.timeline-details li {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  padding: 4px 0;
  color: #606266;
}

.timeline-details li .el-icon {
  color: #409eff;
  margin-top: 3px;
}

.timeline-logs {
  background-color: #1e1e1e;
  border-radius: 6px;
  padding: 12px;
}

.timeline-logs pre {
  margin: 0;
  font-family: 'Consolas', 'Monaco', monospace;
  font-size: 12px;
  color: #d4d4d4;
  white-space: pre-wrap;
  word-break: break-all;
  line-height: 1.5;
}

.timeline-logs pre + pre {
  margin-top: 8px;
}

.suggestion-alert {
  margin-top: 8px;
}

.root-cause-section {
  padding: 10px 0;
}

.cause-summary {
  display: flex;
  gap: 16px;
  padding: 16px;
  background: linear-gradient(135deg, #fff5f5 0%, #fff 100%);
  border-radius: 8px;
  border: 1px solid #fde2e2;
}

.cause-icon {
  width: 48px;
  height: 48px;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: #fef0f0;
  border-radius: 50%;
  font-size: 24px;
  color: #f56c6c;
  flex-shrink: 0;
}

.cause-text h4 {
  margin: 0 0 8px 0;
  font-size: 16px;
  font-weight: 600;
  color: #303133;
}

.cause-text p {
  margin: 0;
  color: #606266;
  line-height: 1.6;
}

.cause-analysis h5,
.contributing-factors h5,
.evidence-section h5 {
  margin: 0 0 16px 0;
  font-size: 14px;
  font-weight: 600;
  color: #303133;
}

.impact-chain {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.chain-link {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.link-content {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  background-color: #f5f7fa;
  border-radius: 8px;
  width: 100%;
}

.link-index {
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: #409eff;
  color: white;
  border-radius: 50%;
  font-size: 12px;
  font-weight: 600;
}

.link-text {
  color: #303133;
  font-size: 14px;
}

.link-arrow {
  color: #909399;
  font-size: 16px;
  margin: 4px 0;
}

.factor-card {
  margin-bottom: 16px;
}

.factor-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
}

.critical-icon {
  color: #f56c6c;
  font-size: 18px;
}

.warning-icon {
  color: #e6a23c;
  font-size: 18px;
}

.factor-name {
  font-weight: 600;
  color: #303133;
}

.factor-desc {
  margin: 0;
  font-size: 13px;
  color: #606266;
  line-height: 1.5;
}

.fix-suggestions-section {
  padding: 10px 0;
}

.suggestion-list {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.suggestion-item {
  padding: 16px;
  background-color: #fafafa;
  border-radius: 8px;
  border: 1px solid #ebeef5;
}

.suggestion-item:first-child {
  margin-top: 16px;
}

.suggestion-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 12px;
}

.suggestion-title {
  font-weight: 600;
  color: #303133;
  font-size: 14px;
}

.suggestion-desc {
  margin: 0 0 12px 0;
  color: #606266;
  font-size: 13px;
  line-height: 1.6;
}

.command-blocks {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.command-item {
  background-color: #fff;
  border-radius: 6px;
  overflow: hidden;
  border: 1px solid #e4e7ed;
}

.command-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 12px;
  background-color: #f5f7fa;
  border-bottom: 1px solid #e4e7ed;
}

.command-label {
  font-size: 12px;
  font-weight: 600;
  color: #606266;
}

.command-code {
  margin: 0;
  padding: 12px;
  font-family: 'Consolas', 'Monaco', monospace;
  font-size: 13px;
  color: #303133;
  background-color: #fafafa;
  white-space: pre-wrap;
  word-break: break-all;
}

.suggestion-benefits h6 {
  margin: 12px 0 8px 0;
  font-size: 12px;
  font-weight: 600;
  color: #606266;
}

.benefit-tag {
  margin-right: 8px;
  margin-bottom: 4px;
}

.suggestion-summary {
  padding-top: 16px;
}

.chat-section {
  padding: 10px 0;
}

.chat-messages {
  max-height: 500px;
  overflow-y: auto;
  padding: 16px 0;
}

.chat-message {
  display: flex;
  gap: 12px;
  margin-bottom: 20px;
}

.chat-message.user-message {
  flex-direction: row-reverse;
}

.message-avatar {
  flex-shrink: 0;
}

.message-content {
  max-width: 70%;
}

.chat-message.user-message .message-content {
  text-align: right;
}

.message-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 4px;
}

.chat-message.user-message .message-header {
  justify-content: flex-end;
}

.message-sender {
  font-size: 13px;
  font-weight: 600;
  color: #303133;
}

.message-time {
  font-size: 12px;
  color: #909399;
}

.message-body {
  padding: 12px 16px;
  border-radius: 8px;
  font-size: 14px;
  line-height: 1.6;
  word-break: break-word;
}

.chat-message.user-message .message-body {
  background-color: #ecf5ff;
  color: #303133;
}

.chat-message.assistant-message .message-body {
  background-color: #fff;
  border: 1px solid #ebeef5;
  color: #303133;
}

.thinking-dots {
  display: flex;
  gap: 4px;
  padding: 8px 0;
}

.thinking-dots span {
  width: 8px;
  height: 8px;
  background-color: #409eff;
  border-radius: 50%;
  animation: bounce 1.4s ease-in-out infinite;
}

.thinking-dots span:nth-child(2) {
  animation-delay: 0.2s;
}

.thinking-dots span:nth-child(3) {
  animation-delay: 0.4s;
}

.analysis-result h6 {
  margin: 0 0 8px 0;
  font-size: 14px;
  font-weight: 600;
  color: #303133;
}

.analysis-result p {
  margin: 0 0 12px 0;
  color: #606266;
}

.analysis-details {
  list-style: none;
  padding: 0;
  margin: 0 0 12px 0;
}

.analysis-details li {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  padding: 4px 0;
  color: #606266;
  font-size: 13px;
}

.analysis-details li .el-icon {
  color: #67c23a;
  margin-top: 2px;
}

.analysis-suggestion {
  margin-top: 12px;
}

.quick-actions {
  margin-bottom: 16px;
}

.input-wrapper {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.chat-textarea {
  width: 100%;
}

.input-actions {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.input-hint {
  font-size: 12px;
  color: #909399;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}

@keyframes bounce {
  0%, 80%, 100% { transform: scale(0); }
  40% { transform: scale(1); }
}

@media (max-width: 1200px) {
  .el-col {
    margin-bottom: 24px;
  }
}
</style>
