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
        <el-button size="small" @click="handleRefresh">
          <el-icon><Refresh /></el-icon>
          刷新
        </el-button>
        <el-button size="small" type="primary" @click="handleExport">
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
import { ref, computed, onMounted, nextTick } from 'vue'
import { ElMessage } from 'element-plus'
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
  View
} from '@element-plus/icons-vue'

const incidentData = ref({
  incidentId: 'INC-2026-0428-001',
  occurredAt: '2026-04-28 08:32:15',
  affectedService: 'AWS ECS / Production Cluster',
  severity: 'critical'
})

const incidentStatus = computed(() => {
  return {
    type: 'warning',
    text: '调查中'
  }
})

const severityTag = computed(() => {
  const map = {
    critical: { type: 'danger', text: '严重' },
    high: { type: 'danger', text: '高' },
    medium: { type: 'warning', text: '中' },
    low: { type: 'info', text: '低' }
  }
  return map[incidentData.value.severity] || map.low
})

const currentStep = ref(1)
const progressPercentage = computed(() => Math.min(100, currentStep.value * 33.33))
const progressElStatus = computed(() => currentStep.value >= 3 ? 'success' : '')

const progressStatus = computed(() => {
  if (currentStep.value >= 3) return { type: 'success', text: '已完成' }
  if (currentStep.value >= 2) return { type: 'primary', text: '修复中' }
  if (currentStep.value >= 1) return { type: 'primary', text: '分析中' }
  return { type: 'info', text: '调查中' }
})

const stepDetails = ref([
  { status: '已完成', icon: 'CircleCheck', iconClass: 'completed' },
  { status: '进行中', icon: 'Loading', iconClass: 'processing' },
  { status: '待处理', icon: 'Timer', iconClass: 'pending' }
])

const timelineView = ref('full')

const fullTimeline = ref([
  {
    id: 1,
    timestamp: '08:32:15',
    type: 'danger',
    icon: 'Warning',
    title: '事件触发 - 健康检查失败',
    description: 'AWS CloudWatch 检测到生产环境 ECS 服务的 3 个目标组健康检查连续失败，触发告警。',
    highlight: true,
    details: [
      '目标组: arn:aws:elasticloadbalancing:cn-north-1:123456789012:targetgroup/prod-api/abc123',
      '健康检查路径: /health',
      '失败阈值: 3 次连续失败',
      '受影响实例: 3 / 5 个实例'
    ],
    logs: [
      '[2026-04-28T08:32:15Z] HEALTH_CHECK_FAILED: Target i-0abc123def456 is unhealthy',
      '[2026-04-28T08:32:16Z] HEALTH_CHECK_FAILED: Target i-0def789ghi012 is unhealthy',
      '[2026-04-28T08:32:17Z] HEALTH_CHECK_FAILED: Target i-0ghi345jkl678 is unhealthy'
    ]
  },
  {
    id: 2,
    timestamp: '08:32:45',
    type: 'primary',
    icon: 'Search',
    title: '自动信息收集开始',
    description: 'DevOps Agent 自动启动事件响应流程，开始收集相关诊断信息。',
    duration: '45s',
    details: [
      '收集 ECS 服务状态和任务列表',
      '拉取最近 15 分钟的 CloudWatch 日志',
      '检查 VPC 网络连接性',
      '验证安全组和 NACL 配置'
    ]
  },
  {
    id: 3,
    timestamp: '08:33:30',
    type: 'warning',
    icon: 'DataAnalysis',
    title: '初步分析 - 日志异常模式',
    description: '分析日志发现应用程序抛出大量数据库连接超时异常，连接池耗尽。',
    highlight: true,
    duration: '1min 30s',
    details: [
      '错误类型: SQLTransientConnectionException',
      '错误消息: HikariPool-1 - Connection is not available, request timed out after 30000ms',
      '连接池配置: 最大连接数 50',
      '当前活跃连接: 50 / 50 (100%)'
    ],
    logs: [
      'Caused by: java.sql.SQLTransientConnectionException: HikariPool-1 - Connection is not available, request timed out after 30000ms.',
      'at com.zaxxer.hikari.pool.HikariPool.createTimeoutException(HikariPool.java:696)',
      'at com.zaxxer.hikari.pool.HikariPool.getConnection(HikariPool.java:197)'
    ],
    suggestions: [
      '检查数据库连接池配置是否合理',
      '验证数据库服务器负载状态',
      '查看是否存在慢查询阻塞连接'
    ]
  },
  {
    id: 4,
    timestamp: '08:35:00',
    type: 'primary',
    icon: 'Search',
    title: '深度诊断 - 数据库层面',
    description: 'Agent 转向数据库层面诊断，发现 RDS 实例存在异常活跃连接。',
    duration: '1min 15s',
    details: [
      'RDS 实例: prod-db-mysql-01',
      'CPU 使用率: 98% (异常)',
      '活跃连接数: 256',
      '慢查询数: 142 (最近 5 分钟)',
      '锁等待时间: 平均 12s'
    ]
  },
  {
    id: 5,
    timestamp: '08:36:15',
    type: 'danger',
    icon: 'Warning',
    title: '根因确认 - 慢查询锁定',
    description: '确认根因为某条未优化的 SQL 查询导致全表扫描，锁表后引发连接池雪崩。',
    highlight: true,
    duration: '30s',
    details: [
      '问题 SQL: SELECT * FROM orders WHERE status = ? ORDER BY created_at DESC',
      '表大小: 500 万行',
      '缺少索引: status 列和 created_at 列无联合索引',
      '执行时间: 每次查询约 45 秒',
      '锁影响: 阻塞了 200+ 个后续写入操作'
    ],
    logs: [
      'EXPLAIN SELECT * FROM orders WHERE status = \'PENDING\' ORDER BY created_at DESC',
      '-> Filter: (orders.status = \'PENDING\')  (cost=1e6 rows=5e6)',
      '-> Sort: orders.created_at DESC  (cost=1e6 rows=5e6)',
      '-> Table scan on orders  (cost=1e6 rows=5e6)'
    ],
    suggestions: [
      '立即创建联合索引: idx_status_created_at(status, created_at)',
      '终止当前阻塞的慢查询进程',
      '考虑增加连接池大小作为临时缓解'
    ]
  },
  {
    id: 6,
    timestamp: '08:37:00',
    type: 'success',
    icon: 'CircleCheck',
    title: '修复方案生成完成',
    description: 'DevOps Agent 已完成根因分析，并生成了完整的修复建议和执行计划。',
    duration: '45s',
    details: [
      '已分析影响范围和风险等级',
      '已生成立即执行的修复命令',
      '已制定长期优化建议',
      '已准备验证步骤'
    ]
  }
])

const filteredTimeline = computed(() => {
  if (timelineView.value === 'full') {
    return fullTimeline.value
  }
  return fullTimeline.value.filter(item => item.highlight)
})

const rootCauseData = ref({
  mainCause: '未优化的 SQL 查询导致数据库连接池耗尽',
  description: 'orders 表上的查询缺少联合索引，导致全表扫描和锁表，引发数据库连接池耗尽，最终导致应用服务健康检查失败。',
  impactChain: [
    '新代码部署引入未优化的 SQL 查询',
    '查询执行全表扫描 (500万行)',
    '查询耗时 45 秒并持有表锁',
    '后续查询被阻塞，连接池迅速耗尽',
    '应用无法获取数据库连接，请求超时',
    '健康检查失败，ECS 开始重启容器',
    '重启循环导致服务完全不可用'
  ],
  contributingFactors: [
    {
      type: 'critical',
      name: '缺失数据库索引',
      description: 'orders 表的 status 和 created_at 列缺少联合索引，导致查询性能极差。'
    },
    {
      type: 'warning',
      name: '连接池配置过小',
      description: 'HikariCP 最大连接数设置为 50，在高并发下容易耗尽。'
    },
    {
      type: 'warning',
      name: '缺少慢查询告警',
      description: '未配置慢查询阈值告警，问题在早期阶段未被发现。'
    },
    {
      type: 'warning',
      name: '部署前性能测试不足',
      description: '新 SQL 在部署前未经过充分的性能压力测试。'
    }
  ],
  evidence: [
    { source: 'ECS 日志', evidence: '大量 HikariPool 连接超时异常', relevance: 95 },
    { source: 'CloudWatch Metrics', evidence: '数据库 CPU 飙升至 98%', relevance: 90 },
    { source: 'RDS 慢查询日志', evidence: '同一 SQL 执行 142 次，每次 45s+', relevance: 100 },
    { source: 'RDS 进程列表', evidence: '256 个活跃连接，大部分在等待锁', relevance: 85 },
    { source: '代码审查', evidence: '最新部署的提交引入了该查询', relevance: 80 }
  ]
})

const activeFixTab = ref('immediate')

const fixSuggestions = ref({
  immediate: [
    {
      title: '创建缺失的数据库索引',
      description: '为 orders 表的 status 和 created_at 列创建联合索引，这将把查询时间从 45 秒降低到毫秒级。',
      priority: 'high',
      completed: false,
      commands: [
        {
          label: '创建联合索引',
          command: 'CREATE INDEX idx_status_created_at ON orders(status, created_at);'
        },
        {
          label: '验证索引创建',
          command: 'SHOW INDEX FROM orders WHERE Key_name = \'idx_status_created_at\';'
        }
      ],
      verification: '执行 EXPLAIN 验证查询是否使用新索引，确认查询时间下降到合理范围。'
    },
    {
      title: '终止阻塞的慢查询进程',
      description: '立即终止当前正在执行的慢查询，释放数据库连接和锁资源。',
      priority: 'high',
      completed: false,
      commands: [
        {
          label: '查看阻塞进程',
          command: 'SELECT * FROM information_schema.processlist WHERE Command = \'Query\' AND Time > 10;'
        },
        {
          label: '终止慢查询进程 (替换 ID)',
          command: 'KILL QUERY <process_id>;'
        }
      ],
      verification: '检查数据库活跃连接数是否下降，应用服务是否开始恢复。'
    },
    {
      title: '临时增加连接池大小',
      description: '作为短期缓解措施，增加应用的数据库连接池大小，防止再次耗尽。',
      priority: 'medium',
      completed: false,
      commands: [
        {
          label: '更新 ECS 任务定义环境变量',
          command: 'aws ecs register-task-definition --family prod-api --container-definitions \'[{"name":"api","environment":[{"name":"SPRING_DATASOURCE_HIKARI_MAXIMUM-POOL-SIZE","value":"100"}]}]\''
        }
      ],
      verification: '部署新版本后，确认 HikariCP 指标显示最大连接数已更新为 100。'
    }
  ],
  longterm: [
    {
      title: '优化数据库连接池配置',
      description: '根据数据库规格和业务需求，重新评估并优化连接池配置参数，包括最大连接数、最小空闲数、超时时间等。',
      completed: false,
      benefits: ['防止连接池雪崩', '提高资源利用率', '更稳定的数据库连接管理']
    },
    {
      title: '建立慢查询监控和告警',
      description: '配置数据库慢查询日志收集和分析，设置合理的告警阈值，及时发现性能问题。',
      completed: false,
      benefits: ['早期发现性能问题', '便于性能优化', '防止类似问题再次发生']
    },
    {
      title: '完善部署前性能测试流程',
      description: '在 CI/CD 流程中增加性能压力测试环节，确保新代码在大数据量场景下的性能表现符合预期。',
      completed: false,
      benefits: ['防止性能退化', '提高代码质量', '降低生产环境风险']
    },
    {
      title: '实现数据库连接池监控仪表盘',
      description: '建立实时监控仪表盘，展示连接池使用情况、等待队列、活跃连接等关键指标。',
      completed: false,
      benefits: ['实时可见性', '快速定位问题', '趋势分析']
    }
  ]
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

const chatMessages = ref([
  {
    role: 'assistant',
    type: 'analysis',
    time: '08:37:00',
    title: '事件分析完成',
    content: '我已完成对此次 ECS 服务中断事件的分析。根因已确认为未优化的 SQL 查询导致数据库连接池耗尽。',
    details: [
      '确认了问题 SQL 缺少联合索引',
      '分析了完整的故障传播链',
      '识别了 4 个主要促成因素',
      '生成了 3 个立即执行的修复建议',
      '制定了 4 个长期优化措施'
    ],
    suggestion: '建议优先执行"创建缺失的数据库索引"和"终止阻塞的慢查询进程"这两个高优先级修复。'
  }
])

const toggleTimelineView = () => {
  timelineView.value = timelineView.value === 'full' ? 'key' : 'full'
}

const handleRefresh = () => {
  ElMessage.info('正在刷新事件数据...')
}

const handleExport = () => {
  ElMessage.success('事件报告已开始导出')
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
  
  chatMessages.value.push(userMessage)
  const userInput = chatInput.value
  chatInput.value = ''
  isSending.value = true

  await scrollToBottom()

  const thinkingMsg = {
    role: 'assistant',
    type: 'thinking',
    time: new Date().toLocaleTimeString()
  }
  chatMessages.value.push(thinkingMsg)
  
  await scrollToBottom()

  await new Promise(resolve => setTimeout(resolve, 1500))

  chatMessages.value.pop()

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
  chatMessages.value.push({
    role: 'assistant',
    ...response,
    time: new Date().toLocaleTimeString()
  })

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

onMounted(() => {
  scrollToBottom()
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
