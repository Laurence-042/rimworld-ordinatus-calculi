/**
 * 扩展数据源管理器
 * 管理远程数据源的获取、缓存和状态
 */

import { reactive } from 'vue'
import type { DataManifest, ModDataConfig } from './dataSourceConfig'
import { DataSourceType } from './dataSourceConfig'

/**
 * 扩展数据源配置接口
 */
export interface ExtendedDataSource {
  /** 唯一标识符 */
  id: string
  /** 数据源名称（用于显示） */
  name: string
  /** manifest.json 的完整 URL */
  manifestUrl: string
  /** 是否启用 */
  enabled: boolean
  /** 最后同步时间戳 */
  lastSynced?: number
  /** 加载状态 */
  status: 'idle' | 'loading' | 'success' | 'error'
  /** 错误信息 */
  errorMessage?: string
}

/**
 * 扩展数据源管理器状态
 */
export interface ExtendedDataSourceState {
  /** 配置的数据源列表 */
  sources: ExtendedDataSource[]
  /** 是否正在加载任何数据源 */
  isLoading: boolean
  /** 已加载的扩展清单缓存 */
  manifestCache: Map<string, DataManifest>
  /** 已加载的扩展 CSV 内容缓存 */
  csvCache: Map<string, string>
}

/** localStorage 存储键 */
const STORAGE_KEY = 'rimworld-calculator-extended-sources'

/** 默认数据源 URL */
const DEFAULT_SOURCE: ExtendedDataSource = {
  id: 'default-extra',
  name: 'Extra Data (GitHub)',
  manifestUrl:
    'https://raw.githubusercontent.com/Laurence-042/rimworld-ordinatus-calculi-extra-data/refs/heads/main/manifest.json',
  enabled: true,
  status: 'idle',
}

/**
 * 从 manifest URL 推断数据基础 URL
 * 例如: https://example.com/path/manifest.json -> https://example.com/path/
 */
function getBaseUrlFromManifest(manifestUrl: string): string {
  const lastSlash = manifestUrl.lastIndexOf('/')
  return manifestUrl.substring(0, lastSlash + 1)
}

/**
 * 构建扩展数据源的 CSV 文件 URL
 */
function getExtendedCSVUrl(
  baseUrl: string,
  type: DataSourceType,
  modName: string,
  locale: string,
): string {
  return `${baseUrl}${type}/${modName}/${locale}.csv`
}

/**
 * 生成缓存键
 */
function getCacheKey(
  sourceId: string,
  type: DataSourceType,
  modName: string,
  locale: string,
): string {
  return `${sourceId}:${type}:${modName}:${locale}`
}

/**
 * 扩展数据源管理器类
 */
class ExtendedDataSourceManager {
  /** 响应式状态 */
  private state: ExtendedDataSourceState

  /** 是否已初始化 */
  private initialized = false

  constructor() {
    this.state = reactive({
      sources: [],
      isLoading: false,
      manifestCache: new Map(),
      csvCache: new Map(),
    })
  }

  /**
   * 初始化管理器，从 localStorage 加载配置
   */
  initialize(): void {
    if (this.initialized) return

    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored) {
        const parsed = JSON.parse(stored) as ExtendedDataSource[]
        // 重置所有状态为 idle
        this.state.sources = parsed.map((source) => ({
          ...source,
          status: 'idle' as const,
          errorMessage: undefined,
        }))
      } else {
        // 使用默认数据源
        this.state.sources = [{ ...DEFAULT_SOURCE }]
      }
    } catch (error) {
      console.warn('Failed to load extended data sources from localStorage:', error)
      this.state.sources = [{ ...DEFAULT_SOURCE }]
    }

    this.initialized = true
  }

  /**
   * 保存配置到 localStorage
   */
  private saveToStorage(): void {
    try {
      // 只保存配置信息，不保存运行时状态
      const toStore = this.state.sources.map(({ id, name, manifestUrl, enabled, lastSynced }) => ({
        id,
        name,
        manifestUrl,
        enabled,
        lastSynced,
      }))
      localStorage.setItem(STORAGE_KEY, JSON.stringify(toStore))
    } catch (error) {
      console.warn('Failed to save extended data sources to localStorage:', error)
    }
  }

  /**
   * 获取数据源列表（响应式）
   */
  getSources(): ExtendedDataSource[] {
    return this.state.sources
  }

  /**
   * 获取加载状态（响应式）
   */
  getIsLoading(): boolean {
    return this.state.isLoading
  }

  /**
   * 获取已启用的数据源列表
   */
  getEnabledSources(): ExtendedDataSource[] {
    return this.state.sources.filter((s) => s.enabled)
  }

  /**
   * 添加新数据源
   */
  addSource(name: string, manifestUrl: string): ExtendedDataSource {
    const newSource: ExtendedDataSource = {
      id: `source-${Date.now()}`,
      name,
      manifestUrl,
      enabled: true,
      status: 'idle',
    }
    this.state.sources.push(newSource)
    this.saveToStorage()
    return newSource
  }

  /**
   * 更新数据源配置
   */
  updateSource(
    id: string,
    updates: Partial<Pick<ExtendedDataSource, 'name' | 'manifestUrl' | 'enabled'>>,
  ): void {
    const source = this.state.sources.find((s) => s.id === id)
    if (source) {
      Object.assign(source, updates)
      // 如果 URL 改变了，清除相关缓存
      if (updates.manifestUrl) {
        this.state.manifestCache.delete(id)
        // 清除该源的所有 CSV 缓存
        for (const key of this.state.csvCache.keys()) {
          if (key.startsWith(`${id}:`)) {
            this.state.csvCache.delete(key)
          }
        }
        source.status = 'idle'
        source.lastSynced = undefined
      }
      this.saveToStorage()
    }
  }

  /**
   * 删除数据源
   */
  removeSource(id: string): void {
    const index = this.state.sources.findIndex((s) => s.id === id)
    if (index !== -1) {
      this.state.sources.splice(index, 1)
      // 清除相关缓存
      this.state.manifestCache.delete(id)
      for (const key of this.state.csvCache.keys()) {
        if (key.startsWith(`${id}:`)) {
          this.state.csvCache.delete(key)
        }
      }
      this.saveToStorage()
    }
  }

  /**
   * 重置为默认配置
   */
  resetToDefault(): void {
    this.state.sources = [{ ...DEFAULT_SOURCE }]
    this.state.manifestCache.clear()
    this.state.csvCache.clear()
    this.saveToStorage()
  }

  /**
   * 加载单个数据源的 manifest
   */
  async loadManifest(source: ExtendedDataSource): Promise<DataManifest | null> {
    // 检查缓存
    const cached = this.state.manifestCache.get(source.id)
    if (cached && source.status === 'success') {
      return cached
    }

    source.status = 'loading'
    source.errorMessage = undefined

    try {
      const response = await fetch(source.manifestUrl)
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }
      const manifest: DataManifest = await response.json()
      this.state.manifestCache.set(source.id, manifest)
      source.status = 'success'
      source.lastSynced = Date.now()
      this.saveToStorage()
      return manifest
    } catch (error) {
      source.status = 'error'
      source.errorMessage = error instanceof Error ? error.message : String(error)
      console.error(`Failed to load manifest from ${source.manifestUrl}:`, error)
      return null
    }
  }

  /**
   * 加载所有已启用数据源的 manifest
   */
  async loadAllManifests(): Promise<void> {
    const enabledSources = this.getEnabledSources()
    if (enabledSources.length === 0) return

    this.state.isLoading = true

    try {
      await Promise.all(enabledSources.map((source) => this.loadManifest(source)))
    } finally {
      this.state.isLoading = false
    }
  }

  /**
   * 获取指定类型的扩展 MOD 列表
   */
  async getExtendedModsForType(
    type: DataSourceType,
  ): Promise<{ sourceId: string; baseUrl: string; mod: ModDataConfig }[]> {
    const results: { sourceId: string; baseUrl: string; mod: ModDataConfig }[] = []

    for (const source of this.getEnabledSources()) {
      const manifest = this.state.manifestCache.get(source.id)
      if (!manifest) continue

      const baseUrl = getBaseUrlFromManifest(source.manifestUrl)
      for (const mod of manifest.mods) {
        if (mod.types.includes(type)) {
          results.push({ sourceId: source.id, baseUrl, mod })
        }
      }
    }

    return results
  }

  /**
   * 加载扩展 CSV 文件
   */
  async loadExtendedCSV(
    sourceId: string,
    baseUrl: string,
    type: DataSourceType,
    modName: string,
    locale: string,
  ): Promise<string | null> {
    const cacheKey = getCacheKey(sourceId, type, modName, locale)

    // 检查缓存
    const cached = this.state.csvCache.get(cacheKey)
    if (cached) {
      return cached
    }

    const url = getExtendedCSVUrl(baseUrl, type, modName, locale)

    try {
      const response = await fetch(url)
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }
      const content = await response.text()
      this.state.csvCache.set(cacheKey, content)
      return content
    } catch (error) {
      console.warn(`Failed to load extended CSV from ${url}:`, error)
      return null
    }
  }

  /**
   * 加载指定类型和语言的所有扩展 CSV 文件
   * @returns MOD名称到CSV内容的映射（key 格式: sourceId:modName）
   */
  async loadExtendedCSVByLocale(
    type: DataSourceType,
    locale: string,
  ): Promise<Map<string, string>> {
    const resultMap = new Map<string, string>()

    // 确保 manifests 已加载
    await this.loadAllManifests()

    const extendedMods = await this.getExtendedModsForType(type)

    // 并行加载所有扩展 CSV
    const loadPromises = extendedMods.map(async ({ sourceId, baseUrl, mod }) => {
      // 优先使用请求的语言，否则使用第一个可用语言
      let targetLocale = locale
      if (!mod.locales.includes(locale)) {
        const firstLocale = mod.locales[0]
        if (firstLocale) {
          targetLocale = firstLocale
        } else {
          return null
        }
      }

      const content = await this.loadExtendedCSV(sourceId, baseUrl, type, mod.name, targetLocale)
      if (content) {
        // 使用 sourceId:modName 作为 key 避免与内置数据冲突
        return { key: `${sourceId}:${mod.name}`, content }
      }
      return null
    })

    const results = await Promise.all(loadPromises)
    for (const result of results) {
      if (result) {
        resultMap.set(result.key, result.content)
      }
    }

    return resultMap
  }

  /**
   * 刷新指定数据源
   */
  async refreshSource(id: string): Promise<void> {
    const source = this.state.sources.find((s) => s.id === id)
    if (!source) return

    // 清除缓存
    this.state.manifestCache.delete(id)
    for (const key of this.state.csvCache.keys()) {
      if (key.startsWith(`${id}:`)) {
        this.state.csvCache.delete(key)
      }
    }

    // 重新加载
    await this.loadManifest(source)
  }

  /**
   * 刷新所有数据源
   */
  async refreshAll(): Promise<void> {
    // 清除所有缓存
    this.state.manifestCache.clear()
    this.state.csvCache.clear()

    // 重置所有状态
    for (const source of this.state.sources) {
      source.status = 'idle'
    }

    // 重新加载
    await this.loadAllManifests()
  }

  /**
   * 获取加载统计信息
   */
  getLoadingStats(): { total: number; loaded: number; failed: number; loading: number } {
    const sources = this.state.sources.filter((s) => s.enabled)
    return {
      total: sources.length,
      loaded: sources.filter((s) => s.status === 'success').length,
      failed: sources.filter((s) => s.status === 'error').length,
      loading: sources.filter((s) => s.status === 'loading').length,
    }
  }
}

// 单例实例
const manager = new ExtendedDataSourceManager()

/**
 * 获取扩展数据源管理器实例
 */
export function useExtendedDataSourceManager(): ExtendedDataSourceManager {
  manager.initialize()
  return manager
}

// 导出类型和工具函数
export { DataSourceType }
