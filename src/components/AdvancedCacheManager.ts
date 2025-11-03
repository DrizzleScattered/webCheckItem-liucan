
interface CacheItem<T> {
    data: T;
    expireTime: number;
    createdAt: number;
    accessCount: number;
    lastAccessed: number;
}

interface CacheStats {
    totalItems: number;
    hitCount: number;
    missCount: number;
    memoryUsage: number;
    storageType: 'memory' | 'persistent';
}

interface CacheOptions {
    defaultTTL?: number;
    maxSize?: number;
    storageKey?: string;
    enablePersistence?: boolean;
    cleanupInterval?: number;
}

export class AdvancedCacheManager {
    private cache: Map<string, CacheItem<any>> = new Map();
    private stats: CacheStats;
    private options: Required<CacheOptions>;
    private cleanupTimer?: number;


    constructor(options: CacheOptions = {}) {
        this.options = {
            defaultTTL: 30 * 60 * 1000,
            maxSize: 1000,
            storageKey: 'advanced_cache',
            enablePersistence: true,
            cleanupInterval: 5 * 60 * 1000,
            ...options
        };

        this.stats = {
            totalItems: 0,
            hitCount: 0,
            missCount: 0,
            memoryUsage: 0,
            storageType: this.options.enablePersistence ? 'persistent' : 'memory'
        };

        if (this.options.enablePersistence) {
            this.loadFromStorage();
        }

        this.startCleanupTask();
    }

    set<T>(key: string, data: T, ttl?: number): void {
        try {
            if (this.cache.size >= this.options.maxSize && !this.cache.has(key)) {
                this.evictLeastUsed();
            }

            const now = Date.now();
            const expireTime = now + (ttl || this.options.defaultTTL);

            const cacheItem: CacheItem<T> = {
                data,
                expireTime,
                createdAt: now,
                accessCount: 0,
                lastAccessed: now
            };

            this.cache.set(key, cacheItem);
            this.updateStats();

            if (this.options.enablePersistence) {
                this.saveToStorage();
            }
        } catch (error) {
            console.error(`[key: ${key}]:`, error);
            throw new Error(`${error instanceof Error ? error.message : '未知错误'}`);
        }
    }

    get<T>(key: string): T | null {
        try {
            const item = this.cache.get(key) as CacheItem<T> | undefined;

            if (!item) {
                this.stats.missCount++;
                return null;
            }

            const now = Date.now();

            if (now > item.expireTime) {
                this.cache.delete(key);
                this.stats.missCount++;
                this.updateStats();
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

    delete(key: string): boolean {
        try {
            const deleted = this.cache.delete(key);
            if (deleted) {
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

    has(key: string): boolean {
        const item = this.cache.get(key);
        if (!item) return false;

        if (Date.now() > item.expireTime) {
            this.cache.delete(key);
            return false;
        }

        return true;
    }

    clear(): void {
        try {
            this.cache.clear();
            this.updateStats();

            if (this.options.enablePersistence) {
                localStorage.removeItem(this.options.storageKey);
            }
        } catch (error) {
            console.error(error);
            throw new Error(`${error instanceof Error ? error.message : '未知错误'}`);
        }
    }

    getStats(): CacheStats {
        return { ...this.stats };
    }

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

    private evictLeastUsed(): void {
        let leastUsedKey: string | null = null;
        let minAccessCount = Infinity;
        let oldestAccessTime = Infinity;

        for (const [key, item] of this.cache.entries()) {
            if (item.accessCount < minAccessCount ||
                (item.accessCount === minAccessCount && item.lastAccessed < oldestAccessTime)) {
                leastUsedKey = key;
                minAccessCount = item.accessCount;
                oldestAccessTime = item.lastAccessed;
            }
        }

        if (leastUsedKey) {
            this.cache.delete(leastUsedKey);
        }
    }

    private loadFromStorage(): void {
        try {
            const stored = localStorage.getItem(this.options.storageKey);
            if (stored) {
                const parsed = JSON.parse(stored);
                this.cache = new Map(parsed);
                this.updateStats();
            }
        } catch (error) {
            console.error(error);
            localStorage.removeItem(this.options.storageKey);
        }
    }


    private saveToStorage(): void {
        try {
            const serialized = JSON.stringify(Array.from(this.cache.entries()));
            localStorage.setItem(this.options.storageKey, serialized);
        } catch (error) {
            console.error(error);
        }
    }

    private updateStats(): void {
        this.stats.totalItems = this.cache.size;

        let size = 0;
        for (const [key, value] of this.cache.entries()) {
            size += key.length + JSON.stringify(value).length;
        }
        this.stats.memoryUsage = size;
    }

    private startCleanupTask(): void {
        this.cleanupTimer = window.setInterval(() => {
            this.cleanup();
        }, this.options.cleanupInterval);
    }

    destroy(): void {
        if (this.cleanupTimer) {
            clearInterval(this.cleanupTimer);
        }
    }
}

export const globalCache = new AdvancedCacheManager();