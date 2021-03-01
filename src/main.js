import Vue from 'vue'
import App from './App.vue'
import router from './router'
import store from './store'

import ElementUI from 'element-ui';
import 'element-ui/lib/theme-chalk/index.css';

Vue.use(ElementUI);

import io from 'socket.io-client';
// Vue.prototype.$socket = io.connect('https://liusinan.top');
Vue.prototype.$socket = io.connect('https://82.156.100.6');
// Vue.prototype.$socket = io.connect('0.0.0.0:3000');

Vue.config.productionTip = false

new Vue({
  router,
  store,
  render: h => h(App)
}).$mount('#app')
