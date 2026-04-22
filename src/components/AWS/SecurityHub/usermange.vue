<script>
export default {
    name: 'UserManage',
    data() {
        return {
            users: [],
            loading: true,
            searchValue: '',
            currentPage: 1,
            pageSize: 10,
            multipleSelection: [],
            disableLoading: {}
        };
    },
    computed: {
        filteredUsers() {
            if (!this.searchValue) {
                return this.users;
            }
            const searchLower = this.searchValue.toLowerCase();
            return this.users.filter(user => 
                user.username.toLowerCase().includes(searchLower) ||
                user.env.toLowerCase().includes(searchLower) ||
                user.email.toLowerCase().includes(searchLower) ||
                user.days_since_last_login.toString().includes(searchLower)
            );
        },
        paginatedUsers() {
            const start = (this.currentPage - 1) * this.pageSize;
            const end = start + this.pageSize;
            return this.filteredUsers.slice(start, end);
        },
        totalUsers() {
            return this.filteredUsers.length;
        }
    },
    methods: {
        async get_user_info() {
            this.loading = true;
            try {
                const response = await axios.get('/api/aws/get_user_info');
                if (response.status === 200) {
                    this.users = response.data;
                }
            } catch (error) {
                console.error('获取用户信息失败:', error);
                this.$message.error('获取用户信息失败');
            } finally {
                this.loading = false;
            }
        },
        async disable_console(username, env) {
            try {
                await this.$confirm(`确认禁用 ${env}:${username} 的控制台权限?`, '确认操作', {
                    confirmButtonText: '确定',
                    cancelButtonText: '取消',
                    type: 'warning'
                });

                this.disableLoading[`${env}-${username}`] = true;
                const params = new URLSearchParams();
                params.append('env', env);

                const csrftoken = document.cookie.match(/csrftoken=([\w-]+)/)?.[1];

                await axios.post("/aws/disable_console/" + username, params, {
                    headers: {
                        'X-CSRFToken': csrftoken
                    }
                });

                this.$message.success(`禁用 ${env}:${username} 成功`);
            } catch (error) {
                if (error !== 'cancel') {
                    console.error('禁用控制台失败:', error);
                    this.$message.error(`禁用 ${env}:${username} 失败`);
                }
            } finally {
                this.disableLoading[`${env}-${username}`] = false;
            }
        },
        async reset_password(username, env) {
            try {
                await this.$confirm(`确认重置 ${env}:${username} 的密码?`, '确认操作', {
                    confirmButtonText: '确定',
                    cancelButtonText: '取消',
                    type: 'warning'
                });

                this.disableLoading[`reset-${env}-${username}`] = true;
                const params = new URLSearchParams();
                params.append('env', env);

                var csrfToken = document.querySelector('[name="csrfmiddlewaretoken"]')?.value;
                if (!csrfToken) {
                    csrfToken = document.cookie.match(/csrftoken=([\w-]+)/)?.[1];
                }

                await axios.post("/aws/reset_password/" + username, params, {
                    headers: {
                        'X-CSRFToken': csrfToken
                    }
                });

                this.$message.success(`重置 ${env}:${username} 密码成功`);
            } catch (error) {
                if (error !== 'cancel') {
                    console.error('重置密码失败:', error);
                    this.$message.error(`重置 ${env}:${username} 密码失败`);
                }
            } finally {
                this.disableLoading[`reset-${env}-${username}`] = false;
            }
        },
        getDaysTagType(days) {
            if (days >= 90) return 'danger';
            if (days >= 60) return 'warning';
            if (days >= 30) return 'info';
            return 'success';
        },
        handleSelectionChange(val) {
            this.multipleSelection = val;
        },
        handleSizeChange(val) {
            this.pageSize = val;
            this.currentPage = 1;
        },
        handleCurrentChange(val) {
            this.currentPage = val;
        },
        formatDate(date) {
            if (!date) return '-';
            return new Date(date).toLocaleDateString('zh-CN');
        }
    },
    mounted() {
        this.get_user_info();
    }
};
</script>

<template>
    <div class="user-manage-page">
        <el-card class="page-header-card" shadow="never">
            <div class="page-header">
                <div class="header-left">
                    <el-icon class="header-icon"><User /></el-icon>
                    <h1 class="page-title">超时未登录用户</h1>
                    <el-tag v-if="!loading" type="info" effect="plain">
                        共 {{ totalUsers }} 条记录
                    </el-tag>
                </div>
                <div class="header-right">
                    <el-input
                        v-model="searchValue"
                        placeholder="搜索用户名、环境、邮箱..."
                        style="width: 300px"
                        clearable
                    >
                        <template #prefix>
                            <el-icon><Search /></el-icon>
                        </template>
                    </el-input>
                    <el-button type="primary" @click="get_user_info">
                        <el-icon><Refresh /></el-icon>
                        刷新数据
                    </el-button>
                </div>
            </div>
        </el-card>

        <el-card class="table-card" shadow="never">
            <template #header>
                <div class="table-header">
                    <span>AWS 用户数据</span>
                    <div v-if="multipleSelection.length > 0" class="selection-info">
                        <el-tag type="primary">已选 {{ multipleSelection.length }} 项</el-tag>
                    </div>
                </div>
            </template>

            <div v-loading="loading" element-loading-text="正在加载用户数据..." element-loading-spinner="el-icon-loading" element-loading-background="rgba(255, 255, 255, 0.8)">
                <el-table
                    :data="paginatedUsers"
                    style="width: 100%"
                    :stripe="true"
                    :border="true"
                    @selection-change="handleSelectionChange"
                    v-loading="loading"
                    empty-text="暂无数据"
                >
                    <el-table-column type="selection" width="55" align="center" />
                    
                    <el-table-column prop="username" label="用户名" min-width="150" sortable>
                        <template #default="{ row }">
                            <div class="username-cell">
                                <el-avatar :size="32" class="user-avatar">
                                    <el-icon><User /></el-icon>
                                </el-avatar>
                                <span class="username-text">{{ row.username }}</span>
                            </div>
                        </template>
                    </el-table-column>
                    
                    <el-table-column prop="env" label="环境" width="120" align="center">
                        <template #default="{ row }">
                            <el-tag :type="getEnvTagType(row.env)" effect="plain" size="small">
                                {{ row.env }}
                            </el-tag>
                        </template>
                    </el-table-column>
                    
                    <el-table-column prop="email" label="邮箱" min-width="200" show-overflow-tooltip>
                        <template #default="{ row }">
                            <div class="email-cell">
                                <el-icon class="email-icon"><Message /></el-icon>
                                <span>{{ row.email }}</span>
                            </div>
                        </template>
                    </el-table-column>
                    
                    <el-table-column prop="days_since_last_login" label="未登录天数" width="130" align="center" sortable>
                        <template #default="{ row }">
                            <el-tag :type="getDaysTagType(row.days_since_last_login)" effect="dark">
                                {{ row.days_since_last_login }} 天
                            </el-tag>
                        </template>
                    </el-table-column>
                    
                    <el-table-column label="操作" width="200" align="center" fixed="right">
                        <template #default="{ row }">
                            <div class="action-buttons">
                                <el-button
                                    type="warning"
                                    size="small"
                                    :loading="disableLoading[`${row.env}-${row.username}`]"
                                    @click="disable_console(row.username, row.env)"
                                >
                                    <el-icon><Lock /></el-icon>
                                    禁用控制台
                                </el-button>
                                <el-button
                                    type="primary"
                                    size="small"
                                    :loading="disableLoading[`reset-${row.env}-${row.username}`]"
                                    @click="reset_password(row.username, row.env)"
                                >
                                    <el-icon><Key /></el-icon>
                                    重置密码
                                </el-button>
                            </div>
                        </template>
                    </el-table-column>
                </el-table>

                <el-pagination
                    v-if="!loading && totalUsers > 0"
                    class="pagination-container"
                    background
                    layout="total, sizes, prev, pager, next, jumper"
                    :total="totalUsers"
                    :page-size="pageSize"
                    :current-page="currentPage"
                    :page-sizes="[10, 20, 50, 100]"
                    @size-change="handleSizeChange"
                    @current-change="handleCurrentChange"
                />
            </div>
        </el-card>

        <el-empty v-if="!loading && users.length === 0" description="暂无超时未登录用户数据" />
    </div>
</template>

<script setup>
import { User, Search, Refresh, Lock, Key, Message } from '@element-plus/icons-vue';

const getEnvTagType = (env) => {
    const envLower = env.toLowerCase();
    if (envLower.includes('prod') || envLower.includes('生产')) return 'danger';
    if (envLower.includes('staging') || envLower.includes('预发布')) return 'warning';
    if (envLower.includes('dev') || envLower.includes('开发')) return 'success';
    if (envLower.includes('uat')) return 'info';
    return 'info';
};
</script>

<style scoped>
.user-manage-page {
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

.table-card {
    border-radius: 8px;
}

.table-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    font-size: 16px;
    font-weight: 600;
    color: #303133;
}

.selection-info {
    display: flex;
    align-items: center;
}

.username-cell {
    display: flex;
    align-items: center;
    gap: 10px;
}

.user-avatar {
    background-color: #409EFF;
    display: flex;
    align-items: center;
    justify-content: center;
}

.username-text {
    font-weight: 500;
    color: #303133;
}

.email-cell {
    display: flex;
    align-items: center;
    gap: 6px;
    color: #606266;
}

.email-icon {
    color: #909399;
}

.action-buttons {
    display: flex;
    gap: 8px;
    justify-content: center;
}

.pagination-container {
    margin-top: 24px;
    display: flex;
    justify-content: flex-end;
}

:deep(.el-table th.el-table__cell) {
    background-color: #f5f7fa;
    font-weight: 600;
    color: #303133;
}

:deep(.el-table--striped .el-table__body tr.el-table__row--striped td.el-table__cell) {
    background-color: #fafafa;
}

:deep(.el-table__row:hover > td.el-table__cell) {
    background-color: #ecf5ff !important;
}

:deep(.el-pagination.is-background .el-pager li:not(.is-active).is-active) {
    background-color: #409EFF;
}

@media (max-width: 768px) {
    .page-header {
        flex-direction: column;
        align-items: flex-start;
    }
    
    .header-right {
        width: 100%;
        flex-direction: column;
    }
    
    .header-right .el-input {
        width: 100% !important;
    }
    
    .page-title {
        font-size: 18px;
    }
    
    .action-buttons {
        flex-direction: column;
        gap: 4px;
    }
}
</style>
