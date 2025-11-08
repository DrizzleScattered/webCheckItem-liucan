//缓存项类型定义
interface CacheItem<T> {
  data: T;
  expireTime: number; //过期时间
  createdAt: number;
  accessCount: number; //访问次数
  lastAccessed: number;
}

//缓存状态类型定义
interface CacheStats {
  totalItems: number; //总缓存数
  hitCount: number; //命中数量
  missCount: number; //未命中数量
  memoryUsage: number; //内存使用量
  storageType: "memory" | "persistent"; //缓存类型 内存||持久化
}

//缓存操作类型定义
interface CacheOptions {
  defaultTTL?: number; //默认生存时间
  maxSize?: number; //最大大小
  storageKey?: string; //缓存的key
  enablePersistence?: boolean; //是否开启持久化
  cleanupInterval?: number; //缓存清理的间隔时间
}

//高级缓存管理器类型定义
export class AdvancedCacheManager {
  //通过Map结构保存缓存结果
  private cache: Map<string, CacheItem<any>> = new Map();
  //缓存状态字段
  private stats: CacheStats;
  //缓存配置对象，为必要参数
  private options: Required<CacheOptions>;
  //缓存清理定时器
  private cleanupTimer?: number;

  //缓存管理器构造方法
  constructor(options: CacheOptions = {}) {
    //初始化缓存配置
    this.options = {
      //默认生存时间为30分钟
      defaultTTL: 30 * 60 * 1000,
      //最大容量为1000字节
      maxSize: 1000,
      storageKey: "advanced_cache",
      //默认开启持久化
      enablePersistence: true,
      //清理间隔为5分钟
      cleanupInterval: 5 * 60 * 1000,
      ...options,
    };

    //初始化缓存状态
    this.stats = {
      totalItems: 0,
      hitCount: 0,
      missCount: 0,
      memoryUsage: 0,
      storageType: this.options.enablePersistence ? "persistent" : "memory",
    };

    //如果开启了持久化存储，从localStorage中加载数据
    if (this.options.enablePersistence) {
      this.loadFromStorage();
    }
    //开启缓存清除任务
    this.startCleanupTask();
  }

  //设置缓存
  set<T>(key: string, data: T, ttl?: number): void {
    try {
      //判断当前缓存状态，如果大于等于配置的最大内存并且缓存中没有需要缓存的key,则
      if (this.cache.size >= this.options.maxSize && !this.cache.has(key)) {
        this.evictLeastUsed();
      }

      const now = Date.now();
      const expireTime = now + (ttl || this.options.defaultTTL);

      //构建缓存项
      const cacheItem: CacheItem<T> = {
        data,
        expireTime,
        createdAt: now,
        accessCount: 0,
        lastAccessed: now,
      };

      //放入缓存结构中
      this.cache.set(key, cacheItem);
      //更新缓存状态
      this.updateStats();

      if (this.options.enablePersistence) {
        this.saveToStorage();
      }
    } catch (error) {
      console.error(`[key: ${key}]:`, error);
      throw new Error(`${error instanceof Error ? error.message : "未知错误"}`);
    }
  }

  //根据key获取缓存项
  get<T>(key: string): T | null {
    try {
      //从缓存中根据key取出缓存项
      const item = this.cache.get(key) as CacheItem<T> | undefined;

      //如果不存在 则更新缓存状态 将未命中数量+1
      if (!item) {
        this.stats.missCount++;
        return null;
      }

      const now = Date.now();

      //如果缓存项已过期 则删除缓存项 更新缓存状态，这里通过惰性删除的方式，在访问的时间进行判断
      if (now > item.expireTime) {
        this.cache.delete(key);
        this.stats.missCount++;
        this.updateStats();
        console.log(22, item);
        return null;
      }

      item.accessCount++;
      item.lastAccessed = now;
      this.stats.hitCount++;

      if (this.options.enablePersistence) {
        this.saveToStorage();
      }
      return item.data;
    } catch (error) {
      console.error(`[key: ${key}]:`, error);
      this.stats.missCount++;
      return null;
    }
  }

  //根据key删除缓存项
  delete(key: string): boolean {
    try {
      const deleted = this.cache.delete(key);
      if (deleted) {
        //删除成功后更新缓存状态
        this.updateStats();
        if (this.options.enablePersistence) {
          this.saveToStorage();
        }
      }
      return deleted;
    } catch (error) {
      console.error(`[key: ${key}]:`, error);
      return false;
    }
  }

  //根据key判断是否存在对应的item
  has(key: string): boolean {
    const item = this.cache.get(key);
    if (!item) return false;

    if (Date.now() > item.expireTime) {
      this.cache.delete(key);
      return false;
    }

    return true;
  }

  //清除整个缓存
  clear(): void {
    try {
      this.cache.clear();
      this.updateStats();
      //如果配置了持久化，清除localStorage
      if (this.options.enablePersistence) {
        localStorage.removeItem(this.options.storageKey);
      }
    } catch (error) {
      console.error(error);
      throw new Error(`${error instanceof Error ? error.message : "未知错误"}`);
    }
  }

  //获取缓存状态
  getStats(): CacheStats {
    return { ...this.stats };
  }

  //删除过期memoryItem
  cleanup(): number {
    const now = Date.now();
    let deletedCount = 0;

    for (const [key, item] of this.cache.entries()) {
      if (now > item.expireTime) {
        this.cache.delete(key);
        deletedCount++;
      }
    }

    if (deletedCount > 0) {
      this.updateStats();
      if (this.options.enablePersistence) {
        this.saveToStorage();
      }
    }

    return deletedCount;
  }

  //对最少访问和最后访问时间最远的缓存项进行删除
  private evictLeastUsed(): void {
    let leastUsedKey: string | null = null;
    let minAccessCount = Infinity;
    let oldestAccessTime = Infinity;

    //遍历缓存项 找出最少访问次数和访问时间最远的缓存项
    for (const [key, item] of this.cache.entries()) {
      if (
        item.accessCount < minAccessCount ||
        (item.accessCount === minAccessCount && item.lastAccessed < oldestAccessTime)
      ) {
        leastUsedKey = key;
        minAccessCount = item.accessCount;
        oldestAccessTime = item.lastAccessed;
      }
    }

    //如果存在 删除该缓存项
    if (leastUsedKey) {
      this.cache.delete(leastUsedKey);
    }
  }

  //从本地localStorage中根据缓存key加载数据
  private loadFromStorage(): void {
    try {
      const stored = localStorage.getItem(this.options.storageKey);
      if (stored) {
        //对加载的字符串数据进行反序列化为对象
        const parsed = JSON.parse(stored);
        //初始化Map结果，将数据存入
        this.cache = new Map(parsed);
        this.updateStats();
      }
    } catch (error) {
      console.error(error);
      localStorage.removeItem(this.options.storageKey);
    }
  }

  //保存数据到localStorage
  private saveToStorage(): void {
    try {
      //对缓存进行序列化方便保存
      const serialized = JSON.stringify(Array.from(this.cache.entries()));
      //保存到localStorage
      localStorage.setItem(this.options.storageKey, serialized);
    } catch (error) {
      console.error(error);
    }
  }

  //更新缓存状态
  private updateStats(): void {
    //更新缓存项数量
    this.stats.totalItems = this.cache.size;

    //通过遍历缓存中的item，对缓存的内存使用量进行统计和更新
    let size = 0;
    for (const [key, value] of this.cache.entries()) {
      size += key.length + JSON.stringify(value).length;
    }
    this.stats.memoryUsage = size;
  }

  //通过定时器开启缓存清除任务
  private startCleanupTask(): void {
    this.cleanupTimer = window.setInterval(() => {
      this.cleanup();
    }, this.options.cleanupInterval);
  }

  //销毁定时器
  destroy(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
    }
  }
}

export const globalCache = new AdvancedCacheManager();
