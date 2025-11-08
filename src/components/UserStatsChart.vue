<template>
  <div class="stats-container" :class="{ dark: isDark }">
    <div class="toolbar">
      <el-button type="primary" @click="exportData">导出数据</el-button>
      <el-switch v-model="isDark" active-text="暗色主题" inactive-text="亮色主题" style="margin-left: 15px" />
      <el-switch v-model="isGrid" active-text="双列布局" inactive-text="单列布局" style="margin-left: 15px" />
    </div>

    <!-- 图表容器 -->
    <div
      class="charts-grid"
      :class="{
        grid: isGrid,
        single: !isGrid,
        dark: isDark,
      }"
    >
      <div ref="barChartRef" class="chart"></div>
      <div ref="pieChartRef" class="chart"></div>
      <div ref="avgChartRef" class="chart"></div>
    </div>
  </div>
</template>

<script setup lang="ts">
import * as echarts from "echarts";
import { ref, onMounted, watchEffect, watch } from "vue";
import { ElMessage } from "element-plus";
import { userStore } from "../utils/userCacheUtil";

//用户数据列表
const users = userStore;
const isDark = ref(false);
const isGrid = ref(false);

const barChartRef = ref<HTMLDivElement>();
const pieChartRef = ref<HTMLDivElement>();
const avgChartRef = ref<HTMLDivElement>();
let barChart: echarts.ECharts;
let pieChart: echarts.ECharts;
let avgChart: echarts.ECharts;

//初始化图表
const initCharts = () => {
  const theme = isDark.value ? "dark" : undefined;
  if (!barChartRef.value || !pieChartRef.value || !avgChartRef.value) return;

  barChart = echarts.init(barChartRef.value, theme);
  pieChart = echarts.init(pieChartRef.value, theme);
  avgChart = echarts.init(avgChartRef.value, theme);

  updateCharts();
};

//更新图表数据
const updateCharts = () => {
  const data = users.value;
  const names = data.map((u) => u.name);
  const ages = data.map((u) => u.age);

  //用户年龄分布折线图
  barChart.setOption({
    title: { text: "用户年龄分布", left: "center" },
    tooltip: { trigger: "axis" },
    xAxis: { type: "category", data: names },
    yAxis: { type: "value" },
    series: [
      {
        data: ages,
        type: "bar",
        smooth: true,
        itemStyle: { color: "#409EFF" },
      },
    ],
  });

  //=角色占比饼图
  const roleStats = data.reduce((acc, u) => {
    acc[u.role] = (acc[u.role] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  pieChart.setOption({
    title: { text: "角色占比", left: "center" },
    tooltip: { trigger: "item" },
    series: [
      {
        type: "pie",
        radius: "60%",
        data: Object.entries(roleStats).map(([role, count]) => ({
          name: role === "admin" ? "管理员" : "普通用户",
          value: count,
        })),
      },
    ],
  });

  //平均年龄变化单值柱状图
  const avgAge = data.length > 0 ? Number((data.reduce((a, b) => a + b.age, 0) / data.length).toFixed(2)) : 0;

  avgChart.setOption({
    title: { text: "平均年龄", left: "center" },
    tooltip: {},
    xAxis: { type: "category", data: ["平均年龄"] },
    yAxis: { type: "value" },
    series: [
      {
        data: [avgAge],
        type: "bar",
        itemStyle: { color: "#E6A23C" },
        label: {
          show: true,
          position: "top",
          formatter: "{c} 岁",
        },
      },
    ],
  });
};

//监听缓存变化
watch(
  () => userStore.value,
  () => updateCharts(),
  { deep: true }
);
//监听主题切换
watchEffect(() => {
  if (barChart) {
    barChart.dispose();
    pieChart.dispose();
    avgChart.dispose();
    initCharts();
  }
});

//导出数据
const exportData = () => {
  const blob = new Blob([JSON.stringify(users.value, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "用户数据.json";
  a.click();
  ElMessage.success("数据导出成功！");
};

//初始化
onMounted(() => {
  initCharts();
  window.addEventListener("resize", () => {
    barChart.resize();
    pieChart.resize();
    avgChart.resize();
  });
});
</script>

<style scoped>
.stats-container {
  display: flex;
  flex-direction: column;
  padding: 15px;
  background-color: #f5f7fa;
  border-radius: 10px;
  transition: background-color 0.3s ease;
  overflow: hidden;
}

.stats-container.dark {
  background-color: #1e1e1e;
}

.toolbar {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 15px;
}

.charts-grid {
  display: flex;
  flex-direction: column;
  gap: 15px;
}

.charts-grid.grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  grid-template-rows: auto auto;
}

.chart {
  width: 100%;
  height: 300px;
  border-radius: 8px;
  background: white;
  display: flex;
  justify-content: center;
}

.dark .chart {
  background: #2e2e2e;
}
</style>
