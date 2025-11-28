/**
 * 数据源路径配置
 * 集中管理所有 CSV 数据文件的路径和加载模式
 */

/**
 * 数据源类型
 */
export enum DataSourceType {
  Weapon = 'weapon',
  Apparel = 'apparel',
  Material = 'material',
}

/**
 * 获取数据目录基础路径
 * 使用 import.meta.env.BASE_URL 来正确处理 Vite 的 base 配置
 */
function getDataBasePath(): string {
  const baseUrl = import.meta.env.BASE_URL || '/'
  // 确保 baseUrl 以 / 结尾，然后拼接 data
  return `${baseUrl.endsWith('/') ? baseUrl : baseUrl + '/'}data`
}

/**
 * 获取数据源类型的路径
 */
function getDataSourcePath(type: DataSourceType): string {
  return `${getDataBasePath()}/${type}`
}

/**
 * 核心MOD列表（这些MOD会被合并为"Vanilla"）
 */
export const VANILLA_MODS = ['Core', 'Royalty', 'Ideology', 'Biotech', 'Anomaly', 'Odyssey']

/**
 * Vanilla 数据源配置
 */
export const VANILLA_MOD_NAME = 'Vanilla'

/**
 * 单个MOD的数据配置
 */
export interface ModDataConfig {
  /** MOD名称 */
  name: string
  /** 支持的语言列表 */
  locales: string[]
  /** 支持的数据类型 */
  types: DataSourceType[]
}

/**
 * 统一数据清单接口
 */
export interface DataManifest {
  /** 可用的MOD列表及其配置 */
  mods: ModDataConfig[]
  /** 生成时间戳 */
  generatedAt?: string
}

/**
 * 获取统一清单文件路径
 * @returns 清单文件URL路径
 */
export function getManifestPath(): string {
  return `${getDataBasePath()}/manifest.json`
}

/**
 * 获取特定 MOD 的 CSV 文件路径
 * @param type 数据源类型
 * @param modName MOD 名称
 * @param locale 语言代码
 * @returns CSV文件URL路径
 */
export function getCSVPath(type: DataSourceType, modName: string, locale: string): string {
  return `${getDataSourcePath(type)}/${modName}/${locale}.csv`
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
