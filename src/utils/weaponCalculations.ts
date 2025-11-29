import { getWeaponDataSources as loadWeaponDataSources } from './weaponDataParser'
import type { ResolvedWeapon, Weapon, WeaponDataSource } from '@/types/weapon'
import { WeaponQualityMultipliers } from '@/types/quality'
import i18n from '@/i18n'
import type { Ref } from 'vue'

/**
 * 解析武器参数，生成包含所有真实值的对象
 *
 * 将武器的基础参数转换为应用品质加成后的真实值，方便后续计算使用。
 * 所有数值都已经是可直接用于计算的形式（精度和穿甲转为0-1/0-2范围）。
 *
 * **RimWorld 品质加成：**
 * - 伤害：普通=1.0x, 大师=1.25x, 传说=1.5x
 * - 精度：普通=1.0x, 大师=1.35x, 传说=1.5x
 * - 穿甲：普通=1.0x, 大师=1.25x, 传说=1.5x
 *
 * **DPS 计算公式：**
 * ```
 * DPS = (连发数量 × 实际伤害 × 60) / 攻击周期时长(ticks)
 * 攻击周期 = 预热时间 + (连发数-1)×连发间隔 + 冷却时间
 * ```
 *
 * @param weapon - 原始武器对象
 * @returns 解析后的武器对象，包含所有真实值
 */
export function resolveWeapon(weapon: Weapon): ResolvedWeapon {
  const qualityMultipliers = WeaponQualityMultipliers[weapon.quality]

  // 精度值：基础值 * 品质系数，clamp到0-1
  const clamp01 = (v: number) => Math.max(0, Math.min(1, v))
  const accuracyMultiplier = qualityMultipliers.rangedAccuracy

  // 穿甲值：基础值 * 品质系数，clamp到0-2
  const apMultiplier = qualityMultipliers.rangedArmorPenetration
  const armorPenetration = Math.max(0, Math.min(2, (weapon.armorPenetration / 100) * apMultiplier))

  // 伤害值：基础值 * 品质系数
  const damageMultiplier = qualityMultipliers.rangedDamage
  const damage = weapon.damage * damageMultiplier

  // 计算最大DPS（使用已计算的实际伤害）
  const warmUpTicks = weapon.warmUp * 60
  const cooldownTicks = weapon.cooldown * 60
  const burstDuration = (Math.max(1, weapon.burstCount) - 1) * weapon.burstTicks
  const cycleDuration = warmUpTicks + burstDuration + cooldownTicks
  const totalDamage = Math.max(1, weapon.burstCount) * damage
  const maxDPS = cycleDuration > 0 ? (totalDamage * 60) / cycleDuration : 0

  return {
    original: weapon,
    damage,
    armorPenetration,
    accuracyTouch: clamp01((weapon.accuracyTouch / 100) * accuracyMultiplier),
    accuracyShort: clamp01((weapon.accuracyShort / 100) * accuracyMultiplier),
    accuracyMedium: clamp01((weapon.accuracyMedium / 100) * accuracyMultiplier),
    accuracyLong: clamp01((weapon.accuracyLong / 100) * accuracyMultiplier),
    maxDPS,
  }
}

/**
 * 根据距离计算解析后武器的命中率
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
 * hitChance = accuracy1 + (accuracy2 - accuracy1) × (distance - range1) / (range2 - range1)
 * ```
 *
 * @param resolved - 解析后的武器（已应用品质加成）
 * @param targetDistance - 目标距离（格）
 * @returns 命中率 (0-1)
 */
export function getResolvedHitChance(resolved: ResolvedWeapon, targetDistance: number): number {
  // 超出射程返回最小值
  if (targetDistance > resolved.original.range) return 0.01

  // 负距离视为 0
  if (targetDistance < 0) targetDistance = 0

  let value: number

  if (targetDistance <= 3) {
    value = resolved.accuracyTouch
  } else if (targetDistance <= 12) {
    value =
      resolved.accuracyTouch +
      (resolved.accuracyShort - resolved.accuracyTouch) * ((targetDistance - 3) / 9)
  } else if (targetDistance <= 25) {
    value =
      resolved.accuracyShort +
      (resolved.accuracyMedium - resolved.accuracyShort) * ((targetDistance - 12) / 13)
  } else if (targetDistance <= 40) {
    value =
      resolved.accuracyMedium +
      (resolved.accuracyLong - resolved.accuracyMedium) * ((targetDistance - 25) / 15)
  } else {
    value = resolved.accuracyLong
  }

  return Math.max(0.01, Math.min(1.0, value))
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
