import { parseWeaponDataFromCSV } from './weaponDataParser'
import vanillaCSV from './weapon_data/Vanilla.csv?raw'

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
  range: number // 射程 (格/tiles)
}

/**
 * 计算命中率
 * 根据目标距离选择对应的命中率档位，并在范围之间进行线性插值
 * 如果超出武器射程，返回0
 */
export function calculateHitChance(params: WeaponDetailParams, targetDistance: number): number {
  // 超出射程时，无法开火，命中率为0
  if (targetDistance > params.range) {
    return 0
  }

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
 * 武器数据源分组
 */
export interface WeaponDataSource {
  id: string // 数据源ID，如 'vanilla', 'mod1'
  label: string // 显示名称，如 'Vanilla', 'Mod 1'
  weapons: WeaponPreset[]
}

/**
 * 从 CSV 加载武器预设（内部使用）
 */
async function loadWeaponsFromCSV(csvContent: string): Promise<WeaponPreset[]> {
  const parsedWeapons = await parseWeaponDataFromCSV(csvContent)

  return parsedWeapons.map((weapon) => ({
    name: weapon.name,
    params: weapon.params as WeaponDetailParams,
  }))
}

/**
 * 加载所有武器数据源
 */
async function loadAllWeaponDataSources(): Promise<WeaponDataSource[]> {
  const dataSources: WeaponDataSource[] = []

  // 加载原版数据
  try {
    const vanillaWeapons = await loadWeaponsFromCSV(vanillaCSV)
    dataSources.push({
      id: 'vanilla',
      label: 'Vanilla',
      weapons: vanillaWeapons,
    })
  } catch (error) {
    console.error('Failed to load Vanilla weapons:', error)
  }

  // 未来可以在这里添加 Mod 数据源
  // 例如：
  // try {
  //   const mod1CSV = await import('./weapon_data/Mod1.csv?raw')
  //   const mod1Weapons = await loadWeaponsFromCSV(mod1CSV.default)
  //   dataSources.push({
  //     id: 'mod1',
  //     label: 'Mod 1',
  //     weapons: mod1Weapons,
  //   })
  // } catch (error) {
  //   console.error('Failed to load Mod1 weapons:', error)
  // }

  return dataSources
}

/**
 * 武器数据源列表（异步加载，带缓存）
 */
let cachedDataSources: WeaponDataSource[] | null = null

export async function getWeaponDataSources(): Promise<WeaponDataSource[]> {
  if (!cachedDataSources) {
    cachedDataSources = await loadAllWeaponDataSources()
  }
  return cachedDataSources
}
