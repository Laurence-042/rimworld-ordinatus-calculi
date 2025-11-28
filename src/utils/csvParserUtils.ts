/**
 * CSV解析通用工具函数
 * 使用 fetch 从 public/data 目录动态加载 CSV 文件
 */

import Papa from 'papaparse'
import {
  DataSourceType,
  getManifestPath,
  getCSVPath,
  VANILLA_MODS,
  type DataManifest,
  type ModDataConfig,
} from './dataSourceConfig'

// Re-export for backward compatibility
export { DataSourceType, VANILLA_MODS }
export { normalizeModName, getModLabel } from './dataSourceConfig'

/**
 * 全局清单缓存
 */
let manifestCache: DataManifest | null = null

/**
 * 解析数值字符串
 */
export function parseNumeric(value: string | undefined): number {
  if (!value || value.trim() === '') return 0
  const num = parseFloat(value.trim())
  return isNaN(num) ? 0 : num
}

/**
 * 解析可选数值字符串
 */
export function parseOptionalNumeric(value: string | undefined): number | undefined {
  if (!value || value.trim() === '') return undefined
  const num = parseFloat(value.trim())
  return isNaN(num) ? undefined : num
}

/**
 * 解析百分比字符串（小数或百分比格式 -> 百分比数值）
 * - 小数格式："0.16" -> 16
 * - 百分比格式："16%" -> 16
 */
export function parsePercentage(value: string | undefined): number {
  const num = parseNumeric(value)
  // 如果是小数格式（0-1范围），转换为百分比
  if (num > 0 && num <= 1) {
    return num * 100
  }
  return num
}

/**
 * 解析逗号/顿号分隔的字符串数组
 */
export function parseDelimitedString(value: string | undefined): string[] {
  if (!value || value.trim() === '') return []
  return value
    .split(/[,，、]/)
    .map((item) => item.trim())
    .filter(Boolean)
}

/**
 * 解析可选的分隔字符串数组
 */
export function parseOptionalDelimitedString(value: string | undefined): string[] | undefined {
  if (!value || value.trim() === '') return undefined
  const result = parseDelimitedString(value)
  return result.length > 0 ? result : undefined
}

/**
 * 通用CSV解析函数
 */
export async function parseCSV<T extends Record<string, string>>(csvContent: string): Promise<T[]> {
  return new Promise((resolve, reject) => {
    Papa.parse<T>(csvContent, {
      complete: (results) => {
        resolve(results.data)
      },
      error: (error: Error) => {
        reject(new Error(`CSV解析错误: ${error.message}`))
      },
      header: true,
      skipEmptyLines: true,
    })
  })
}

/**
 * 获取全局数据清单
 * @returns 清单数据
 */
export async function getManifest(): Promise<DataManifest> {
  // 检查缓存
  if (manifestCache) {
    return manifestCache
  }

  const manifestPath = getManifestPath()
  try {
    const response = await fetch(manifestPath)
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`)
    }
    const manifest: DataManifest = await response.json()
    manifestCache = manifest
    return manifest
  } catch (error) {
    console.warn(`Failed to load manifest:`, error)
    // 返回空清单
    return { mods: [] }
  }
}

/**
 * 获取支持指定数据类型的MOD列表
 * @param type 数据源类型
 * @returns 支持该类型的MOD配置列表
 */
export async function getModsForType(type: DataSourceType): Promise<ModDataConfig[]> {
  const manifest = await getManifest()
  return manifest.mods.filter((mod) => mod.types.includes(type))
}

/**
 * 清除清单缓存（用于强制刷新）
 */
export function clearManifestCache(): void {
  manifestCache = null
}

/**
 * 加载单个CSV文件
 * @param type 数据源类型
 * @param modName MOD名称
 * @param locale 语言代码
 * @returns CSV内容字符串，失败时返回null
 */
export async function loadCSVFile(
  type: DataSourceType,
  modName: string,
  locale: string,
): Promise<string | null> {
  const csvPath = getCSVPath(type, modName, locale)
  try {
    const response = await fetch(csvPath)
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`)
    }
    return await response.text()
  } catch (error) {
    console.warn(`Failed to load CSV from ${csvPath}:`, error)
    return null
  }
}

/**
 * 加载指定类型的所有CSV文件
 * @param type 数据源类型
 * @param locale 语言代码
 * @returns MOD名称到CSV内容的映射
 */
export async function loadCSVByLocale(
  type: DataSourceType,
  locale: string,
): Promise<Map<string, string>> {
  const modCSVMap = new Map<string, string>()

  // 获取支持该类型的MOD列表
  const mods = await getModsForType(type)

  if (mods.length === 0) {
    console.warn(`No mods found for ${type}`)
    return modCSVMap
  }

  // 并行加载所有MOD的CSV文件
  const loadPromises = mods.map(async (mod) => {
    // 优先使用请求的语言，否则使用第一个可用语言
    let targetLocale = locale
    if (!mod.locales.includes(locale)) {
      const firstLocale = mod.locales[0]
      if (firstLocale) {
        targetLocale = firstLocale
        console.warn(`Locale ${locale} not available for ${mod.name}, using ${targetLocale}`)
      } else {
        console.warn(`No locales available for ${mod.name}`)
        return null
      }
    }

    const content = await loadCSVFile(type, mod.name, targetLocale)
    if (content) {
      return { modName: mod.name, content }
    }
    return null
  })

  const results = await Promise.all(loadPromises)

  for (const result of results) {
    if (result) {
      modCSVMap.set(result.modName, result.content)
    }
  }

  return modCSVMap
}
