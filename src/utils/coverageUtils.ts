/**
 * 服装覆盖范围工具函数
 */

import { ApparelLayer, getApparelLayerName } from '@/types/armor'
import { BodyPart, BodyPartNames, buildBodyPartTree, type BodyPartTreeNode } from '@/types/bodyPart'

/**
 * 覆盖信息接口（用于可视化树）
 */
export interface CoverageInfo {
  bodyPart: BodyPart
  layers: ApparelLayer[]
}

/**
 * 覆盖树节点（扩展BodyPartTreeNode，添加层级信息）
 */
export interface CoverageTreeNode extends BodyPartTreeNode {
  /** 该部位被覆盖的层级 */
  coveredLayers?: ApparelLayer[]
  /** 子节点 */
  children?: CoverageTreeNode[]
}

/**
 * 从护甲配置构建覆盖信息映射
 * @param armorLayers 护甲层数组
 * @returns 身体部位 -> 覆盖层级的映射
 */
export function buildCoverageMap(
  armorLayers: Array<{
    bodyPartCoverage: string[]
    apparelLayers: ApparelLayer[]
  }>,
): Map<BodyPart, Set<ApparelLayer>> {
  const coverageMap = new Map<BodyPart, Set<ApparelLayer>>()

  for (const armor of armorLayers) {
    for (const bodyPartStr of armor.bodyPartCoverage) {
      const bodyPart = bodyPartStr as BodyPart
      if (!coverageMap.has(bodyPart)) {
        coverageMap.set(bodyPart, new Set())
      }

      const layerSet = coverageMap.get(bodyPart)!
      for (const layer of armor.apparelLayers) {
        layerSet.add(layer)
      }
    }
  }

  return coverageMap
}

/**
 * 构建带覆盖信息的身体部位树（用于可视化）
 * @param coverageMap 覆盖信息映射
 * @returns 带覆盖层级信息的树节点数组
 */
export function buildCoverageTree(
  coverageMap: Map<BodyPart, Set<ApparelLayer>>,
): CoverageTreeNode[] {
  const baseTree = buildBodyPartTree()

  function addCoverageInfo(node: BodyPartTreeNode): CoverageTreeNode {
    const coveredLayers = coverageMap.get(node.value)
    const coverageNode: CoverageTreeNode = {
      ...node,
      coveredLayers: coveredLayers ? Array.from(coveredLayers).sort() : undefined,
    }

    if (node.children) {
      coverageNode.children = node.children.map(addCoverageInfo)
    }

    return coverageNode
  }

  return baseTree.map(addCoverageInfo)
}

/**
 * 检查覆盖冲突（同一部位+同一层级不能被多个装备覆盖）
 * @param existingArmor 已存在的护甲层
 * @param newBodyParts 新护甲要覆盖的部位
 * @param newLayers 新护甲的层级
 * @returns 冲突的部位和层级列表
 */
export function checkCoverageConflict(
  existingArmor: Array<{
    bodyPartCoverage: string[]
    apparelLayers: ApparelLayer[]
  }>,
  newBodyParts: string[],
  newLayers: ApparelLayer[],
): Array<{ bodyPart: BodyPart; layer: ApparelLayer }> {
  const conflicts: Array<{ bodyPart: BodyPart; layer: ApparelLayer }> = []
  const coverageMap = buildCoverageMap(existingArmor)

  for (const bodyPartStr of newBodyParts) {
    const bodyPart = bodyPartStr as BodyPart
    const existingLayers = coverageMap.get(bodyPart)

    if (existingLayers) {
      for (const newLayer of newLayers) {
        if (existingLayers.has(newLayer)) {
          conflicts.push({ bodyPart, layer: newLayer })
        }
      }
    }
  }

  return conflicts
}

/**
 * 格式化冲突信息为用户可读的字符串
 */
export function formatConflicts(
  conflicts: Array<{ bodyPart: BodyPart; layer: ApparelLayer }>,
): string {
  if (conflicts.length === 0) return ''

  const messages = conflicts.map(
    ({ bodyPart, layer }) => `${BodyPartNames[bodyPart]}的${getApparelLayerName(layer)}层`,
  )

  return `以下部位已被覆盖：${messages.join('、')}`
}

/**
 * 获取所有可用的服装层级选项（用于checkbox-button）
 */
export function getApparelLayerOptions(): Array<{ label: string; value: ApparelLayer }> {
  return [
    { label: '皮肤', value: ApparelLayer.Skin },
    { label: '贴身', value: ApparelLayer.OnSkin },
    { label: '夹层', value: ApparelLayer.Middle },
    { label: '外套', value: ApparelLayer.Shell },
    { label: '配件', value: ApparelLayer.Belt },
    { label: '头饰', value: ApparelLayer.Overhead },
    { label: '眼饰', value: ApparelLayer.EyeCover },
  ]
}
