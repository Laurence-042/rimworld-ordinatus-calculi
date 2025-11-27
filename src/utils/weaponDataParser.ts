import type { WeaponParams } from '@/types/weapon'
import { QualityCategory } from '@/types/quality'

/**
 * CSV 武器数据接口（对应 weapon_info.csv 的列）
 * 注意：精度和穿甲数据在 CSV 中为小数格式（0-1），解析时会转换为百分比（0-100）
 */
export interface WeaponCSVData {
  defName: string
  label: string
  damage: string
  armorPenetration: string
  range: string
  accuracyTouch: string
  accuracyShort: string
  accuracyMedium: string
  accuracyLong: string
  cooldown: string
  marketValue: string
  stoppingPower: string
  warmupTime: string
  burstShotCount: string
  ticksBetweenBurstShots: string
}

/**
 * 解析数字字符串
 */
function parseNumber(numStr: string): number {
  if (!numStr) return 0
  const match = numStr.match(/[\d.]+/)
  return match ? parseFloat(match[0]) : 0
}

/**
 * 解析百分比字符串
 * 支持两种格式：
 * - 小数格式："0.16" -> 16
 * - 百分比格式："16%" -> 16
 */
function parsePercentage(percentStr: string): number {
  if (!percentStr) return 0
  const num = parseNumber(percentStr)
  // 如果是小数格式（0-1范围），转换为百分比
  if (num > 0 && num <= 1) {
    return num * 100
  }
  return num
}

/**
 * 解析时间字符串（例如 "1.50秒" -> 1.5）
 */
function parseTime(timeStr: string): number {
  return parseNumber(timeStr)
}

/**
 * 将 CSV 数据转换为武器参数
 */
export function convertCSVToWeaponParams(csvData: WeaponCSVData): {
  defName: string
  params: WeaponParams
} {
  return {
    defName: csvData.defName,
    params: {
      label: csvData.label,
      armorPenetration: parsePercentage(csvData.armorPenetration),
      burstCount: parseNumber(csvData.burstShotCount) || 1,
      burstTicks: parseNumber(csvData.ticksBetweenBurstShots),
      cooldown: parseTime(csvData.cooldown),
      damage: parseNumber(csvData.damage),
      accuracyLong: parsePercentage(csvData.accuracyLong),
      accuracyMedium: parsePercentage(csvData.accuracyMedium),
      quality: QualityCategory.Masterwork, // 预设默认为大师品质，因为这是玩家后期能量产的最高品质，而在前中期基本是有啥用啥没得比
      range: parseNumber(csvData.range),
      accuracyShort: parsePercentage(csvData.accuracyShort),
      accuracyTouch: parsePercentage(csvData.accuracyTouch),
      warmUp: parseTime(csvData.warmupTime),
    },
  }
}

/**
 * 过滤有效的武器数据
 * 排除：特化武器、无伤害/冷却时间/精度数据的武器
 */
export function isValidWeapon(csvData: WeaponCSVData): boolean {
  if (csvData.defName.startsWith('特化')) return false

  const damage = parseNumber(csvData.damage)
  const cooldown = parseTime(csvData.cooldown)
  const hasAccuracy = csvData.accuracyShort || csvData.accuracyMedium || csvData.accuracyLong

  return damage > 0 && cooldown > 0 && !!hasAccuracy
}

/**
 * 从 CSV 原始文本解析武器数据
 */
export async function parseWeaponDataFromCSV(
  csvContent: string,
): Promise<Array<{ defName: string; params: WeaponParams }>> {
  const Papa = await import('papaparse')
  const parsed = Papa.parse<WeaponCSVData>(csvContent, {
    header: true,
    skipEmptyLines: true,
  })

  return parsed.data
    .filter(isValidWeapon)
    .map(convertCSVToWeaponParams)
    .filter(
      (weapon) =>
        weapon.params.damage &&
        weapon.params.cooldown &&
        (weapon.params.accuracyShort || weapon.params.accuracyMedium || weapon.params.accuracyLong),
    )
    .map((weapon) => ({
      defName: weapon.defName,
      params: {
        label: weapon.params.label,
        armorPenetration: weapon.params.armorPenetration || 0,
        burstCount: weapon.params.burstCount || 1,
        burstTicks: weapon.params.burstTicks || 0,
        cooldown: weapon.params.cooldown || 0,
        damage: weapon.params.damage || 0,
        accuracyLong: weapon.params.accuracyLong || 0,
        accuracyMedium: weapon.params.accuracyMedium || 0,
        quality: weapon.params.quality || QualityCategory.Masterwork,
        range: weapon.params.range || 50,
        accuracyShort: weapon.params.accuracyShort || 0,
        accuracyTouch: weapon.params.accuracyTouch || 0,
        warmUp: weapon.params.warmUp || 0,
      },
    }))
}

/**
 * 从所有 MOD 目录加载武器数据
 * 根据指定语言加载对应的 CSV 文件
 *
 * @param locale - 语言代码（如 'zh-CN', 'en-US'）
 * @param csvFilesGlob - Vite glob 导入结果
 * @returns MOD 名称到武器数据的映射
 */
export async function loadAllWeaponDataByLocale(
  locale: string,
): Promise<Map<string, Array<{ defName: string; params: WeaponParams }>>> {
  // 动态加载所有 MOD 目录下的 CSV 文件
  const csvFilesGlob = import.meta.glob('./weapon_data/**/*.csv', {
    query: '?raw',
    eager: false,
  })

  const modWeaponsMap = new Map<string, Array<{ defName: string; params: WeaponParams }>>()

  // 按 MOD 目录分组
  const modGroups = new Map<
    string,
    { locale: string; path: string; loader: () => Promise<unknown> }
  >()

  for (const [path, loader] of Object.entries(csvFilesGlob)) {
    // 解析路径：./weapon_data/<MOD_NAME>/<locale>.csv
    const match = path.match(/\.\/weapon_data\/([^/]+)\/([^/]+)\.csv$/)
    if (!match) continue

    const modName = match[1]
    const fileLocale = match[2]

    if (!modName || !fileLocale) continue

    // 如果该 MOD 还没有加载，或者当前文件匹配目标语言
    if (!modGroups.has(modName) || fileLocale === locale) {
      modGroups.set(modName, { locale: fileLocale, path, loader })
    }
  }

  // 加载每个 MOD 的数据
  for (const [modName, { locale: fileLocale, path, loader }] of modGroups.entries()) {
    try {
      const module = (await loader()) as { default: string }
      const csvContent = module.default

      const weapons = await parseWeaponDataFromCSV(csvContent)

      if (weapons.length > 0) {
        modWeaponsMap.set(modName, weapons)
        console.log(`Loaded ${weapons.length} weapons from ${modName} (${fileLocale})`)
      }
    } catch (error) {
      console.warn(`Failed to load data from ${path}:`, error)
    }
  }

  return modWeaponsMap
}
