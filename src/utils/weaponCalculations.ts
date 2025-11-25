import Papa from 'papaparse'
import { convertCSVToWeaponParams, isValidWeapon, type WeaponCSVData } from './weaponDataParser'
import weaponCSV from './weapon_info.csv?raw'

/**
 * 武器详细参数接口
 */
export interface WeaponDetailParams {
  // 命中率相关 - 四个距离档位的命中率
  touchAccuracy: number // Touch 命中率 (≤3格) (0-100)
  shortAccuracy: number // Short 命中率 (≤12格) (0-100)
  mediumAccuracy: number // Medium 命中率 (≤25格) (0-100)
  longAccuracy: number // Long 命中率 (≤40格) (0-100)

  // 武器属性
  damage: number // 伤害值
  armorPenetration: number // 护甲穿透 (0-100)
  warmUp: number // 预热时间 (秒)
  cooldown: number // 冷却时间 (秒)
  burstCount: number // 连发数量
  burstTicks: number // 连发间隔 (ticks)
}

/**
 * 计算命中率
 * 根据目标距离选择对应的命中率档位，并在范围之间进行线性插值
 */
export function calculateHitChance(params: WeaponDetailParams, targetDistance: number): number {
  const { touchAccuracy, shortAccuracy, mediumAccuracy, longAccuracy } = params

  // 转换为 0-1 范围
  const touch = touchAccuracy / 100
  const short = shortAccuracy / 100
  const medium = mediumAccuracy / 100
  const long = longAccuracy / 100

  let value: number

  if (targetDistance <= 3) {
    value = touch
  } else if (targetDistance <= 12) {
    // 在 Touch 和 Short 之间插值
    value = touch + (short - touch) * ((targetDistance - 3) / 9)
  } else if (targetDistance <= 25) {
    // 在 Short 和 Medium 之间插值
    value = short + (medium - short) * ((targetDistance - 12) / 13)
  } else if (targetDistance <= 40) {
    // 在 Medium 和 Long 之间插值
    value = medium + (long - medium) * ((targetDistance - 25) / 15)
  } else {
    value = long
  }

  // 限制在 0.01 到 1.0 之间
  return Math.max(0.01, Math.min(1.0, value))
}

/**
 * 计算最大DPS（无护甲、100%命中）
 */
export function calculateMaxDPS(params: WeaponDetailParams): number {
  const { warmUp, burstCount, burstTicks, cooldown, damage } = params

  // 将秒转换为 ticks (60 ticks = 1 second)
  const warmUpTicks = warmUp * 60
  const cooldownTicks = cooldown * 60

  // 连射阶段时间（ticks）
  const burstDuration = (burstCount - 1) * burstTicks

  // 总周期时间（ticks）
  const cycleDuration = warmUpTicks + burstDuration + cooldownTicks

  // 总伤害
  const totalDamage = burstCount * damage

  // DPS = 总伤害 / 周期时间（秒） = 总伤害 / (周期ticks / 60)
  return (totalDamage * 60) / cycleDuration
}

/**
 * 武器预设数据
 */
export interface WeaponPreset {
  name: string
  params: WeaponDetailParams
}

/**
 * 从 CSV 加载武器预设
 */
function loadWeaponPresetsFromCSV(): WeaponPreset[] {
  const parsed = Papa.parse<WeaponCSVData>(weaponCSV, {
    header: true,
    skipEmptyLines: true,
  })

  const presets: WeaponPreset[] = []

  for (const row of parsed.data) {
    if (!isValidWeapon(row)) {
      continue
    }

    const converted = convertCSVToWeaponParams(row)

    // 确保所有必需的参数都存在
    if (
      converted.params.damage &&
      converted.params.cooldown &&
      (converted.params.shortAccuracy ||
        converted.params.mediumAccuracy ||
        converted.params.longAccuracy)
    ) {
      presets.push({
        name: converted.name,
        params: {
          touchAccuracy: converted.params.touchAccuracy || 0,
          shortAccuracy: converted.params.shortAccuracy || 0,
          mediumAccuracy: converted.params.mediumAccuracy || 0,
          longAccuracy: converted.params.longAccuracy || 0,
          damage: converted.params.damage || 0,
          armorPenetration: converted.params.armorPenetration || 0,
          warmUp: converted.params.warmUp || 0,
          cooldown: converted.params.cooldown || 0,
          burstCount: converted.params.burstCount || 1,
          burstTicks: converted.params.burstTicks || 0,
        },
      })
    }
  }

  return presets
}

/**
 * 武器预设列表（从 CSV 加载）
 */
export const weaponPresets: WeaponPreset[] = loadWeaponPresetsFromCSV()
