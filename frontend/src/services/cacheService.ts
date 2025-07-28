// Cache service for localStorage-based data persistence with fallback mechanisms
// Provides robust caching for API data with TTL, error handling, and smart invalidation

export interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number; // Time to live in milliseconds
  version: string; // For cache invalidation
}

export interface CacheConfig {
  defaultTTL: number; // Default TTL in milliseconds (5 minutes)
  maxCacheSize: number; // Maximum number of cache entries
  enableCompression: boolean; // Whether to compress data
  version: string; // Cache version for invalidation
}

export interface CacheStats {
  totalEntries: number;
  totalSize: number; // Approximate size in bytes
  hitCount: number;
  missCount: number;
  hitRate: number;
}

class CacheService {
  private config: CacheConfig;
  private stats: {
    hitCount: number;
    missCount: number;
  };

  constructor(config: Partial<CacheConfig> = {}) {
    this.config = {
      defaultTTL: 5 * 60 * 1000, // 5 minutes
      maxCacheSize: 100,
      enableCompression: false,
      version: '1.0.0',
      ...config,
    };
    
    this.stats = {
      hitCount: 0,
      missCount: 0,
    };

    // Initialize cache on startup
    this.initializeCache();
  }

  /**
   * Initialize cache and clean up expired entries
   */
  private initializeCache(): void {
    try {
      this.cleanupExpiredEntries();
      this.enforceMaxCacheSize();
    } catch (error) {
      console.warn('Cache initialization failed:', error);
    }
  }

  /**
   * Generate cache key for a specific data type and parameters
   */
  private generateKey(dataType: string, params?: Record<string, any>): string {
    const baseKey = `meshpay_${dataType}`;
    if (!params) return baseKey;
    
    const paramString = Object.entries(params)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, value]) => `${key}:${value}`)
      .join('_');
    
    return `${baseKey}_${paramString}`;
  }

  /**
   * Set data in cache with TTL
   */
  set<T>(dataType: string, data: T, ttl?: number, params?: Record<string, any>): void {
    try {
      const key = this.generateKey(dataType, params);
      const entry: CacheEntry<T> = {
        data,
        timestamp: Date.now(),
        ttl: ttl || this.config.defaultTTL,
        version: this.config.version,
      };

      const serialized = this.config.enableCompression 
        ? this.compress(JSON.stringify(entry))
        : JSON.stringify(entry);

      localStorage.setItem(key, serialized);
      
      // Update stats
      this.stats.missCount++;
      
      // Cleanup if needed
      this.enforceMaxCacheSize();
    } catch (error) {
      console.warn('Failed to set cache entry:', error);
      this.clearCache(); // Clear cache if storage is full
    }
  }

  /**
   * Get data from cache with fallback
   */
  get<T>(dataType: string, params?: Record<string, any>): T | null {
    try {
      const key = this.generateKey(dataType, params);
      const serialized = localStorage.getItem(key);
      
      if (!serialized) {
        this.stats.missCount++;
        return null;
      }

      const entry: CacheEntry<T> = JSON.parse(
        this.config.enableCompression ? this.decompress(serialized) : serialized
      );

      // Check if entry is expired
      if (this.isExpired(entry)) {
        localStorage.removeItem(key);
        this.stats.missCount++;
        return null;
      }

      // Check version compatibility
      if (entry.version !== this.config.version) {
        localStorage.removeItem(key);
        this.stats.missCount++;
        return null;
      }

      this.stats.hitCount++;
      return entry.data;
    } catch (error) {
      console.warn('Failed to get cache entry:', error);
      this.stats.missCount++;
      return null;
    }
  }

  /**
   * Check if cache entry is expired
   */
  private isExpired(entry: CacheEntry<any>): boolean {
    return Date.now() - entry.timestamp > entry.ttl;
  }

  /**
   * Get cached data with fallback to default values
   */
  getWithFallback<T>(
    dataType: string, 
    fallbackData: T, 
    params?: Record<string, any>
  ): T {
    const cached = this.get<T>(dataType, params);
    return cached !== null ? cached : fallbackData;
  }

  /**
   * Remove specific cache entry
   */
  remove(dataType: string, params?: Record<string, any>): void {
    try {
      const key = this.generateKey(dataType, params);
      localStorage.removeItem(key);
    } catch (error) {
      console.warn('Failed to remove cache entry:', error);
    }
  }

  /**
   * Clear all cache entries
   */
  clearCache(): void {
    try {
      const keys = Object.keys(localStorage);
      keys.forEach(key => {
        if (key.startsWith('meshpay_')) {
          localStorage.removeItem(key);
        }
      });
    } catch (error) {
      console.warn('Failed to clear cache:', error);
    }
  }

  /**
   * Clean up expired entries
   */
  private cleanupExpiredEntries(): void {
    try {
      const keys = Object.keys(localStorage);
      keys.forEach(key => {
        if (key.startsWith('meshpay_')) {
          try {
            const serialized = localStorage.getItem(key);
            if (serialized) {
              const entry: CacheEntry<any> = JSON.parse(
                this.config.enableCompression ? this.decompress(serialized) : serialized
              );
              
              if (this.isExpired(entry) || entry.version !== this.config.version) {
                localStorage.removeItem(key);
              }
            }
          } catch (error) {
            // Remove corrupted entries
            localStorage.removeItem(key);
          }
        }
      });
    } catch (error) {
      console.warn('Failed to cleanup expired entries:', error);
    }
  }

  /**
   * Enforce maximum cache size
   */
  private enforceMaxCacheSize(): void {
    try {
      const keys = Object.keys(localStorage)
        .filter(key => key.startsWith('meshpay_'))
        .map(key => ({
          key,
          timestamp: this.getEntryTimestamp(key),
        }))
        .sort((a, b) => a.timestamp - b.timestamp);

      if (keys.length > this.config.maxCacheSize) {
        const toRemove = keys.slice(0, keys.length - this.config.maxCacheSize);
        toRemove.forEach(({ key }) => localStorage.removeItem(key));
      }
    } catch (error) {
      console.warn('Failed to enforce max cache size:', error);
    }
  }

  /**
   * Get timestamp of cache entry
   */
  private getEntryTimestamp(key: string): number {
    try {
      const serialized = localStorage.getItem(key);
      if (serialized) {
        const entry: CacheEntry<any> = JSON.parse(
          this.config.enableCompression ? this.decompress(serialized) : serialized
        );
        return entry.timestamp;
      }
    } catch (error) {
      console.warn('Failed to get entry timestamp:', error);
    }
    return 0;
  }

  /**
   * Get cache statistics
   */
  getStats(): CacheStats {
    const totalEntries = Object.keys(localStorage)
      .filter(key => key.startsWith('meshpay_')).length;
    
    const totalSize = this.calculateCacheSize();
    const hitRate = this.stats.hitCount + this.stats.missCount > 0 
      ? this.stats.hitCount / (this.stats.hitCount + this.stats.missCount) 
      : 0;

    return {
      totalEntries,
      totalSize,
      hitCount: this.stats.hitCount,
      missCount: this.stats.missCount,
      hitRate,
    };
  }

  /**
   * Calculate approximate cache size in bytes
   */
  private calculateCacheSize(): number {
    try {
      return Object.keys(localStorage)
        .filter(key => key.startsWith('meshpay_'))
        .reduce((total, key) => {
          const value = localStorage.getItem(key);
          return total + (key.length + (value?.length || 0)) * 2; // UTF-16 encoding
        }, 0);
    } catch (error) {
      console.warn('Failed to calculate cache size:', error);
      return 0;
    }
  }

  /**
   * Simple compression (base64 encoding for now)
   */
  private compress(data: string): string {
    if (!this.config.enableCompression) return data;
    try {
      return btoa(data);
    } catch (error) {
      console.warn('Compression failed, using uncompressed data:', error);
      return data;
    }
  }

  /**
   * Simple decompression
   */
  private decompress(data: string): string {
    if (!this.config.enableCompression) return data;
    try {
      return atob(data);
    } catch (error) {
      console.warn('Decompression failed, using compressed data:', error);
      return data;
    }
  }

  /**
   * Update cache configuration
   */
  updateConfig(newConfig: Partial<CacheConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }

  /**
   * Check if cache is available
   */
  isAvailable(): boolean {
    try {
      const testKey = '__cache_test__';
      localStorage.setItem(testKey, 'test');
      localStorage.removeItem(testKey);
      return true;
    } catch (error) {
      return false;
    }
  }
}

export const cacheService = new CacheService();
