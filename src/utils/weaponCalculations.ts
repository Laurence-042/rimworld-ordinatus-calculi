import { parseWeaponDataFromCSV } from './weaponDataParser'
import vanillaCSV from './weapon_data/Vanilla.csv?raw'
import type { WeaponDataSource, WeaponParams, WeaponPreset } from '@/types/weapon'

// WeaponDetailParams 是 WeaponParams 的别名，用于向后兼容
export type WeaponDetailParams = WeaponParams

/**
 * 计算命中率
 * 根据目标距离选择对应的命中率档位，并在范围之间进行线性插值
 * 如果超出武器射程，返回0
 */
export function calculateHitChance(params: WeaponParams, targetDistance: number): number {
  if (targetDistance > params.range) return 0

  const { longAccuracy, mediumAccuracy, shortAccuracy, touchAccuracy } = params

  // 转换为 0-1 范围
  const accuracies = {
    long: longAccuracy / 100,
    medium: mediumAccuracy / 100,
    short: shortAccuracy / 100,
    touch: touchAccuracy / 100,
  }

  let value: number

  if (targetDistance <= 3) {
    value = accuracies.touch
  } else if (targetDistance <= 12) {
    value = accuracies.touch + (accuracies.short - accuracies.touch) * ((targetDistance - 3) / 9)
  } else if (targetDistance <= 25) {
    value = accuracies.short + (accuracies.medium - accuracies.short) * ((targetDistance - 12) / 13)
  } else if (targetDistance <= 40) {
    value = accuracies.medium + (accuracies.long - accuracies.medium) * ((targetDistance - 25) / 15)
  } else {
    value = accuracies.long
  }

  return Math.max(0.01, Math.min(1.0, value))
}

/**
 * 计算最大DPS（无护甲、100%命中）
 */
export function calculateMaxDPS(params: WeaponParams): number {
  const { burstCount, burstTicks, cooldown, damage, warmUp } = params

  const warmUpTicks = warmUp * 60
  const cooldownTicks = cooldown * 60
  const burstDuration = (burstCount - 1) * burstTicks
  const cycleDuration = warmUpTicks + burstDuration + cooldownTicks
  const totalDamage = burstCount * damage

  return (totalDamage * 60) / cycleDuration
}

// 缓存
let cachedDataSources: WeaponDataSource[] | null = null

// 私有函数
async function loadWeaponsFromCSV(csvContent: string): Promise<WeaponPreset[]> {
  const parsedWeapons = await parseWeaponDataFromCSV(csvContent)
  return parsedWeapons.map((weapon) => ({
    name: weapon.name,
    params: weapon.params,
  }))
}

async function loadAllWeaponDataSources(): Promise<WeaponDataSource[]> {
  const dataSources: WeaponDataSource[] = []

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

// 公共API
export async function getWeaponDataSources(): Promise<WeaponDataSource[]> {
  if (!cachedDataSources) {
    cachedDataSources = await loadAllWeaponDataSources()
  }
  return cachedDataSources
}
