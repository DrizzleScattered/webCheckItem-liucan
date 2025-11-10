<template>
  <div class="proto-user-viewer">
    <h2>ProtoBuf 用户数据展示</h2>
    <el-button type="primary" @click="loadData">加载并解析用户数据</el-button>

    <el-table v-if="users.length" :data="users" style="margin-top: 20px" border>
      <el-table-column prop="id" label="ID" width="120" />
      <el-table-column prop="name" label="姓名" />
      <el-table-column prop="age" label="年龄" width="80" />
      <el-table-column prop="email" label="邮箱" />
      <el-table-column prop="role" label="角色" />
    </el-table>

    <div v-else class="empty">暂无数据，请点击上方按钮加载</div>
  </div>
</template>

<script setup lang="ts">
import { ref } from "vue";
import { loadUsersAsProto } from "../api/mockUserProtoService";
import { ElMessage } from "element-plus";

const users = ref<User[]>([]);

const loadData = async () => {
  try {
    // 模拟接口调用
    const data = await loadUsersAsProto("/data/users.json");
    users.value = data;
    ElMessage.success(`成功加载 ${data.length} 个用户`);
  } catch (err) {
    console.error(err);
    ElMessage.error("加载失败，请检查文件路径或格式");
  }
};
</script>

<style scoped>
.proto-user-viewer {
  max-width: 800px;
  margin: 20px auto;
  background: #fff;
  padding: 20px;
  border-radius: 8px;
}
.empty {
  text-align: center;
  color: #999;
  margin-top: 20px;
}
</style>
