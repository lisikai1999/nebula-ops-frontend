import './assets/main.css'

import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'

// 引入element-plus
import ElementPlus from 'element-plus'
import 'element-plus/dist/index.css'

// 引入vue3-easy-data-table
import Vue3EasyDataTable from 'vue3-easy-data-table';
import 'vue3-easy-data-table/dist/style.css';

// 格式化json插件
import hljsVuePlugin from '@highlightjs/vue-plugin'
import 'highlight.js/styles/atom-one-dark.css'
import hljs from 'highlight.js/lib/core'
import json from 'highlight.js/lib/languages/json'


hljs.registerLanguage('json', json)


const pinia = createPinia()

const app = createApp(App)
app.use(ElementPlus)
app.use(pinia)
app.use(hljsVuePlugin)
app.component('EasyDataTable', Vue3EasyDataTable);
app.mount('#app')