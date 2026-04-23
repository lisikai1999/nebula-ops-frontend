<script>
import { useAuthStore } from '../stores/auth-store'

export default {
    name: 'Login',
    data() {
        return {
            form: {
                username: '',
                password: ''
            },
            rules: {
                username: [
                    { required: true, message: '请输入用户名', trigger: 'blur' }
                ],
                password: [
                    { required: true, message: '请输入密码', trigger: 'blur' },
                    { min: 1, message: '密码长度不能少于1位', trigger: 'blur' }
                ]
            },
            loading: false,
            showPassword: false
        };
    },
    computed: {
        authStore() {
            return useAuthStore()
        }
    },
    methods: {
        async submitLogin(formEl) {
            if (!formEl) return;
            
            await formEl.validate(async (valid) => {
                if (valid) {
                    this.loading = true;
                    
                    try {
                        const result = await this.authStore.login(this.form.username, this.form.password)
                        
                        if (result.success) {
                            this.$message.success(result.message);
                            setTimeout(() => {
                                window.location.href = '#/aws/logIntake';
                            }, 500);
                        } else {
                            this.$message.error('登录失败，请检查用户名或密码。');
                        }
                    } catch (error) {
                        console.log(error);
                        this.$message.error('登录失败：' + error.message);
                    } finally {
                        this.loading = false;
                    }
                }
            });
        }
    }
};
</script>

<template>
    <div class="login-page">
        <div class="login-bg">
            <div class="bg-shape shape-1"></div>
            <div class="bg-shape shape-2"></div>
            <div class="bg-shape shape-3"></div>
            <div class="bg-shape shape-4"></div>
        </div>
        
        <div class="login-container">
            <el-card class="login-card" shadow="hover">
                <div class="login-header">
                    <div class="logo-wrapper">
                        <el-icon class="logo-icon"><Operation /></el-icon>
                    </div>
                    <h1 class="login-title">运维平台</h1>
                    <p class="login-subtitle">Ops Management Platform</p>
                </div>
                
                <el-form
                    ref="loginFormRef"
                    :model="form"
                    :rules="rules"
                    class="login-form"
                    @submit.prevent="submitLogin($refs.loginFormRef)"
                >
                    <el-form-item prop="username">
                        <el-input
                            v-model="form.username"
                            size="large"
                            placeholder="请输入用户名"
                            prefix-icon="User"
                            clearable
                        >
                            <template #prefix>
                                <el-icon><User /></el-icon>
                            </template>
                        </el-input>
                    </el-form-item>
                    
                    <el-form-item prop="password">
                        <el-input
                            v-model="form.password"
                            size="large"
                            :type="showPassword ? 'text' : 'password'"
                            placeholder="请输入密码"
                            show-password
                            @keyup.enter="submitLogin($refs.loginFormRef)"
                        >
                            <template #prefix>
                                <el-icon><Lock /></el-icon>
                            </template>
                        </el-input>
                    </el-form-item>
                    
                    <div class="login-options">
                        <el-checkbox v-model="rememberMe">记住我</el-checkbox>
                        <el-link type="primary" :underline="false">忘记密码？</el-link>
                    </div>
                    
                    <el-form-item>
                        <el-button
                            type="primary"
                            size="large"
                            :loading="loading"
                            class="login-button"
                            @click="submitLogin($refs.loginFormRef)"
                        >
                            <template v-if="!loading">
                                <el-icon><Right /></el-icon>
                                登 录
                            </template>
                            <template v-else>
                                登录中...
                            </template>
                        </el-button>
                    </el-form-item>
                </el-form>
                
                <div class="login-footer">
                    <p class="copyright">
                        © 2024 运维平台. All rights reserved.
                    </p>
                </div>
            </el-card>
        </div>
    </div>
</template>

<script setup>
import { ref } from 'vue';
import { 
    User, 
    Lock, 
    Right, 
    Operation 
} from '@element-plus/icons-vue';

const loginFormRef = ref(null);
const rememberMe = ref(false);
</script>

<style scoped>
.login-page {
    min-height: 100vh;
    width: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    position: relative;
    overflow: hidden;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}

.login-bg {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    overflow: hidden;
    z-index: 0;
}

.bg-shape {
    position: absolute;
    border-radius: 50%;
    opacity: 0.1;
    background: #fff;
}

.shape-1 {
    width: 600px;
    height: 600px;
    top: -200px;
    left: -200px;
    animation: float 20s ease-in-out infinite;
}

.shape-2 {
    width: 400px;
    height: 400px;
    bottom: -100px;
    right: -100px;
    animation: float 25s ease-in-out infinite reverse;
}

.shape-3 {
    width: 300px;
    height: 300px;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    animation: float 30s ease-in-out infinite;
}

.shape-4 {
    width: 200px;
    height: 200px;
    top: 20%;
    right: 20%;
    animation: float 15s ease-in-out infinite;
}

@keyframes float {
    0%, 100% {
        transform: translateY(0) rotate(0deg);
    }
    50% {
        transform: translateY(-30px) rotate(180deg);
    }
}

.login-container {
    position: relative;
    z-index: 1;
    width: 100%;
    max-width: 450px;
    padding: 20px;
}

.login-card {
    border-radius: 16px;
    overflow: hidden;
    background: rgba(255, 255, 255, 0.95);
    backdrop-filter: blur(10px);
}

.login-header {
    text-align: center;
    padding: 40px 40px 20px;
}

.logo-wrapper {
    width: 80px;
    height: 80px;
    margin: 0 auto 20px;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    border-radius: 20px;
    display: flex;
    align-items: center;
    justify-content: center;
    box-shadow: 0 10px 30px rgba(102, 126, 234, 0.3);
}

.logo-icon {
    font-size: 40px;
    color: #fff;
}

.login-title {
    font-size: 28px;
    font-weight: 700;
    color: #303133;
    margin: 0 0 8px;
}

.login-subtitle {
    font-size: 14px;
    color: #909399;
    margin: 0;
    letter-spacing: 1px;
}

.login-form {
    padding: 20px 40px 40px;
}

.login-form :deep(.el-input__wrapper) {
    padding: 14px 16px;
    box-shadow: 0 0 0 1px #e4e7ed;
    transition: all 0.3s;
}

.login-form :deep(.el-input__wrapper:hover) {
    box-shadow: 0 0 0 1px #c0c4cc;
}

.login-form :deep(.el-input__wrapper.is-focus) {
    box-shadow: 0 0 0 1px #409EFF, 0 0 0 4px rgba(64, 158, 255, 0.1);
}

.login-form :deep(.el-input__inner) {
    font-size: 15px;
}

.login-form :deep(.el-input__prefix) {
    color: #909399;
}

.login-options {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 24px;
}

.login-options :deep(.el-checkbox__label) {
    color: #606266;
    font-size: 14px;
}

.login-button {
    width: 100%;
    height: 50px;
    font-size: 16px;
    font-weight: 600;
    border-radius: 10px;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    border: none;
    box-shadow: 0 4px 15px rgba(102, 126, 234, 0.4);
    transition: all 0.3s;
}

.login-button:hover {
    transform: translateY(-2px);
    box-shadow: 0 6px 20px rgba(102, 126, 234, 0.5);
}

.login-button:active {
    transform: translateY(0);
}

.login-footer {
    text-align: center;
    padding: 0 40px 40px;
}

.copyright {
    font-size: 12px;
    color: #c0c4cc;
    margin: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 4px;
}

@media (max-width: 768px) {
    .login-container {
        padding: 15px;
    }
    
    .login-header {
        padding: 30px 20px 15px;
    }
    
    .logo-wrapper {
        width: 70px;
        height: 70px;
        border-radius: 16px;
    }
    
    .logo-icon {
        font-size: 35px;
    }
    
    .login-title {
        font-size: 24px;
    }
    
    .login-form {
        padding: 15px 20px 30px;
    }
    
    .login-footer {
        padding: 0 20px 30px;
    }
}

@media (max-width: 480px) {
    .login-card {
        border-radius: 12px;
    }
    
    .login-header {
        padding: 25px 15px 10px;
    }
    
    .logo-wrapper {
        width: 60px;
        height: 60px;
        border-radius: 14px;
        margin-bottom: 15px;
    }
    
    .logo-icon {
        font-size: 30px;
    }
    
    .login-title {
        font-size: 22px;
    }
    
    .login-subtitle {
        font-size: 12px;
    }
    
    .login-form {
        padding: 10px 15px 25px;
    }
    
    .login-options {
        flex-direction: column;
        gap: 12px;
        align-items: flex-start;
    }
    
    .login-button {
        height: 46px;
        font-size: 15px;
        border-radius: 8px;
    }
    
    .login-footer {
        padding: 0 15px 25px;
    }
    
    .copyright {
        font-size: 11px;
    }
}
</style>