<script>
    export default {
        data() { 
            return {
                form: {
                    username: '',
                    password: ''
                },
                errorMessage: ''
            };
        },
        methods: {
            async submitLogin() {
                // const service = axios.create({
                //     withCredentials: true, // 跨域携带 Cookie
                //     timeout: 10000
                // })
                // 首次访问Django页面会返回csrfcookie, 先get访问获取 CSRF Cookie
                await axios.get('/api/login/')    
                const csrftoken = document.cookie.match(/csrftoken=([\w-]+)/)?.[1];

                const form = new FormData();
                form.append('username', this.form.username);
                form.append('password', this.form.password);
                
                axios.post("/api/aws/login", form, {
                    headers: {
                        'X-CSRFToken': csrftoken,
                        'Content-Type': 'application/json'
                    }
                }).then(response => {
                    if (response.status == 200) {
                        window.location.href = '#/aws/logDownLoad';  // 登录成功后重定向到首页
                    } 
                    else {
                        this.errorMessage = "登录失败，请检查用户名或密码。";
                    }
                }).catch(error => {
                    console.log(error)
                    this.errorMessage = "登录时发生错误，请稍后再试。";
                });
            }
        }
    };

</script>

<template>
    <div id="app" class="container position-relative" style="width: 500px;">
        <h2 class="mt-5">登录</h2>
        <form method="POST" @submit.prevent="submitLogin">
            <div class="mb-3">
                <label for="username" class="form-label">用户名</label>
                <input type="text" class="form-control" id="username" v-model="form.username" required>
            </div>
            <div class="mb-3">
                <label for="password" class="form-label">密码</label>
                <input type="password" class="form-control" id="password" v-model="form.password" required>
            </div>
            <button type="submit" class="btn btn-primary">登录</button>
            <div class="alert alert-danger mt-3" v-if="errorMessage">{{ errorMessage }}</div>
        </form>
    </div>


</template>