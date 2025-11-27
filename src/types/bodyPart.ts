/**
 * RimWorld身体部位类型定义
 */

/**
 * 身体部位枚举
 * 仅包含16个常用部位，避免不必要的复杂度
 */
export enum BodyPart {
  Torso = 'Torso', // 躯干
  Neck = 'Neck', // 颈部
  Head = 'Head', // 头
  Waist = 'Waist', // 腰

  LeftEye = 'LeftEye', // 左眼
  RightEye = 'RightEye', // 右眼
  LeftEar = 'LeftEar', // 左耳
  RightEar = 'RightEar', // 右耳
  Nose = 'Nose', // 鼻
  Jaw = 'Jaw', // 下颌

  LeftShoulder = 'LeftShoulder', // 左肩
  RightShoulder = 'RightShoulder', // 右肩
  LeftArm = 'LeftArm', // 左臂
  RightArm = 'RightArm', // 右臂

  LeftLeg = 'LeftLeg', // 左腿
  RightLeg = 'RightLeg', // 右腿
}

/**
 * 身体部位树节点接口（用于el-tree和el-tree-select）
 */
export interface BodyPartTreeNode {
  /** 节点ID（使用BodyPart枚举值） */
  value: BodyPart
  /** 节点显示标签 */
  label: string
  /** 子节点 */
  children?: BodyPartTreeNode[]
}

/**
 * 身体部位层级关系（父子关系映射）
 */
export const BodyPartHierarchy: Record<BodyPart, BodyPart | null> = {
  // 核心部位
  [BodyPart.Torso]: null,
  [BodyPart.Neck]: BodyPart.Torso,
  [BodyPart.Head]: BodyPart.Neck,
  [BodyPart.Waist]: BodyPart.Torso,

  // 头部子部位
  [BodyPart.LeftEye]: BodyPart.Head,
  [BodyPart.RightEye]: BodyPart.Head,
  [BodyPart.LeftEar]: BodyPart.Head,
  [BodyPart.RightEar]: BodyPart.Head,
  [BodyPart.Nose]: BodyPart.Head,
  [BodyPart.Jaw]: BodyPart.Head,

  // 上肢
  [BodyPart.LeftShoulder]: BodyPart.Torso,
  [BodyPart.RightShoulder]: BodyPart.Torso,
  [BodyPart.LeftArm]: BodyPart.LeftShoulder,
  [BodyPart.RightArm]: BodyPart.RightShoulder,

  // 下肢
  [BodyPart.LeftLeg]: BodyPart.Torso,
  [BodyPart.RightLeg]: BodyPart.Torso,
}

/**
 * 获取身体部位的所有祖先部位（从根到父节点）
 */
export function getBodyPartAncestors(part: BodyPart): BodyPart[] {
  const ancestors: BodyPart[] = []
  let current: BodyPart | null = BodyPartHierarchy[part]

  while (current !== null) {
    ancestors.unshift(current)
    current = BodyPartHierarchy[current]
  }

  return ancestors
}

/**
 * 获取身体部位的所有子孙部位
 */
export function getBodyPartDescendants(part: BodyPart): BodyPart[] {
  const descendants: BodyPart[] = []

  for (const [childPart, parentPart] of Object.entries(BodyPartHierarchy)) {
    if (parentPart === part) {
      const child = childPart as BodyPart
      descendants.push(child)
      descendants.push(...getBodyPartDescendants(child))
    }
  }

  return descendants
}
