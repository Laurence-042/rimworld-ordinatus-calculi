/**
 * 投射物解析模块
 * 处理RimWorld的投射物（Projectile）定义
 */

import { BaseParserUtils } from './baseParser'

/**
 * 投射物节点
 */
export interface ProjectileNode {
  defName: string
  damageAmountBase?: number
  armorPenetrationBase?: number
  stoppingPower?: number

  rawData?: unknown
}

/**
 * 投射物解析器
 */
export class ProjectileParser {
  /**
   * 判断是否为投射物定义
   */
  static isProjectile(xmlNode: Record<string, unknown>): boolean {
    return (
      xmlNode.projectile !== undefined ||
      xmlNode.thingClass === 'Bullet' ||
      xmlNode.category === 'Projectile'
    )
  }

  /**
   * 解析投射物节点
   */
  static parseProjectile(xmlNode: Record<string, unknown>): ProjectileNode | null {
    const defName = BaseParserUtils.getStringValue(xmlNode, 'defName')
    if (!defName) {
      return null
    }

    const projectile: ProjectileNode = {
      defName,
      rawData: xmlNode,
    }

    if (BaseParserUtils.isRecord(xmlNode.projectile)) {
      const proj = xmlNode.projectile as Record<string, unknown>
      projectile.damageAmountBase = BaseParserUtils.parseFloat(
        proj.damageAmountBase || proj.DamageAmountBase,
      )
      projectile.armorPenetrationBase = BaseParserUtils.parseFloat(
        proj.armorPenetrationBase || proj.ArmorPenetrationBase,
      )
      projectile.stoppingPower = BaseParserUtils.parseFloat(
        proj.stoppingPower || proj.StoppingPower,
      )
    }

    return projectile
  }
}
