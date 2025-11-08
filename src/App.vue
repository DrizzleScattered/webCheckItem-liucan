<template>
  <el-container>
    <el-header>
      <h1>用户数据管理中心</h1>
    </el-header>
    <el-main>
      <UserManager />
      <UserStatsChart />
    </el-main>
  </el-container>
</template>

<script setup lang="ts">
import UserManager from "./components/UserManager.vue";
import UserStatsChart from "./components/UserStatsChart.vue";
import { userService } from "./utils/userCacheUtil";

const users = userService.getUsers();
console.log(users);
if (users.length === 0) {
  userService.saveUsers([
    { id: "user_1", name: "张三", age: 25, email: "zhangsan@example.com", role: "admin" },
    { id: "user_2", name: "李四", age: 30, email: "lisi@example.com", role: "user" },
    { id: "user_3", name: "王五", age: 22, email: "wangwu@example.com", role: "user" },
    { id: "user_4", name: "赵六", age: 28, email: "zhaoliu@example.com", role: "admin" },
  ]);
}
</script>

<style scoped>
body {
  margin: 0;
  padding: 0;
  font-family: "Helvetica Neue", Arial, sans-serif;
}
.el-header {
  background-color: #409eff;
  color: white;
  text-align: center;
  padding: 10px 0;
}

h1 {
  font-size: 18px;
}
</style>
