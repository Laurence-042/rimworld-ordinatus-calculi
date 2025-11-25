import Papa from 'papaparse'
import { convertCSVToWeaponParams, isValidWeapon, type WeaponCSVData } from './weaponDataParser'
import weaponCSV from './weapon_info.csv?raw'

/**
 * 武器详细参数接口
 */
export interface WeaponDetailParams {
  // 命中率相关 - 四个距离档位的命中率
  touchAccuracy: number // 贴近命中率 (≤3格) (0-100)
  shortAccuracy: number // 近距离命中率 (≤12格) (0-100)
  mediumAccuracy: number // 中距离命中率 (≤25格) (0-100)
  longAccuracy: number // 远距离命中率 (≤40格) (0-100)

  // DPS相关
  warmupTime: number // 瞄准时间（秒）
  burstShotCount: number // 连射次数
  ticksBetweenBurstShots: number // 连射间隔（ticks，60 ticks = 1秒）
  cooldownTime: number // 冷却时间（秒）
  damagePerShot: number // 单发伤害
}

/**
 * 计算命中率
 * 根据目标距离选择对应的命中率档位
 */
export function calculateHitChance(params: WeaponDetailParams, targetDistance: number): number {
  const { touchAccuracy, shortAccuracy, mediumAccuracy, longAccuracy } = params

  // 根据距离选择命中率（注意：params 中的命中率是百分比形式 0-100）
  if (targetDistance <= 3) {
    return touchAccuracy / 100
  } else if (targetDistance <= 12) {
    return shortAccuracy / 100
  } else if (targetDistance <= 25) {
    return mediumAccuracy / 100
  } else if (targetDistance <= 40) {
    return longAccuracy / 100
  } else {
    // 超过40格使用远距离命中率（可能会很低）
    return longAccuracy / 100
  }
}

/**
 * 计算最大DPS（无护甲、100%命中）
 */
export function calculateMaxDPS(params: WeaponDetailParams): number {
  const { warmupTime, burstShotCount, ticksBetweenBurstShots, cooldownTime, damagePerShot } = params

  // 连射阶段时间（秒）
  const burstDuration = ((burstShotCount - 1) * ticksBetweenBurstShots) / 60

  // 总周期时间（秒）
  const cycleDuration = warmupTime + burstDuration + cooldownTime

  // 总伤害
  const totalDamage = burstShotCount * damagePerShot

  // DPS = 总伤害 / 周期时间
  return totalDamage / cycleDuration
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
      converted.params.damagePerShot &&
      converted.params.cooldownTime &&
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
          warmupTime: converted.params.warmupTime || 0,
          burstShotCount: converted.params.burstShotCount || 1,
          ticksBetweenBurstShots: converted.params.ticksBetweenBurstShots || 0,
          cooldownTime: converted.params.cooldownTime || 0,
          damagePerShot: converted.params.damagePerShot || 0,
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
