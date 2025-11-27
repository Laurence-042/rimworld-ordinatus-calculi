import type { WeaponParams } from '@/types/weapon'
import { QualityCategory } from '@/types/quality'

/**
 * CSV 武器数据接口（对应 weapon_info.csv 的列）
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
 * 解析百分比字符串（例如 "16%" -> 16）
 */
function parsePercentage(percentStr: string): number {
  return parseNumber(percentStr)
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
  name: string
  params: WeaponParams
} {
  return {
    name: csvData.label,
    params: {
      defName: csvData.defName,
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
): Promise<Array<{ name: string; params: WeaponParams }>> {
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
      name: weapon.name,
      params: {
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
