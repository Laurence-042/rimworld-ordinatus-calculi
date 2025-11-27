import type { WeaponParams } from '@/types/weapon'
import { QualityCategory } from '@/types/quality'

/**
 * CSV 武器数据接口（对应 weapon_info.csv 的列）
 */
export interface WeaponCSVData {
  名称: string
  弹药伤害: string
  护甲穿透: string
  '射程(tiles)': string
  '精度（贴近）': string
  '精度（近）': string
  '精度（中）': string
  '精度（远）': string
  冷却时间: string
  市场价值: string
  抑止能力: string
  瞄准时间: string
  连发数量: string
  '连发间隔(ticks)': string
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
    name: csvData.名称,
    params: {
      armorPenetration: parsePercentage(csvData.护甲穿透),
      burstCount: parseNumber(csvData.连发数量) || 1,
      burstTicks: parseNumber(csvData['连发间隔(ticks)']),
      cooldown: parseTime(csvData.冷却时间),
      damage: parseNumber(csvData.弹药伤害),
      accuracyLong: parsePercentage(csvData['精度（远）']),
      accuracyMedium: parsePercentage(csvData['精度（中）']),
      quality: QualityCategory.Masterwork, // 预设默认为大师品质，因为这是玩家后期能量产的最高品质，而在前中期基本是有啥用啥没得比
      range: parseNumber(csvData['射程(tiles)']),
      accuracyShort: parsePercentage(csvData['精度（近）']),
      accuracyTouch: parsePercentage(csvData['精度（贴近）']),
      warmUp: parseTime(csvData.瞄准时间),
    },
  }
}

/**
 * 过滤有效的武器数据
 * 排除：特化武器、无伤害/冷却时间/精度数据的武器
 */
export function isValidWeapon(csvData: WeaponCSVData): boolean {
  if (csvData.名称.startsWith('特化')) return false

  const damage = parseNumber(csvData.弹药伤害)
  const cooldown = parseTime(csvData.冷却时间)
  const hasAccuracy = csvData['精度（近）'] || csvData['精度（中）'] || csvData['精度（远）']

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
