/**
 * CSV解析通用工具函数
 */

import Papa from 'papaparse'

/**
 * 数据源类型
 */
export enum DataSourceType {
  Weapon = 'weapon',
  Apparel = 'apparel',
  Material = 'material',
}

/**
 * 核心MOD列表（这些MOD会被合并为"Vanilla"）
 */
export const VANILLA_MODS = ['Core', 'Royalty', 'Ideology', 'Biotech', 'Anomaly', 'Odyssey']

/**
 * 数据源配置
 */
const DATA_SOURCE_CONFIG = {
  [DataSourceType.Weapon]: {
    path: './weapon_data',
    regex: /\.\/weapon_data\/([^/]+)\/([^/]+)\.csv$/,
  },
  [DataSourceType.Apparel]: {
    path: './apparel_data',
    regex: /\.\/apparel_data\/([^/]+)\/([^/]+)\.csv$/,
  },
  [DataSourceType.Material]: {
    path: './material_data',
    regex: /\.\/material_data\/([^/]+)\/([^/]+)\.csv$/,
  },
}

/**
 * 获取数据源路径正则表达式
 */
export function getDataSourcePathRegex(type: DataSourceType): RegExp {
  return DATA_SOURCE_CONFIG[type].regex
}

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
export async function parseCSV<T extends Record<string, string>>(
  csvContent: string,
): Promise<T[]> {
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
 * 加载指定类型的所有CSV文件
 * @param type 数据源类型
 * @param locale 语言代码
 * @param globImport Vite glob导入对象
 * @returns MOD名称到CSV内容的映射
 */
export async function loadCSVByLocale(
  type: DataSourceType,
  locale: string,
  globImport: Record<string, () => Promise<unknown>>,
): Promise<Map<string, string>> {
  const pathRegex = getDataSourcePathRegex(type)
  const modCSVMap = new Map<string, string>()

  // 收集所有文件路径
  const fileGroups = new Map<
    string,
    { locale: string; path: string; loader: () => Promise<unknown> }
  >()

  for (const [path, loader] of Object.entries(globImport)) {
    const match = path.match(pathRegex)
    if (!match) continue

    const [, modName, fileLocale] = match
    if (!modName || !fileLocale) continue

    // 优先选择匹配的语言，否则使用找到的第一个
    if (!fileGroups.has(modName) || fileLocale === locale) {
      fileGroups.set(modName, { locale: fileLocale, path, loader })
    }
  }

  // 加载每个MOD的CSV内容
  for (const [modName, { loader }] of fileGroups.entries()) {
    try {
      const module = (await loader()) as { default: string }
      modCSVMap.set(modName, module.default)
    } catch (error) {
      console.warn(`Failed to load ${type} data from ${modName}:`, error)
    }
  }

  return modCSVMap
}

/**
 * 将MOD名称规范化为数据源ID
 * 核心MOD（Core/Royalty等）合并为"vanilla"
 */
export function normalizeModName(modName: string): string {
  return VANILLA_MODS.includes(modName) ? 'vanilla' : modName.toLowerCase()
}

/**
 * 将MOD名称转换为显示标签
 */
export function getModLabel(modName: string): string {
  return VANILLA_MODS.includes(modName) ? 'Vanilla' : modName
}
