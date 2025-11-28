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
 * 数据目录基础路径（相对于 public 目录）
 */
export const DATA_BASE_PATH = '/data'

/**
 * 数据源路径配置
 */
export const DATA_SOURCE_PATHS = {
  /** 武器数据路径 */
  [DataSourceType.Weapon]: `${DATA_BASE_PATH}/weapon`,
  /** 服装数据路径 */
  [DataSourceType.Apparel]: `${DATA_BASE_PATH}/apparel`,
  /** 材料数据路径 */
  [DataSourceType.Material]: `${DATA_BASE_PATH}/material`,
} as const

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
  return `${DATA_BASE_PATH}/manifest.json`
}

/**
 * 获取特定 MOD 的 CSV 文件路径
 * @param type 数据源类型
 * @param modName MOD 名称
 * @param locale 语言代码
 * @returns CSV文件URL路径
 */
export function getCSVPath(type: DataSourceType, modName: string, locale: string): string {
  return `${DATA_SOURCE_PATHS[type]}/${modName}/${locale}.csv`
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
