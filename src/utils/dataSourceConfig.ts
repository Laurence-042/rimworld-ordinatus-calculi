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
 * 数据源路径配置
 */
export const DATA_SOURCE_PATHS = {
  /** 武器数据路径 */
  [DataSourceType.Weapon]: './weapon_data',
  /** 服装数据路径 */
  [DataSourceType.Apparel]: './apparel_data',
  /** 材料数据路径 */
  [DataSourceType.Material]: './material_data',
} as const

/**
 * 获取数据源的 glob 模式
 * @param type 数据源类型
 * @returns glob 模式字符串
 */
export function getDataSourceGlobPattern(type: DataSourceType): string {
  return `${DATA_SOURCE_PATHS[type]}/**/*.csv`
}

/**
 * 获取数据源路径的正则表达式
 * 用于从 glob 匹配的路径中提取 MOD 名称和语言代码
 * @param type 数据源类型
 * @returns 正则表达式
 */
export function getDataSourcePathRegex(type: DataSourceType): RegExp {
  const basePath = DATA_SOURCE_PATHS[type].replace('./', '\\.\\/') // 转义 ./
  return new RegExp(`${basePath}\\/([^/]+)\\/([^/]+)\\.csv$`)
}

/**
 * 获取特定 MOD 的数据源路径
 * @param type 数据源类型
 * @param modName MOD 名称
 * @param locale 语言代码
 * @returns 完整路径
 */
export function getModDataSourcePath(
  type: DataSourceType,
  modName: string,
  locale: string,
): string {
  return `${DATA_SOURCE_PATHS[type]}/${modName}/${locale}.csv`
}

/**
 * Vanilla 数据源配置
 */
export const VANILLA_MOD_NAME = 'Vanilla'
