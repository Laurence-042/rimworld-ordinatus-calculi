/**
 * 武器解析模块
 * 处理武器ThingDef的解析和CSV生成
 */

import * as fs from 'fs'
import * as path from 'path'
import { BaseThingDefNode, BaseParserUtils } from './baseParser'
import { ProjectileNode, DamageDefNode } from './projectileParser'

/**
 * CSV 武器数据接口（对应 weapon_info.csv 的列）
 * 注意：精度和穿甲数据在 CSV 中为小数格式（0-1），解析时会转换为百分比（0-100）
 */
export interface WeaponCSVData extends Record<string, string> {
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
 * 武器ThingDef节点
 */
export interface WeaponThingDefNode extends BaseThingDefNode {
  category: 'Weapon'

  // 武器属性
  accuracyTouch?: number
  accuracyShort?: number
  accuracyMedium?: number
  accuracyLong?: number
  cooldown?: number
  warmupTime?: number
  range?: number
  burstShotCount?: number
  ticksBetweenBurstShots?: number

  // 子弹引用
  defaultProjectile?: string
}

/**
 * 类型守卫：判断是否为武器节点
 */
export function isWeaponNode(node: BaseThingDefNode): node is WeaponThingDefNode {
  return node.category === 'Weapon'
}

/**
 * 武器解析器
 */
export class WeaponParser {
  /**
   * 从XML节点解析武器特有属性
   */
  static parseWeaponProperties(
    xmlNode: Record<string, unknown>,
  ): Partial<WeaponThingDefNode> | null {
    const props: Partial<WeaponThingDefNode> = {
      category: 'Weapon',
    }

    // 解析统计数据
    if (BaseParserUtils.isRecord(xmlNode.statBases)) {
      const stats = xmlNode.statBases as Record<string, unknown>
      props.accuracyTouch = BaseParserUtils.parseFloat(stats.AccuracyTouch)
      props.accuracyShort = BaseParserUtils.parseFloat(stats.AccuracyShort)
      props.accuracyMedium = BaseParserUtils.parseFloat(stats.AccuracyMedium)
      props.accuracyLong = BaseParserUtils.parseFloat(stats.AccuracyLong)
      props.cooldown = BaseParserUtils.parseFloat(stats.RangedWeapon_Cooldown)
    }

    // 解析verbs（射击属性）
    if (BaseParserUtils.isRecord(xmlNode.verbs) && xmlNode.verbs.li) {
      const verb = Array.isArray(xmlNode.verbs.li) ? xmlNode.verbs.li[0] : xmlNode.verbs.li
      if (BaseParserUtils.isRecord(verb)) {
        props.warmupTime = BaseParserUtils.parseFloat(verb.warmupTime)
        props.range = BaseParserUtils.parseFloat(verb.range)
        props.burstShotCount = BaseParserUtils.parseInt(verb.burstShotCount)
        props.ticksBetweenBurstShots = BaseParserUtils.parseInt(verb.ticksBetweenBurstShots)
        props.defaultProjectile = BaseParserUtils.getStringValue(verb, 'defaultProjectile')
      }
    }

    // 判断是否为有效武器
    const hasWeaponIndicators =
      xmlNode.weaponClasses ||
      xmlNode.weaponTags ||
      props.defaultProjectile ||
      props.range !== undefined

    return hasWeaponIndicators ? props : null
  }

  /**
   * 从父节点继承武器属性
   */
  static inheritWeaponProperties(child: WeaponThingDefNode, parent: WeaponThingDefNode): void {
    const weaponProps: (keyof WeaponThingDefNode)[] = [
      'accuracyTouch',
      'accuracyShort',
      'accuracyMedium',
      'accuracyLong',
      'cooldown',
      'warmupTime',
      'range',
      'burstShotCount',
      'ticksBetweenBurstShots',
      'defaultProjectile',
    ]

    for (const prop of weaponProps) {
      if (child[prop] === undefined && parent[prop] !== undefined) {
        ;(child as unknown as Record<string, unknown>)[prop] = parent[prop]
      }
    }
  }

  /**
   * 筛选有效的武器节点
   */
  static filterValidWeapons(weapons: WeaponThingDefNode[]): WeaponThingDefNode[] {
    return weapons.filter((weapon) => {
      // 跳过抽象定义
      if (weapon.abstract) return false

      // 必须有射程和子弹（远程武器）
      if (!weapon.range || !weapon.defaultProjectile) return false

      return true
    })
  }

  /**
   * 创建武器CSV行数据
   *
   * 伤害值计算逻辑（RimWorld 原版机制）：
   * 1. 如果子弹定义中有 damageAmountBase，直接使用
   * 2. 如果没有，则查找对应 DamageDef 的 defaultDamage
   *
   * 穿甲值计算逻辑（RimWorld 原版机制）：
   * 1. 如果子弹定义中有 armorPenetrationBase，直接使用
   * 2. 如果没有，则查找对应 DamageDef 的 defaultArmorPenetration
   * 3. 如果 DamageDef 的 defaultArmorPenetration 为 -1 或未定义，
   *    则使用 damage * 0.015 作为默认穿甲值
   */
  static createWeaponRow(
    weapon: WeaponThingDefNode,
    projectileMap: Map<string, ProjectileNode>,
    damageDefMap: Map<string, DamageDefNode>,
    translations: Map<string, string> | null,
  ): WeaponCSVData {
    // 获取子弹数据
    let damage = ''
    let armorPenetration = ''
    let stoppingPower = ''

    if (weapon.defaultProjectile) {
      const projectile = projectileMap.get(weapon.defaultProjectile)
      if (projectile) {
        // 获取伤害类型定义
        const damageDef = projectile.damageDef ? damageDefMap.get(projectile.damageDef) : undefined

        // 伤害值计算：优先使用子弹定义，其次使用 DamageDef 默认值
        let damageAmount = projectile.damageAmountBase
        if (damageAmount === undefined && damageDef?.defaultDamage !== undefined) {
          damageAmount = damageDef.defaultDamage
        }
        damage = BaseParserUtils.formatNumber(damageAmount)

        // 穿甲值计算：
        // 1. 优先使用子弹定义的 armorPenetrationBase
        // 2. 其次使用 DamageDef 的 defaultArmorPenetration（如果 > 0）
        // 3. 最后使用 damage * 0.015 作为默认值
        if (projectile.armorPenetrationBase !== undefined) {
          armorPenetration = BaseParserUtils.formatNumber(projectile.armorPenetrationBase)
        } else if (
          damageDef?.defaultArmorPenetration !== undefined &&
          damageDef.defaultArmorPenetration > 0
        ) {
          armorPenetration = BaseParserUtils.formatNumber(damageDef.defaultArmorPenetration)
        } else if (damageAmount !== undefined) {
          // RimWorld 默认穿甲计算公式：damage * 0.015
          const calculatedAP = damageAmount * 0.015
          armorPenetration = BaseParserUtils.formatNumber(calculatedAP)
        }

        stoppingPower = BaseParserUtils.formatNumber(projectile.stoppingPower)
      }
    }

    // 获取翻译后的label（如果有翻译数据）
    let label = weapon.label || weapon.defName || weapon.identifier || ''
    const keyForTranslation = weapon.defName || weapon.identifier
    if (translations && keyForTranslation) {
      const translationKey = `${keyForTranslation}.label`
      const translatedLabel = translations.get(translationKey)
      if (translatedLabel) {
        label = translatedLabel
      }
    }

    const row: WeaponCSVData = {
      defName: weapon.defName || '',
      label: label,
      damage: damage,
      armorPenetration: armorPenetration,
      stoppingPower: stoppingPower,
      warmupTime: BaseParserUtils.formatNumber(weapon.warmupTime),
      cooldown: BaseParserUtils.formatNumber(weapon.cooldown),
      range: BaseParserUtils.formatNumber(weapon.range),
      burstShotCount: BaseParserUtils.formatNumber(weapon.burstShotCount),
      ticksBetweenBurstShots: BaseParserUtils.formatNumber(weapon.ticksBetweenBurstShots),
      accuracyTouch: BaseParserUtils.formatNumber(weapon.accuracyTouch),
      accuracyShort: BaseParserUtils.formatNumber(weapon.accuracyShort),
      accuracyMedium: BaseParserUtils.formatNumber(weapon.accuracyMedium),
      accuracyLong: BaseParserUtils.formatNumber(weapon.accuracyLong),
      marketValue: BaseParserUtils.formatNumber(weapon.marketValue),
    }

    return row
  }

  /**
   * 写入武器CSV文件
   */
  static writeWeaponCSV(data: WeaponCSVData[], outputDir: string, languageCode: string): void {
    // 确保输出目录存在
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true })
    }

    const outputPath = path.join(outputDir, `${languageCode}.csv`)

    // CSV头部
    const headers = [
      'defName',
      'label',
      'damage',
      'armorPenetration',
      'stoppingPower',
      'warmupTime',
      'cooldown',
      'range',
      'burstShotCount',
      'ticksBetweenBurstShots',
      'accuracyTouch',
      'accuracyShort',
      'accuracyMedium',
      'accuracyLong',
      'marketValue',
    ]

    BaseParserUtils.writeCSVFile(outputPath, headers, data, fs)

    console.log(`武器CSV文件已生成: ${outputPath}`)
  }
}
