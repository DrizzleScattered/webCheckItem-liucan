<template>
  <div class="user-manager">
    <div class="action-bar">
      <el-button type="primary" @click="openAddDialog">新增用户</el-button>
      <el-input
        v-model="searchKey"
        placeholder="搜索（姓名/邮箱）"
        style="width: 200px; margin-left: 10px"
        @keyup.enter="handleSearch"
      />
      <el-select
        v-model="filterRole"
        placeholder="筛选角色"
        style="width: 150px; margin-left: 10px"
        @change="handleFilter"
      >
        <el-option label="全部" value="" />
        <el-option label="管理员" value="admin" />
        <el-option label="普通用户" value="user" />
      </el-select>
    </div>

    <!-- 用户列表-->
    <el-table :data="currentPageUsers" border style="width: 100%; margin-top: 10px">
      <el-table-column prop="id" label="ID" width="80" />
      <el-table-column prop="name" label="姓名" />
      <el-table-column prop="age" label="年龄" width="80" />
      <el-table-column prop="email" label="邮箱" />
      <el-table-column prop="role" label="角色" />
      <el-table-column label="操作" width="120">
        <template #default="scope">
          <el-button link type="primary" @click="openEditDialog(scope.row)">编辑</el-button>
          <el-button link type="danger" @click="confirmDelete(scope.row.id)">删除</el-button>
        </template>
      </el-table-column>
    </el-table>

    <el-pagination
      @size-change="handleSizeChange"
      @current-change="handleCurrentChange"
      :current-page="currentPage"
      :page-sizes="[5, 10, 20]"
      :page-size="pageSize"
      layout="total, sizes, prev, pager, next, jumper"
      :total="filteredUsers.length"
      style="margin-top: 10px"
    />

    <!-- 编辑/新增用户信息 -->
    <el-dialog v-model="dialogVisible" :title="isEdit ? '编辑用户' : '新增用户'" width="500px">
      <el-form ref="formRef" :model="form" :rules="rules" label-width="100px">
        <el-form-item label="姓名" prop="name">
          <el-input v-model="form.name" />
        </el-form-item>
        <el-form-item label="年龄" prop="age">
          <el-input-number v-model="form.age" :min="1" :max="150" />
        </el-form-item>
        <el-form-item label="邮箱" prop="email">
          <el-input v-model="form.email" />
        </el-form-item>
        <el-form-item label="角色" prop="role">
          <el-select v-model="form.role" placeholder="请选择角色">
            <el-option label="管理员" value="admin" />
            <el-option label="普通用户" value="user" />
          </el-select>
        </el-form-item>
      </el-form>
      <template #footer>
        <div class="dialog-footer">
          <el-button @click="dialogVisible = false">取消</el-button>
          <el-button type="primary" @click="submitForm">确认</el-button>
        </div>
      </template>
    </el-dialog>

    <el-dialog v-model="deleteDialogVisible" title="确认删除" width="300px">
      <span>确定要删除该用户吗？</span>
      <template #footer>
        <div class="dialog-footer">
          <el-button @click="deleteDialogVisible = false">取消</el-button>
          <el-button type="danger" @click="doDelete">确认删除</el-button>
        </div>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, useTemplateRef } from "vue";
import { type FormRules } from "element-plus";
import { userService, userStore } from "../utils/userCacheUtil";
import {
  ElDialog,
  ElTable,
  ElTableColumn,
  ElButton,
  ElInput,
  ElSelect,
  ElOption,
  ElPagination,
  ElForm,
  ElFormItem,
  ElInputNumber,
  ElMessage,
} from "element-plus";

const dialogVisible = ref(false);
const deleteDialogVisible = ref(false);
const isEdit = ref(false);
const formRef = useTemplateRef<InstanceType<typeof ElForm>>("formRef");
const currentPage = ref(1);
const pageSize = ref(10);
const searchKey = ref("");
const filterRole = ref("");
const toDeleteId = ref("");

// 表单数据类型
interface FormData {
  id: string;
  name: string;
  age: number;
  email: string;
  role: string;
}

// 表单数据
const form = reactive<FormData>({
  id: "",
  name: "",
  age: 0,
  email: "",
  role: "user",
});

//用户列表数据
const users = userStore;

//刷新用户列表
const refreshUsers = () => {
  userStore.value = userService.getUsers();
  users.value = [...userStore.value];
};

const rules: FormRules<FormData> = {
  name: [{ required: true, message: "请输入姓名", trigger: "blur" }],
  age: [{ required: true, message: "请输入年龄", trigger: "blur" }],
  email: [
    { required: true, message: "请输入邮箱", trigger: "blur" },
    { type: "email", message: "请输入正确的邮箱格式", trigger: "blur" }, // type 必须为 'email'
  ],
  role: [{ required: true, message: "请选择角色", trigger: "change" }],
};

// 筛选后的用户列表
const filteredUsers = computed<User[]>(() => {
  let list = [...users.value];
  if (searchKey.value) {
    list = list.filter((u) => u.name.includes(searchKey.value) || u.email.includes(searchKey.value));
  }
  if (filterRole.value) {
    list = list.filter((u) => u.role === filterRole.value);
  }
  return list;
});

// 当前页用户列表
const currentPageUsers = computed<User[]>(() => {
  const start = (currentPage.value - 1) * pageSize.value;
  const end = start + pageSize.value;
  return filteredUsers.value.slice(start, end);
});

const openAddDialog = () => {
  isEdit.value = false;
  form.id = "";
  form.name = "";
  form.age = 0;
  form.email = "";
  form.role = "user";
  dialogVisible.value = true;
};

const openEditDialog = (row: User) => {
  isEdit.value = true;
  form.id = row.id;
  form.name = row.name;
  form.age = row.age;
  form.email = row.email;
  form.role = row.role;
  dialogVisible.value = true;
};

const submitForm = () => {
  formRef.value?.validate((valid) => {
    if (valid) {
      if (isEdit.value) {
        userService.updateUser({ ...form });
        ElMessage.success("编辑成功");
      } else {
        const newUser = { ...form, id: `user_${Date.now()}` };
        userService.addUser(newUser);
        ElMessage.success("新增成功");
      }
      dialogVisible.value = false;
      refreshUsers();
    }
  });
};

const handleSearch = () => {
  currentPage.value = 1;
  refreshUsers(); // 搜索后刷新
};
const handleFilter = () => {
  currentPage.value = 1;
  refreshUsers(); // 筛选后刷新
};
const handleCurrentChange = (val: number) => {
  currentPage.value = val;
};
const handleSizeChange = (val: number) => {
  pageSize.value = val;
  currentPage.value = 1;
};
const confirmDelete = (id: string) => {
  toDeleteId.value = id;
  deleteDialogVisible.value = true;
};
const doDelete = () => {
  userService.deleteUser(toDeleteId.value);
  deleteDialogVisible.value = false;
  ElMessage.success("删除成功");
  refreshUsers(); //删除后刷新
};
</script>

<style scoped>
.container {
  display: flex;
}
.charts-display {
  flex: 5;
}
.user-manager {
  max-width: 1200px;
  margin: 20px auto;
  padding: 0 20px;
  flex: 5;
}
.action-bar {
  display: flex;
  align-items: center;
}
.dialog-footer {
  display: flex;
  justify-content: flex-end;
}
</style>
