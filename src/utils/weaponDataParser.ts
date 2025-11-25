/**
 * CSV 武器数据接口（对应 weapon_info.csv 的列）
 */
export interface WeaponCSVData {
  名称: string
  伤害: string
  护甲穿透: string
  抑止能力: string
  预热时间: string
  冷却时间: string
  '射程(tiles)': string
  射速: string
  连发数量: string
  '连发间隔(ticks)': string
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
    warmupTime: number
    burstShotCount: number
    ticksBetweenBurstShots: number
    cooldownTime: number
    damagePerShot: number
    armorPenetration: number
  }>
} {
  const warmupTime = parseTime(csvData.预热时间)
  const cooldownTime = parseTime(csvData.冷却时间)
  const burstShotCount = parseNumber(csvData.连发数量) || 1
  const ticksBetweenBurstShots = parseNumber(csvData['连发间隔(ticks)']) || 0
  const damagePerShot = parseNumber(csvData.伤害)
  const armorPenetration = parsePercentage(csvData.护甲穿透)

  // 精度数据：近、中、远
  const shortAccuracy = parsePercentage(csvData['精度（近）'])
  const mediumAccuracy = parsePercentage(csvData['精度（中）'])
  const longAccuracy = parsePercentage(csvData['精度（远）'])

  // 贴近精度通常比近距离精度高一些，如果没有数据则估算
  const touchAccuracy = shortAccuracy > 0 ? Math.min(1, shortAccuracy * 1.05) : 0

  return {
    name: csvData.名称,
    params: {
      touchAccuracy: touchAccuracy * 100,
      shortAccuracy: shortAccuracy * 100,
      mediumAccuracy: mediumAccuracy * 100,
      longAccuracy: longAccuracy * 100,
      warmupTime,
      burstShotCount,
      ticksBetweenBurstShots,
      cooldownTime,
      damagePerShot,
      armorPenetration: armorPenetration * 100,
    },
  }
}

/**
 * 过滤有效的武器数据
 * 排除没有伤害数据、没有时间数据的武器（如手榴弹等）
 */
export function isValidWeapon(csvData: WeaponCSVData): boolean {
  const damage = parseNumber(csvData.伤害)
  const cooldown = parseTime(csvData.冷却时间)
  const hasAccuracy = csvData['精度（近）'] || csvData['精度（中）'] || csvData['精度（远）']

  // 必须有伤害值、有冷却时间、有精度数据
  return damage > 0 && cooldown > 0 && !!hasAccuracy
}
