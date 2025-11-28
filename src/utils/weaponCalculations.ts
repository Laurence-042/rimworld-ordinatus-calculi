import { getWeaponDataSources as loadWeaponDataSources } from './weaponDataParser'
import type { WeaponDataSource, WeaponParams, WeaponPreset } from '@/types/weapon'
import { WeaponQualityMultipliers } from '@/types/quality'
import i18n from '@/i18n'
import type { Ref } from 'vue'

/**
 * 计算命中率
 *
 * **RimWorld 命中率机制：**
 *
 * 游戏定义了 4 个距离档位的基础命中率：
 * - Touch (贴近)：0-3 格
 * - Short (近距离)：3-12 格
 * - Medium (中距离)：12-25 格
 * - Long (远距离)：25-40 格
 *
 * 在两个档位之间，命中率采用**线性插值**：
 * ```
 * hitChance = baseAccuracy1 + (baseAccuracy2 - baseAccuracy1) × (distance - range1) / (range2 - range1)
 * ```
 *
 * 如果目标距离超出武器射程，命中率为 0。
 *
 * **示例：**
 * ```
 * 武器：Touch=95%, Short=85%, Medium=70%, Long=50%
 *
 * 距离 = 2格：Touch 档位 → 95%
 * 距离 = 7格：Touch 和 Short 之间插值
 *   → 95% + (85% - 95%) × (7 - 3) / (12 - 3) = 95% - 10% × 4/9 ≈ 90.6%
 * 距离 = 17格：Medium 档位内插值
 *   → 70% + (50% - 70%) × (17 - 12) / (25 - 12) ≈ 62.3%
 * ```
 *
 * 根据目标距离选择对应的命中率档位，并在范围之间进行线性插值
 * 如果超出武器射程，返回 0
 *
 * @param params - 武器参数（包含各档位命中率和射程）
 * @param targetDistance - 目标距离（格）
 * @returns 命中率 (0-1)
 */
export function calculateHitChance(params: WeaponParams, targetDistance: number): number {
  // 超出射程返回 0
  if (targetDistance > params.range) return 0

  // 负距离视为 0
  if (targetDistance < 0) {
    console.warn(`目标距离为负数: ${targetDistance}，已自动设为 0`)
    targetDistance = 0
  }

  const { accuracyLong, accuracyMedium, accuracyShort, accuracyTouch, quality } = params

  // 获取品质系数
  const qualityMultipliers = WeaponQualityMultipliers[quality]
  const accuracyMultiplier = qualityMultipliers.rangedAccuracy

  // 转换为 0-1 范围并应用品质系数
  const accuracies = {
    long: (accuracyLong / 100) * accuracyMultiplier,
    medium: (accuracyMedium / 100) * accuracyMultiplier,
    short: (accuracyShort / 100) * accuracyMultiplier,
    touch: (accuracyTouch / 100) * accuracyMultiplier,
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
 *
 * **RimWorld DPS 计算公式：**
 *
 * ```
 * DPS = (总伤害 × 60) / 攻击周期时长
 * ```
 *
 * 其中：
 * - **总伤害** = 连发数量 × 单发伤害
 * - **攻击周期时长(ticks)** = 预热时间 + 连发持续时间 + 冷却时间
 *   - 预热时间(ticks) = warmUp(秒) × 60
 *   - 连发持续时间(ticks) = (burstCount - 1) × burstTicks
 *   - 冷却时间(ticks) = cooldown(秒) × 60
 * - **60** 是转换系数（1秒 = 60 ticks）
 *
 * **示例：**
 * ```
 * 武器：伤害=12, 连发=3, 连发间隔=8ticks, 预热=1.5s, 冷却=2.1s
 *
 * 总伤害 = 3 × 12 = 36
 * 攻击周期 = (1.5×60) + (3-1)×8 + (2.1×60)
 *         = 90 + 16 + 126
 *         = 232 ticks
 *
 * DPS = (36 × 60) / 232 ≈ 9.31
 * ```
 *
 * @param params - 武器参数
 * @returns 最大DPS值
 */
export function calculateMaxDPS(params: WeaponParams): number {
  const { burstCount, burstTicks, cooldown, damage, quality, warmUp } = params

  // 获取品质系数
  const qualityMultipliers = WeaponQualityMultipliers[quality]
  const damageMultiplier = qualityMultipliers.rangedDamage

  // 应用品质系数到伤害
  const actualDamage = damage * damageMultiplier

  // 验证参数
  if (damage < 0) {
    console.warn(`伤害值为负数: ${damage}，已自动设为 0`)
    return 0
  }
  if (burstCount < 1) {
    console.warn(`连发数量小于1: ${burstCount}，已自动设为 1`)
  }

  const warmUpTicks = warmUp * 60
  const cooldownTicks = cooldown * 60
  const burstDuration = (Math.max(1, burstCount) - 1) * burstTicks
  const cycleDuration = warmUpTicks + burstDuration + cooldownTicks

  // 防止除以 0
  if (cycleDuration <= 0) {
    console.error(`攻击周期为非正数: ${cycleDuration}，无法计算DPS`)
    return 0
  }

  const totalDamage = Math.max(1, burstCount) * actualDamage

  return (totalDamage * 60) / cycleDuration
}

/**
 * 获取应用品质系数后的护甲穿透值
 *
 * @param params - 武器参数
 * @returns 实际护甲穿透值 (0-200)
 */
export function getActualArmorPenetration(params: WeaponParams): number {
  const qualityMultipliers = WeaponQualityMultipliers[params.quality]
  return params.armorPenetration * qualityMultipliers.rangedArmorPenetration
}

/**
 * 获取应用品质系数后的伤害值
 *
 * @param params - 武器参数
 * @returns 实际伤害值
 */
export function getActualDamage(params: WeaponParams): number {
  const qualityMultipliers = WeaponQualityMultipliers[params.quality]
  return params.damage * qualityMultipliers.rangedDamage
}

/**
 * 获取应用品质系数后的精度值
 *
 * @param params - 武器参数
 * @returns 实际精度值对象 { touch, short, medium, long }，值为 0-100 范围
 */
export function getActualAccuracies(params: WeaponParams): {
  touch: number
  short: number
  medium: number
  long: number
} {
  const qualityMultipliers = WeaponQualityMultipliers[params.quality]
  const multiplier = qualityMultipliers.rangedAccuracy
  return {
    touch: params.accuracyTouch * multiplier,
    short: params.accuracyShort * multiplier,
    medium: params.accuracyMedium * multiplier,
    long: params.accuracyLong * multiplier,
  }
}

// 缓存
let cachedDataSources: WeaponDataSource[] | null = null

/**
 * 动态扫描并加载所有可用的武器数据源
 * 根据当前 i18n 语言设置加载对应的 CSV 文件
 */
async function loadAllWeaponDataSources(): Promise<WeaponDataSource[]> {
  // 获取当前语言设置
  const localeRef = i18n.global.locale as unknown as Ref<string>
  const currentLocale = localeRef.value

  // 直接使用新API加载所有武器数据
  return await loadWeaponDataSources(currentLocale)
}

// 公共API
export async function getWeaponDataSources(): Promise<WeaponDataSource[]> {
  if (!cachedDataSources) {
    cachedDataSources = await loadAllWeaponDataSources()
  }
  return cachedDataSources
}

/**
 * 清除缓存的武器数据源
 * 用于语言切换时重新加载数据
 */
export function clearWeaponDataSourcesCache(): void {
  cachedDataSources = null
}
