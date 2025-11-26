/**
 * CSV 武器数据接口（对应 weapon_info.csv 的列）
 */
export interface WeaponCSVData {
  名称: string
  弹药伤害: string
  护甲穿透: string
  抑止能力: string
  瞄准时间: string
  冷却时间: string
  '射程(tiles)': string
  连发数量: string
  '连发间隔(ticks)': string
  '精度（贴近）': string
  '精度（近）': string
  '精度（中）': string
  '精度（远）': string
  市场价值: string
}

/**
 * 解析时间字符串（例如 "1.50秒" -> 1.5）
 */
function parseTime(timeStr: string): number {
  if (!timeStr || timeStr === '') return 0
  const match = timeStr.match(/[\d.]+/)
  return match ? parseFloat(match[0]) : 0
}

/**
 * 解析百分比字符串（例如 "16%" -> 0.16）
 */
function parsePercentage(percentStr: string): number {
  if (!percentStr || percentStr === '') return 0
  const match = percentStr.match(/[\d.]+/)
  return match ? parseFloat(match[0]) / 100 : 0
}

/**
 * 解析数字字符串
 */
function parseNumber(numStr: string): number {
  if (!numStr || numStr === '') return 0
  const match = numStr.match(/[\d.]+/)
  return match ? parseFloat(match[0]) : 0
}

/**
 * 将 CSV 数据转换为 WeaponDetailParams
 */
export function convertCSVToWeaponParams(csvData: WeaponCSVData): {
  name: string
  params: Partial<{
    touchAccuracy: number
    shortAccuracy: number
    mediumAccuracy: number
    longAccuracy: number
    damage: number
    armorPenetration: number
    warmUp: number
    cooldown: number
    burstCount: number
    burstTicks: number
    range: number
  }>
} {
  const warmupTimeSeconds = parseTime(csvData.瞄准时间)
  const cooldownTimeSeconds = parseTime(csvData.冷却时间)
  const burstCount = parseNumber(csvData.连发数量) || 1
  const burstTicks = parseNumber(csvData['连发间隔(ticks)']) || 0
  const damage = parseNumber(csvData.弹药伤害)
  const armorPenetration = parsePercentage(csvData.护甲穿透)
  const range = parseNumber(csvData['射程(tiles)']) || 0

  // 精度数据：近、中、远
  const touchAccuracy = parsePercentage(csvData['精度（贴近）'])
  const shortAccuracy = parsePercentage(csvData['精度（近）'])
  const mediumAccuracy = parsePercentage(csvData['精度（中）'])
  const longAccuracy = parsePercentage(csvData['精度（远）'])

  return {
    name: csvData.名称,
    params: {
      touchAccuracy: touchAccuracy * 100,
      shortAccuracy: shortAccuracy * 100,
      mediumAccuracy: mediumAccuracy * 100,
      longAccuracy: longAccuracy * 100,
      damage,
      armorPenetration: armorPenetration * 100,
      warmUp: warmupTimeSeconds, // 保持秒
      cooldown: cooldownTimeSeconds, // 保持秒
      burstCount,
      burstTicks,
      range,
    },
  }
}

/**
 * 过滤有效的武器数据
 * 排除：
 * 1. 没有伤害数据、没有时间数据的武器（如手榴弹等）
 * 2. 名称包含"发射器"或"手榴弹"的武器（特殊投掷武器）
 * 3. 以"特化"开头的武器（重复副本）
 */
export function isValidWeapon(csvData: WeaponCSVData): boolean {
  const name = csvData.名称
  const damage = parseNumber(csvData.弹药伤害)
  const cooldownSeconds = parseTime(csvData.冷却时间)
  const hasAccuracy = csvData['精度（近）'] || csvData['精度（中）'] || csvData['精度（远）']

  // 排除特殊武器类型
  if (name.startsWith('特化')) {
    return false
  }

  // 必须有伤害值、有冷却时间、有精度数据
  return damage > 0 && cooldownSeconds > 0 && !!hasAccuracy
}
