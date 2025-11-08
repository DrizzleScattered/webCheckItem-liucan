import { createApp } from "vue";
import "./style.css";
import ElementPlus from "element-plus";
import "element-plus/dist/index.css";
import zhCn from "element-plus/es/locale/lang/zh-cn";

import App from "./App.vue";

import "default-passive-events";

const app = createApp(App);

app.use(ElementPlus, {
  locale: zhCn,
});
app.mount("#app");
