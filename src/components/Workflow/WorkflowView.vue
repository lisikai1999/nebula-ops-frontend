<template>
  <div class="workflow-page">
    <div class="page-header">
      <h2>工作流编排</h2>
      <p>创建和管理自动化工作流，支持 Jenkins、ECS、企业微信、Webhook 等步骤</p>
    </div>

    <el-tabs v-model="activeTab" class="workflow-tabs">
      <el-tab-pane label="工作流列表" name="list">
        <div class="list-container">
          <div class="list-header">
            <el-button type="primary" @click="showCreateDialog = true">
              <el-icon><Plus /></el-icon>
              创建工作流
            </el-button>
          </div>

          <el-table v-if="workflowStore.workflows.length > 0" :data="workflowStore.workflows" stripe>
            <el-table-column prop="name" label="名称" min-width="200">
              <template #default="scope">
                <span class="workflow-name">
                  <span class="workflow-icon">{{ getWorkflowIcon(scope.row) }}</span>
                  {{ scope.row.name }}
                </span>
              </template>
            </el-table-column>
            <el-table-column prop="description" label="描述" min-width="300" show-overflow-tooltip />
            <el-table-column label="步骤数" width="100" align="center">
              <template #default="scope">
                <el-tag size="small">{{ scope.row.steps?.length || 0 }}</el-tag>
              </template>
            </el-table-column>
            <el-table-column prop="createdAt" label="创建时间" width="180">
              <template #default="scope">
                {{ formatDate(scope.row.createdAt) }}
              </template>
            </el-table-column>
            <el-table-column label="操作" width="250" fixed="right">
              <template #default="scope">
                <el-button size="small" type="primary" @click="editWorkflow(scope.row.id)">
                  编辑
                </el-button>
                <el-button size="small" type="success" @click="runWorkflow(scope.row.id)">
                  执行
                </el-button>
                <el-button size="small" type="danger" text @click="confirmDelete(scope.row.id, scope.row.name)">
                  删除
                </el-button>
              </template>
            </el-table-column>
          </el-table>

          <el-empty v-else description="暂无工作流">
            <el-button type="primary" @click="showCreateDialog = true">
              创建第一个工作流
            </el-button>
          </el-empty>

          <el-divider />

          <div class="templates-section">
            <h3>工作流模板</h3>
            <el-row :gutter="20">
              <el-col :span="8" v-for="template in workflowStore.templates" :key="template.id">
                <el-card class="template-card" @click="createFromTemplate(template.id)" shadow="hover">
                  <div class="template-header">
                    <span class="template-icon">{{ template.icon }}</span>
                    <div>
                      <h4 class="template-name">{{ template.name }}</h4>
                      <span class="template-category">{{ template.category }}</span>
                    </div>
                  </div>
                  <p class="template-description">{{ template.description }}</p>
                  <div class="template-tags">
                    <el-tag v-for="tag in template.tags.slice(0, 3)" :key="tag" size="small" type="info">
                      {{ tag }}
                    </el-tag>
                    <span class="step-count">{{ template.steps?.length || 0 }} 个步骤</span>
                  </div>
                </el-card>
              </el-col>
            </el-row>
          </div>
        </div>
      </el-tab-pane>

      <el-tab-pane label="工作流编辑" name="edit" :disabled="!editingWorkflow">
        <div v-if="editingWorkflow" class="edit-container">
          <el-row :gutter="20">
            <el-col :span="8">
              <el-card>
                <template #header>
                  <div class="card-header">
                    <span>工作流信息</span>
                    <el-button size="small" type="primary" @click="saveWorkflow">
                      保存
                    </el-button>
                  </div>
                </template>

                <el-form label-width="80px" size="small">
                  <el-form-item label="名称">
                    <el-input v-model="editingWorkflow.name" placeholder="输入工作流名称" />
                  </el-form-item>
                  <el-form-item label="描述">
                    <el-input
                      v-model="editingWorkflow.description"
                      type="textarea"
                      :rows="2"
                      placeholder="输入工作流描述"
                    />
                  </el-form-item>
                </el-form>

                <el-divider />

                <el-card shadow="never" style="border: none; padding: 0;">
                  <template #header>
                    <div class="card-header">
                      <span>变量配置</span>
                      <el-button size="small" text @click="addVariable">
                        <el-icon><Plus /></el-icon>
                        添加变量
                      </el-button>
                    </div>
                  </template>
                  <el-table :data="variableList" size="small" style="width: 100%">
                    <el-table-column prop="key" label="变量名" width="120">
                      <template #default="scope">
                        <el-input v-model="scope.row.key" size="small" placeholder="key" />
                      </template>
                    </el-table-column>
                    <el-table-column prop="value" label="值">
                      <template #default="scope">
                        <el-input v-model="scope.row.value" size="small" placeholder="value" />
                      </template>
                    </el-table-column>
                    <el-table-column width="60" align="center">
                      <template #default="scope">
                        <el-button size="small" type="danger" link @click="removeVariable(scope.$index)">
                          <el-icon><Delete /></el-icon>
                        </el-button>
                      </template>
                    </el-table-column>
                  </el-table>
                  <p v-if="variableList.length === 0" style="text-align: center; color: #909399; font-size: 12px; padding: 16px;">
                    暂无变量，点击"添加变量"按钮创建。变量可在步骤配置中通过 {{变量名}} 使用。
                  </p>
                </el-card>

                <el-divider />

                <h4>添加步骤</h4>
                <div class="action-types">
                  <div
                    v-for="(info, type) in actionTypeInfo"
                    :key="type"
                    class="action-item"
                    @click="addStep(type)"
                  >
                    <span class="action-icon">{{ info.icon }}</span>
                    <div class="action-info">
                      <div class="action-name">{{ info.name }}</div>
                      <div class="action-desc">{{ info.description }}</div>
                    </div>
                  </div>
                </div>
              </el-card>
            </el-col>

            <el-col :span="16">
              <el-card>
                <template #header>
                  <div class="card-header">
                    <span>工作流步骤 ({{ editingWorkflow.steps?.length || 0 }})</span>
                    <el-button
                      v-if="editingWorkflow.steps?.length > 0"
                      size="small"
                      type="success"
                      @click="runWorkflow(editingWorkflow.id)"
                    >
                      执行工作流
                    </el-button>
                  </div>
                </template>

                <el-empty v-if="!editingWorkflow.steps || editingWorkflow.steps.length === 0" description="从左侧选择步骤类型添加" />

                <div v-else class="steps-list">
                  <div
                    v-for="(step, index) in editingWorkflow.steps"
                    :key="step.id"
                    class="step-item"
                    :class="{ 'step-selected': selectedStepId === step.id }"
                  >
                    <div class="step-header" @click="selectStep(step.id)">
                      <div class="step-left">
                        <span class="step-order">{{ index + 1 }}</span>
                        <span class="step-type-icon">{{ getStepIcon(step.actionType) }}</span>
                        <div class="step-info">
                          <div class="step-name">{{ step.name }}</div>
                          <el-tag size="small" type="info">{{ getStepTypeName(step.actionType) }}</el-tag>
                        </div>
                      </div>
                      <div class="step-actions">
                        <el-button
                          size="small"
                          text
                          @click.stop="moveStepUp(index)"
                          :disabled="index === 0"
                        >
                          <el-icon><ArrowUp /></el-icon>
                        </el-button>
                        <el-button
                          size="small"
                          text
                          @click.stop="moveStepDown(index)"
                          :disabled="index === editingWorkflow.steps.length - 1"
                        >
                          <el-icon><ArrowDown /></el-icon>
                        </el-button>
                        <el-button size="small" text type="danger" @click.stop="deleteStep(step.id)">
                          <el-icon><Delete /></el-icon>
                        </el-button>
                      </div>
                    </div>

                    <div v-if="selectedStepId === step.id" class="step-config">
                      <el-divider />
                      <el-form label-width="100px" size="small">
                        <el-form-item label="步骤名称">
                          <el-input v-model="step.name" />
                        </el-form-item>
                        <el-form-item label="描述">
                          <el-input v-model="step.description" type="textarea" :rows="2" />
                        </el-form-item>

                        <el-divider content-position="left">配置</el-divider>

                        <div v-if="step.actionType === 'jenkins_execute'">
                          <el-form-item label="Jenkins URL">
                            <el-input v-model="step.config.jenkinsUrl" placeholder="https://jenkins.example.com" />
                          </el-form-item>
                          <el-form-item label="Job 名称">
                            <el-input v-model="step.config.jobName" placeholder="my-job" />
                          </el-form-item>
                          <el-form-item label="用户名">
                            <el-input v-model="step.config.username" placeholder="admin (可选)" />
                          </el-form-item>
                          <el-form-item label="API Token">
                            <el-input
                              v-model="step.config.apiToken"
                              type="password"
                              placeholder="jenkins-api-token (可选)"
                              show-password
                            />
                          </el-form-item>
                          <el-form-item label="等待构建">
                            <el-switch v-model="step.config.waitForBuild" />
                          </el-form-item>
                          <el-form-item v-if="step.config.waitForBuild" label="轮询间隔(ms)">
                            <el-input-number v-model="step.config.pollInterval" :min="1000" :max="300000" />
                          </el-form-item>
                        </div>

                        <div v-else-if="step.actionType === 'aws_ecs_check'">
                          <el-form-item label="AWS 区域">
                            <el-select v-model="step.config.region" style="width: 100%">
                              <el-option label="China (Beijing)" value="cn-north-1" />
                              <el-option label="China (Ningxia)" value="cn-northwest-1" />
                              <el-option label="US East (N. Virginia)" value="us-east-1" />
                              <el-option label="US West (Oregon)" value="us-west-2" />
                              <el-option label="EU (Ireland)" value="eu-west-1" />
                            </el-select>
                          </el-form-item>
                          <el-form-item label="集群名称">
                            <el-input v-model="step.config.cluster" placeholder="my-cluster" />
                          </el-form-item>
                          <el-form-item label="服务名称">
                            <el-input v-model="step.config.serviceName" placeholder="my-service" />
                          </el-form-item>
                          <el-form-item label="期望任务数">
                            <el-input-number
                              v-model="step.config.expectedCount"
                              :min="0"
                              :max="1000"
                              :controls="false"
                              placeholder="留空使用当前 desired count"
                            />
                          </el-form-item>
                          <el-form-item label="检查间隔(ms)">
                            <el-input-number v-model="step.config.checkInterval" :min="5000" :max="300000" />
                          </el-form-item>
                          <el-form-item label="最大重试">
                            <el-input-number v-model="step.config.maxRetries" :min="1" :max="100" />
                          </el-form-item>
                        </div>

                        <div v-else-if="step.actionType === 'wework_notification'">
                          <el-form-item label="Webhook URL">
                            <el-input
                              v-model="step.config.webhookUrl"
                              placeholder="https://qyapi.weixin.qq.com/cgi-bin/webhook/send?key=xxx"
                            />
                          </el-form-item>
                          <el-form-item label="消息类型">
                            <el-select v-model="step.config.messageType" style="width: 100%">
                              <el-option label="文本消息" value="text" />
                              <el-option label="Markdown" value="markdown" />
                              <el-option label="图文消息" value="news" />
                              <el-option label="模板卡片" value="template_card" />
                            </el-select>
                          </el-form-item>
                          <el-form-item label="消息内容">
                            <el-input
                              v-model="step.config.content"
                              type="textarea"
                              :rows="4"
                              placeholder="支持变量占位符: {{variableName}}"
                            />
                          </el-form-item>
                          <el-form-item v-if="['news', 'template_card'].includes(step.config.messageType)" label="标题">
                            <el-input v-model="step.config.title" placeholder="消息标题" />
                          </el-form-item>
                          <el-form-item label="@所有人">
                            <el-switch v-model="step.config.mentionAll" />
                          </el-form-item>
                          <el-form-item v-if="!step.config.mentionAll" label="提及用户">
                            <el-input v-model="step.config.mentionsText" placeholder="user1,user2" />
                          </el-form-item>
                        </div>

                        <div v-else-if="step.actionType === 'webhook'">
                          <el-form-item label="URL">
                            <el-input v-model="step.config.url" placeholder="https://example.com/webhook" />
                          </el-form-item>
                          <el-form-item label="方法">
                            <el-select v-model="step.config.method" style="width: 100%">
                              <el-option label="GET" value="GET" />
                              <el-option label="POST" value="POST" />
                              <el-option label="PUT" value="PUT" />
                              <el-option label="DELETE" value="DELETE" />
                            </el-select>
                          </el-form-item>
                          <el-form-item label="请求头(JSON)">
                            <el-input
                              v-model="step.config.headersJson"
                              type="textarea"
                              :rows="2"
                              placeholder='{"Content-Type": "application/json"}'
                            />
                          </el-form-item>
                          <el-form-item label="请求体(JSON)">
                            <el-input
                              v-model="step.config.payloadJson"
                              type="textarea"
                              :rows="3"
                              placeholder='{"key": "value"}'
                            />
                          </el-form-item>
                        </div>

                        <el-divider content-position="left">高级</el-divider>

                        <el-form-item label="超时时间(秒)">
                          <el-input-number v-model="stepTimeoutSeconds" :min="1" :max="86400" />
                        </el-form-item>
                        <el-form-item label="启用重试">
                          <el-switch v-model="step.retryPolicy.enabled" />
                        </el-form-item>
                        <template v-if="step.retryPolicy.enabled">
                          <el-form-item label="重试次数">
                            <el-input-number v-model="step.retryPolicy.maxRetries" :min="1" :max="10" />
                          </el-form-item>
                          <el-form-item label="重试间隔(ms)">
                            <el-input-number v-model="step.retryPolicy.delay" :min="100" :max="60000" />
                          </el-form-item>
                        </template>
                      </el-form>
                    </div>
                  </div>
                </div>
              </el-card>
            </el-col>
          </el-row>
        </div>
      </el-tab-pane>

      <el-tab-pane label="执行历史" name="history">
        <div class="history-container">
          <el-table v-if="workflowStore.allExecutions.length > 0" :data="workflowStore.allExecutions" stripe>
            <el-table-column label="工作流" min-width="200">
              <template #default="scope">
                {{ scope.row.workflowSnapshot?.name || '未知工作流' }}
              </template>
            </el-table-column>
            <el-table-column label="状态" width="120" align="center">
              <template #default="scope">
                <el-tag :type="getStatusTagType(scope.row.status)" size="small">
                  {{ getStatusText(scope.row.status) }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column label="步骤数" width="100" align="center">
              <template #default="scope">
                {{ scope.row.workflowSnapshot?.steps?.length || 0 }}
              </template>
            </el-table-column>
            <el-table-column label="执行时间" width="180">
              <template #default="scope">
                {{ formatDate(scope.row.startTime) }}
              </template>
            </el-table-column>
            <el-table-column label="操作" width="150">
              <template #default="scope">
                <el-button size="small" type="primary" @click="viewExecution(scope.row)">
                  查看详情
                </el-button>
              </template>
            </el-table-column>
          </el-table>
          <el-empty v-else description="暂无执行历史" />
        </div>
      </el-tab-pane>

      <el-tab-pane label="执行结果" name="execute" :disabled="!workflowStore.currentExecution && !selectedExecution">
        <div v-if="workflowStore.currentExecution || selectedExecution" class="execute-container">
          <el-card>
            <template #header>
              <div class="card-header">
                <span>执行状态</span>
                <el-tag :type="getStatusTagType(activeExecution?.status)">
                  {{ getStatusText(activeExecution?.status) }}
                </el-tag>
              </div>
            </template>

            <el-row :gutter="20">
              <el-col :span="6">
                <div class="stat-item">
                  <div class="stat-value">{{ activeExecution?.workflowSnapshot?.steps?.length || 0 }}</div>
                  <div class="stat-label">总步骤</div>
                </div>
              </el-col>
              <el-col :span="6">
                <div class="stat-item">
                  <div class="stat-value success">{{ completedSteps }}</div>
                  <div class="stat-label">已完成</div>
                </div>
              </el-col>
              <el-col :span="6">
                <div class="stat-item">
                  <div class="stat-value danger">{{ failedSteps }}</div>
                  <div class="stat-label">失败</div>
                </div>
              </el-col>
              <el-col :span="6">
                <div class="stat-item">
                  <div class="stat-value">{{ runningSteps }}</div>
                  <div class="stat-label">执行中</div>
                </div>
              </el-col>
            </el-row>
          </el-card>

          <el-row :gutter="20" style="margin-top: 20px;">
            <el-col :span="12">
              <el-card>
                <template #header>
                  <div class="card-header">
                    <span>步骤状态</span>
                    <span style="font-size: 12px; color: #909399;">点击步骤查看输出</span>
                  </div>
                </template>
                <div class="step-status-list">
                  <div
                    v-for="step in activeExecution?.workflowSnapshot?.steps || []"
                    :key="step.id"
                    class="step-status-item"
                    :class="{ 'step-status-expanded': selectedStepForDetail === step.id }"
                    @click="toggleStepDetail(step.id)"
                  >
                    <div class="step-status-main">
                      <span class="step-status-icon" :class="getStepStatusClass(getStepStatus(step.id))">
                        <el-icon>
                          <component :is="getStepStatusIcon(getStepStatus(step.id))" />
                        </el-icon>
                      </span>
                      <div class="step-status-info">
                        <div class="step-status-name">{{ step.name }}</div>
                        <div class="step-status-time">
                          {{ getStepStatusText(getStepStatus(step.id)) }}
                          <span v-if="getStepDuration(step.id)" class="step-duration">
                            · {{ getStepDuration(step.id) }}
                          </span>
                        </div>
                      </div>
                      <div class="step-status-expand">
                        <el-icon v-if="hasStepResult(step.id)">
                          <component :is="selectedStepForDetail === step.id ? 'CaretTop' : 'CaretBottom'" />
                        </el-icon>
                      </div>
                    </div>

                    <div
                      v-if="selectedStepForDetail === step.id && hasStepResult(step.id)"
                      class="step-detail-container"
                    >
                      <el-card class="step-detail-card" shadow="never">
                        <template #header>
                          <div class="step-detail-header">
                            <span class="step-detail-title">步骤输出</span>
                            <el-tag :type="getStatusTagType(getStepStatus(step.id))" size="small">
                              {{ getStepStatusText(getStepStatus(step.id)) }}
                            </el-tag>
                          </div>
                        </template>

                        <div class="step-detail-content">
                          <template v-if="getStepResult(step.id)">
                            <div v-if="getStepResult(step.id).content" class="step-output-section">
                              <div class="step-output-label">输出内容：</div>
                              <pre class="step-output-content">{{ getStepResult(step.id).content }}</pre>
                            </div>

                            <div
                              v-if="getStepResult(step.id).data && Object.keys(getStepResult(step.id).data).length > 0"
                              class="step-output-section"
                            >
                              <div class="step-output-label">详细数据：</div>
                              <pre class="step-output-content">{{ formatStepData(getStepResult(step.id).data) }}</pre>
                            </div>

                            <div
                              v-if="getStepResult(step.id).error || getStepStatusObject(step.id)?.error"
                              class="step-output-section step-output-error"
                            >
                              <div class="step-output-label">错误信息：</div>
                              <pre class="step-output-content">{{ getStepResult(step.id).error || getStepStatusObject(step.id)?.error }}</pre>
                            </div>

                            <div
                              v-if="!getStepResult(step.id).content && !getStepResult(step.id).data && !getStepResult(step.id).error && !getStepStatusObject(step.id)?.error"
                              class="step-output-empty"
                            >
                              该步骤暂无输出内容
                            </div>
                          </template>
                        </div>
                      </el-card>
                    </div>
                  </div>
                </div>
              </el-card>
            </el-col>

            <el-col :span="12">
              <el-card>
                <template #header>
                  <span>执行日志</span>
                </template>
                <div class="log-container">
                  <div v-for="(log, index) in executionLogs" :key="index" class="log-item">
                    <span class="log-time">{{ formatDate(log.timestamp) }}</span>
                    <el-tag v-if="log.type" size="small" :type="getLogType(log.type)">
                      {{ log.type }}
                    </el-tag>
                    <span class="log-message">{{ log.stepName || log.message }}</span>
                  </div>
                  <div v-if="executionLogs.length === 0" class="log-empty">
                    等待执行...
                  </div>
                </div>
              </el-card>
            </el-col>
          </el-row>
        </div>
      </el-tab-pane>
    </el-tabs>

    <el-dialog v-model="showCreateDialog" title="创建工作流" width="500px">
      <el-form label-width="100px">
        <el-form-item label="创建方式">
          <el-radio-group v-model="createMode">
            <el-radio value="template">从模板创建</el-radio>
            <el-radio value="empty">创建空工作流</el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item v-if="createMode === 'template'" label="选择模板">
          <el-select v-model="selectedTemplate" placeholder="选择一个模板" style="width: 100%">
            <el-option
              v-for="template in workflowStore.templates"
              :key="template.id"
              :label="template.name"
              :value="template.id"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="工作流名称">
          <el-input v-model="newWorkflowName" placeholder="输入工作流名称" />
        </el-form-item>
        <el-form-item label="描述">
          <el-input v-model="newWorkflowDescription" type="textarea" :rows="2" placeholder="可选" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showCreateDialog = false">取消</el-button>
        <el-button type="primary" @click="createWorkflow">创建</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  Plus, ArrowUp, ArrowDown, Delete,
  Timer, Loading, CircleCheck, CircleClose, Minus,
  CaretTop, CaretBottom
} from '@element-plus/icons-vue'
import { useWorkflowStore } from '@/stores/workflow-store'
import { ActionType, ActionTypeInfo, WorkflowStatus, StepStatus } from '@/services/workflow-engine'

const workflowStore = useWorkflowStore()

const activeTab = ref('list')
const editingWorkflow = ref(null)
const selectedStepId = ref(null)
const selectedExecution = ref(null)
const selectedStepForDetail = ref(null)
const showCreateDialog = ref(false)
const createMode = ref('template')
const selectedTemplate = ref(null)
const newWorkflowName = ref('')
const newWorkflowDescription = ref('')
const variableList = ref([])

const actionTypeInfo = computed(() => {
  const filtered = {}
  const requiredTypes = [
    ActionType.JENKINS_EXECUTE,
    ActionType.AWS_ECS_CHECK,
    ActionType.WEWORK_NOTIFICATION,
    ActionType.WEBHOOK
  ]
  requiredTypes.forEach(type => {
    if (ActionTypeInfo[type]) {
      filtered[type] = ActionTypeInfo[type]
    }
  })
  return filtered
})

const activeExecution = computed(() => {
  return selectedExecution.value || workflowStore.currentExecution
})

const executionLogs = computed(() => {
  if (selectedExecution.value) {
    return selectedExecution.value.logs || []
  }
  return workflowStore.executionLogs
})

const stepStatuses = computed(() => {
  if (!activeExecution.value) return {}
  return activeExecution.value.stepStatuses || {}
})

const completedSteps = computed(() => {
  return Object.values(stepStatuses.value).filter(s => s.status === StepStatus.COMPLETED).length
})

const failedSteps = computed(() => {
  return Object.values(stepStatuses.value).filter(s => s.status === StepStatus.FAILED).length
})

const runningSteps = computed(() => {
  return Object.values(stepStatuses.value).filter(s => s.status === StepStatus.RUNNING).length
})

const stepTimeoutSeconds = computed({
  get() {
    if (selectedStepId.value && editingWorkflow.value) {
      const step = editingWorkflow.value.steps?.find(s => s.id === selectedStepId.value)
      return step?.timeout ? Math.floor(step.timeout / 1000) : 300
    }
    return 300
  },
  set(val) {
    if (selectedStepId.value && editingWorkflow.value) {
      const step = editingWorkflow.value.steps?.find(s => s.id === selectedStepId.value)
      if (step) {
        step.timeout = val * 1000
      }
    }
  }
})

onMounted(() => {
  workflowStore.loadTemplates()
  workflowStore.loadWorkflows()
})

function formatDate(dateString) {
  if (!dateString) return ''
  const date = new Date(dateString)
  return date.toLocaleString('zh-CN')
}

function getWorkflowIcon(workflow) {
  if (workflow.templateId) {
    const template = workflowStore.templates.find(t => t.id === workflow.templateId)
    return template?.icon || '📋'
  }
  return '📋'
}

function getStepIcon(actionType) {
  return ActionTypeInfo[actionType]?.icon || '⚙️'
}

function getStepTypeName(actionType) {
  return ActionTypeInfo[actionType]?.name || actionType
}

function getStepStatus(stepId) {
  if (!activeExecution.value) return StepStatus.PENDING
  const status = activeExecution.value.stepStatuses?.[stepId]
  return status?.status || StepStatus.PENDING
}

function getStepStatusText(status) {
  const texts = {
    [StepStatus.PENDING]: '等待执行',
    [StepStatus.RUNNING]: '执行中',
    [StepStatus.COMPLETED]: '已完成',
    [StepStatus.FAILED]: '失败',
    [StepStatus.SKIPPED]: '已跳过'
  }
  return texts[status] || status
}

function getStepStatusClass(status) {
  const classes = {
    [StepStatus.PENDING]: 'step-status-pending',
    [StepStatus.RUNNING]: 'step-status-running',
    [StepStatus.COMPLETED]: 'step-status-completed',
    [StepStatus.FAILED]: 'step-status-failed',
    [StepStatus.SKIPPED]: 'step-status-skipped'
  }
  return classes[status] || 'step-status-pending'
}

function getStepStatusIcon(status) {
  const icons = {
    [StepStatus.PENDING]: 'Timer',
    [StepStatus.RUNNING]: 'Loading',
    [StepStatus.COMPLETED]: 'CircleCheck',
    [StepStatus.FAILED]: 'CircleClose',
    [StepStatus.SKIPPED]: 'Minus'
  }
  return icons[status] || 'Timer'
}

function getStatusTagType(status) {
  const types = {
    [WorkflowStatus.IDLE]: 'info',
    [WorkflowStatus.RUNNING]: 'primary',
    [WorkflowStatus.PAUSED]: 'warning',
    [WorkflowStatus.COMPLETED]: 'success',
    [WorkflowStatus.FAILED]: 'danger',
    [WorkflowStatus.CANCELLED]: 'info'
  }
  return types[status] || 'info'
}

function getStatusText(status) {
  const texts = {
    [WorkflowStatus.IDLE]: '空闲',
    [WorkflowStatus.RUNNING]: '执行中',
    [WorkflowStatus.PAUSED]: '已暂停',
    [WorkflowStatus.COMPLETED]: '已完成',
    [WorkflowStatus.FAILED]: '失败',
    [WorkflowStatus.CANCELLED]: '已取消'
  }
  return texts[status] || status
}

function getLogType(type) {
  const types = {
    'step_started': 'primary',
    'step_completed': 'success',
    'step_failed': 'danger',
    'step_retry': 'warning',
    'workflow_started': 'primary',
    'workflow_completed': 'success',
    'workflow_failed': 'danger'
  }
  return types[type] || 'info'
}

function editWorkflow(id) {
  const workflow = workflowStore.getWorkflow(id)
  if (workflow) {
    editingWorkflow.value = JSON.parse(JSON.stringify(workflow))
    selectedStepId.value = null
    activeTab.value = 'edit'
  }
}

function saveWorkflow() {
  if (!editingWorkflow.value) return
  
  workflowStore.updateWorkflow(editingWorkflow.value.id, {
    name: editingWorkflow.value.name,
    description: editingWorkflow.value.description,
    steps: editingWorkflow.value.steps,
    variables: editingWorkflow.value.variables,
    updatedAt: new Date().toISOString()
  })
  
  ElMessage.success('工作流已保存')
}

function addVariable() {
  if (!variableList.value) {
    variableList.value = []
  }
  variableList.value.push({ key: '', value: '' })
}

function removeVariable(index) {
  if (variableList.value) {
    variableList.value.splice(index, 1)
  }
}

function getDefaultConfig(actionType) {
  const defaults = {
    [ActionType.JENKINS_EXECUTE]: {
      jenkinsUrl: '',
      jobName: '',
      username: '',
      apiToken: '',
      parameters: {},
      waitForBuild: true,
      pollInterval: 5000,
      timeout: 300000
    },
    [ActionType.AWS_ECS_CHECK]: {
      region: 'cn-north-1',
      cluster: '',
      serviceName: '',
      expectedCount: null,
      checkInterval: 30000,
      maxRetries: 10,
      accessKeyId: '',
      secretAccessKey: ''
    },
    [ActionType.WEWORK_NOTIFICATION]: {
      webhookUrl: '',
      messageType: 'text',
      content: '',
      title: '',
      description: '',
      url: '',
      picUrl: '',
      mentions: [],
      mentionsText: '',
      mentionAll: false
    },
    [ActionType.WEBHOOK]: {
      url: '',
      method: 'POST',
      headers: {},
      headersJson: '{}',
      payload: {},
      payloadJson: '{}',
      timeout: 30000
    },
    [ActionType.DELAY]: {
      delay: 1000,
      requireApproval: false
    },
    [ActionType.CONDITION]: {
      condition: ''
    }
  }
  return defaults[actionType] || {}
}

function addStep(actionType) {
  if (!editingWorkflow.value) return
  
  const step = {
    id: `step_${Date.now()}`,
    name: ActionTypeInfo[actionType]?.name || '新步骤',
    actionType: actionType,
    config: getDefaultConfig(actionType),
    description: '',
    dependsOn: [],
    retryPolicy: {
      enabled: false,
      maxRetries: 3,
      delay: 1000
    },
    timeout: 300000
  }
  
  if (!editingWorkflow.value.steps) {
    editingWorkflow.value.steps = []
  }
  editingWorkflow.value.steps.push(step)
  selectedStepId.value = step.id
  
  ElMessage.success('步骤已添加')
}

function selectStep(stepId) {
  selectedStepId.value = selectedStepId.value === stepId ? null : stepId
}

function deleteStep(stepId) {
  ElMessageBox.confirm('确定要删除此步骤吗？', '提示', {
    confirmButtonText: '确定',
    cancelButtonText: '取消',
    type: 'warning'
  }).then(() => {
    if (editingWorkflow.value && editingWorkflow.value.steps) {
      const index = editingWorkflow.value.steps.findIndex(s => s.id === stepId)
      if (index !== -1) {
        editingWorkflow.value.steps.splice(index, 1)
        if (selectedStepId.value === stepId) {
          selectedStepId.value = null
        }
        ElMessage.success('步骤已删除')
      }
    }
  }).catch(() => {})
}

function moveStepUp(index) {
  if (index <= 0 || !editingWorkflow.value?.steps) return
  const steps = editingWorkflow.value.steps
  const temp = steps[index]
  steps[index] = steps[index - 1]
  steps[index - 1] = temp
}

function moveStepDown(index) {
  if (!editingWorkflow.value?.steps || index >= editingWorkflow.value.steps.length - 1) return
  const steps = editingWorkflow.value.steps
  const temp = steps[index]
  steps[index] = steps[index + 1]
  steps[index + 1] = temp
}

function createWorkflow() {
  if (!newWorkflowName.value.trim()) {
    ElMessage.warning('请输入工作流名称')
    return
  }
  
  try {
    let workflow
    if (createMode.value === 'template' && selectedTemplate.value) {
      workflow = workflowStore.createWorkflow(selectedTemplate.value, {
        name: newWorkflowName.value,
        description: newWorkflowDescription.value
      })
    } else {
      workflow = workflowStore.createEmptyWorkflow(
        newWorkflowName.value,
        newWorkflowDescription.value
      )
    }
    
    ElMessage.success('工作流创建成功')
    showCreateDialog.value = false
    
    editingWorkflow.value = workflow
    activeTab.value = 'edit'
    
    newWorkflowName.value = ''
    newWorkflowDescription.value = ''
    selectedTemplate.value = null
    
  } catch (error) {
    ElMessage.error(`创建失败: ${error.message}`)
  }
}

function createFromTemplate(templateId) {
  createMode.value = 'template'
  selectedTemplate.value = templateId
  const template = workflowStore.templates.find(t => t.id === templateId)
  if (template) {
    newWorkflowName.value = template.name
    newWorkflowDescription.value = template.description
  }
  showCreateDialog.value = true
}

function confirmDelete(id, name) {
  ElMessageBox.confirm(`确定要删除工作流 "${name}" 吗？`, '提示', {
    confirmButtonText: '确定',
    cancelButtonText: '取消',
    type: 'warning'
  }).then(() => {
    workflowStore.deleteWorkflow(id)
    ElMessage.success('工作流已删除')
    if (editingWorkflow.value?.id === id) {
      editingWorkflow.value = null
      selectedStepId.value = null
      activeTab.value = 'list'
    }
  }).catch(() => {})
}

async function runWorkflow(id) {
  try {
    workflowStore.clearExecutionState()
    selectedExecution.value = null
    
    ElMessage.info('工作流开始执行')
    activeTab.value = 'execute'
    
    const result = await workflowStore.executeWorkflow(id)
    
    if (result.success) {
      ElMessage.success('工作流执行完成')
    } else {
      ElMessage.error(`工作流执行失败: ${result.error}`)
    }
    
  } catch (error) {
    ElMessage.error(`执行失败: ${error.message}`)
  }
}

function viewExecution(execution) {
  selectedExecution.value = execution
  activeTab.value = 'execute'
}

function toggleStepDetail(stepId) {
  if (selectedStepForDetail.value === stepId) {
    selectedStepForDetail.value = null
  } else {
    selectedStepForDetail.value = stepId
  }
}

function hasStepResult(stepId) {
  if (!activeExecution.value) return false
  return activeExecution.value.stepResults?.[stepId] !== undefined ||
         activeExecution.value.stepStatuses?.[stepId]?.error
}

function getStepResult(stepId) {
  if (!activeExecution.value) return null
  return activeExecution.value.stepResults?.[stepId] || null
}

function getStepStatusObject(stepId) {
  if (!activeExecution.value) return null
  return activeExecution.value.stepStatuses?.[stepId] || null
}

function getStepDuration(stepId) {
  const stepStatus = getStepStatusObject(stepId)
  if (!stepStatus || !stepStatus.startTime) return null
  
  const endTime = stepStatus.endTime || Date.now()
  const duration = endTime - stepStatus.startTime
  
  if (duration < 1000) {
    return `${duration}ms`
  } else if (duration < 60000) {
    return `${(duration / 1000).toFixed(1)}s`
  } else {
    return `${(duration / 60000).toFixed(1)}m`
  }
}

function formatStepData(data) {
  try {
    return JSON.stringify(data, null, 2)
  } catch {
    return String(data)
  }
}

watch(editingWorkflow, (newWorkflow) => {
  if (newWorkflow) {
    variableList.value = Object.entries(newWorkflow.variables || {}).map(([key, value]) => ({ key, value }))
  } else {
    variableList.value = []
  }
})

watch(variableList, (newList) => {
  if (editingWorkflow.value) {
    editingWorkflow.value.variables = {}
    newList.forEach(item => {
      if (item.key) {
        editingWorkflow.value.variables[item.key] = item.value
      }
    })
  }
}, { deep: true })

watch(activeTab, (newVal) => {
  if (newVal !== 'edit') {
    selectedStepId.value = null
  }
  if (newVal !== 'execute') {
    selectedExecution.value = null
    selectedStepForDetail.value = null
  }
})
</script>

<style scoped>
.workflow-page {
  padding: 0;
}

.page-header {
  margin-bottom: 20px;
}

.page-header h2 {
  margin: 0 0 8px 0;
  font-size: 20px;
  color: #303133;
}

.page-header p {
  margin: 0;
  color: #909399;
  font-size: 14px;
}

.workflow-tabs {
  margin-bottom: 20px;
}

.list-header {
  margin-bottom: 16px;
  display: flex;
  justify-content: flex-end;
}

.templates-section {
  margin-top: 20px;
}

.templates-section h3 {
  margin: 0 0 16px 0;
  font-size: 16px;
  color: #303133;
}

.template-card {
  cursor: pointer;
  transition: all 0.3s;
}

.template-card:hover {
  border-color: #409eff;
  transform: translateY(-2px);
}

.template-header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 12px;
}

.template-icon {
  font-size: 32px;
}

.template-name {
  margin: 0;
  font-size: 15px;
  font-weight: 600;
  color: #303133;
}

.template-category {
  font-size: 12px;
  color: #909399;
}

.template-description {
  margin: 0 0 12px 0;
  font-size: 13px;
  color: #606266;
  line-height: 1.5;
}

.template-tags {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.step-count {
  font-size: 12px;
  color: #909399;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.action-types {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.action-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  border: 1px solid #e4e7ed;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.3s;
}

.action-item:hover {
  border-color: #409eff;
  background-color: #f0f9ff;
}

.action-icon {
  font-size: 24px;
}

.action-info {
  flex: 1;
}

.action-name {
  font-size: 14px;
  font-weight: 500;
  color: #303133;
}

.action-desc {
  font-size: 12px;
  color: #909399;
}

.steps-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.step-item {
  border: 1px solid #e4e7ed;
  border-radius: 8px;
  padding: 16px;
  transition: all 0.3s;
}

.step-item.step-selected {
  border-color: #409eff;
  background-color: #f0f9ff;
}

.step-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  cursor: pointer;
}

.step-left {
  display: flex;
  align-items: center;
  gap: 12px;
}

.step-order {
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

.step-type-icon {
  font-size: 24px;
}

.step-info {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.step-name {
  font-size: 14px;
  font-weight: 500;
  color: #303133;
}

.step-actions {
  display: flex;
  gap: 4px;
}

.step-config {
  margin-top: 16px;
}

.workflow-name {
  display: flex;
  align-items: center;
  gap: 8px;
}

.workflow-icon {
  font-size: 18px;
}

.history-container,
.execute-container {
  padding: 0;
}

.stat-item {
  text-align: center;
  padding: 16px;
}

.stat-value {
  font-size: 28px;
  font-weight: 700;
  color: #303133;
}

.stat-value.success {
  color: #67c23a;
}

.stat-value.danger {
  color: #f56c6c;
}

.stat-label {
  font-size: 14px;
  color: #909399;
  margin-top: 4px;
}

.step-status-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.step-status-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 8px;
  border-radius: 4px;
  transition: background-color 0.3s;
}

.step-status-item:hover {
  background-color: #f5f7fa;
}

.step-status-icon {
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
}

.step-status-pending {
  color: #909399;
}

.step-status-running {
  color: #409eff;
  animation: pulse 1.5s ease-in-out infinite;
}

.step-status-completed {
  color: #67c23a;
}

.step-status-failed {
  color: #f56c6c;
}

.step-status-skipped {
  color: #909399;
}

.step-status-name {
  font-size: 14px;
  font-weight: 500;
  color: #303133;
}

.step-status-time {
  font-size: 12px;
  color: #909399;
  margin-top: 2px;
}

.log-container {
  max-height: 400px;
  overflow-y: auto;
  font-family: 'Consolas', 'Monaco', monospace;
  font-size: 13px;
}

.log-item {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  padding: 8px 0;
  border-bottom: 1px solid #f0f2f5;
}

.log-time {
  color: #909399;
  flex-shrink: 0;
  font-size: 12px;
}

.log-message {
  color: #303133;
  word-break: break-all;
}

.log-empty {
  text-align: center;
  padding: 40px;
  color: #909399;
}

.step-status-item {
  cursor: pointer;
  transition: all 0.3s;
  border-radius: 8px;
}

.step-status-item:hover {
  background-color: #f5f7fa;
}

.step-status-item.step-status-expanded {
  background-color: #f0f9ff;
  border: 1px solid #9ec8ff;
}

.step-status-main {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 8px;
}

.step-status-expand {
  margin-left: auto;
  color: #909399;
  transition: transform 0.3s;
}

.step-duration {
  color: #606266;
}

.step-detail-container {
  margin-top: 8px;
  border-top: 1px solid #e4e7ed;
  padding-top: 12px;
}

.step-detail-card {
  background-color: #fff;
  border: 1px solid #ebeef5;
  margin: 0 8px 8px 8px;
}

.step-detail-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.step-detail-title {
  font-weight: 600;
  color: #303133;
}

.step-detail-content {
  padding: 8px 0;
}

.step-output-section {
  margin-bottom: 16px;
}

.step-output-section:last-child {
  margin-bottom: 0;
}

.step-output-section.step-output-error {
  padding: 12px;
  background-color: #fef0f0;
  border-radius: 6px;
  border: 1px solid #fde2e2;
}

.step-output-section.step-output-error .step-output-label {
  color: #f56c6c;
}

.step-output-label {
  font-size: 13px;
  font-weight: 600;
  color: #606266;
  margin-bottom: 8px;
}

.step-output-content {
  background-color: #1e1e1e;
  color: #d4d4d4;
  padding: 12px;
  border-radius: 6px;
  font-family: 'Consolas', 'Monaco', monospace;
  font-size: 13px;
  line-height: 1.5;
  white-space: pre-wrap;
  word-break: break-all;
  max-height: 300px;
  overflow-y: auto;
  margin: 0;
}

.step-output-empty {
  text-align: center;
  padding: 24px;
  color: #909399;
  font-size: 14px;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}
</style>
