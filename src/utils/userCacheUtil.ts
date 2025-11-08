import { AdvancedCacheManager } from "../components/AdvancedCacheManager";
import { ref, watch } from "vue";

const USER_CACHE_KEY = "users";

export const userCache = new AdvancedCacheManager({
  storageKey: "user_data_center",
  defaultTTL: 30 * 60 * 1000, //过期时间为30分钟
  maxSize: 1000, //最大存储1000个用户
});

export const userService = {
  //获取所有用户
  getUsers(): User[] {
    const users = userCache.get<User[]>(USER_CACHE_KEY) || [];
    return users;
  },
  //保存所有用户
  saveUsers(users: User[]): void {
    userCache.set<User[]>(USER_CACHE_KEY, users);
  },
  //新增用户
  addUser(user: User): void {
    const users = this.getUsers();
    users.push(user);
    this.saveUsers(users);
  },
  //删除用户
  deleteUser(id: string): void {
    const users = this.getUsers().filter((user) => user.id != id);
    this.saveUsers(users);
  },
  //更新用户
  updateUser(updatedUser: User): void {
    const users = this.getUsers().map((user) => (user.id === updatedUser.id ? updatedUser : user));
    this.saveUsers(users);
  },
};

export const userStore = ref<User[]>(userService.getUsers());

//监听缓存修改 更新userStore
watch(
  userStore,
  (newVal) => {
    userService.saveUsers(newVal);
  },
  { deep: true }
);