/**
 * RimWorld身体部位类型定义
 */

import i18n from '@/i18n'

const { global } = i18n

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
 * 获取身体部位名称（支持i18n）
 */
export function getBodyPartName(part: BodyPart): string {
  const key = `bodyPart.${part.toLowerCase()}` as const
  return global.t(key)
}

/**
 * 身体部位名称映射（保留用于向后兼容，但使用i18n）
 */
export const BodyPartNames: Record<BodyPart, string> = new Proxy({} as Record<BodyPart, string>, {
  get(_target, prop: string | symbol) {
    if (typeof prop === 'string' && prop in BodyPart) {
      return getBodyPartName(prop as BodyPart)
    }
    return undefined
  },
})

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
} /**
 * 构建身体部位树形数据（用于UI组件）
 */
export function buildBodyPartTree(): BodyPartTreeNode[] {
  return [
    {
      value: BodyPart.Torso,
      label: getBodyPartName(BodyPart.Torso),
      children: [
        {
          value: BodyPart.Neck,
          label: getBodyPartName(BodyPart.Neck),
          children: [
            {
              value: BodyPart.Head,
              label: getBodyPartName(BodyPart.Head),
              children: [
                {
                  value: BodyPart.LeftEye,
                  label: getBodyPartName(BodyPart.LeftEye),
                },
                {
                  value: BodyPart.RightEye,
                  label: getBodyPartName(BodyPart.RightEye),
                },
                {
                  value: BodyPart.LeftEar,
                  label: getBodyPartName(BodyPart.LeftEar),
                },
                {
                  value: BodyPart.RightEar,
                  label: getBodyPartName(BodyPart.RightEar),
                },
                {
                  value: BodyPart.Nose,
                  label: getBodyPartName(BodyPart.Nose),
                },
                {
                  value: BodyPart.Jaw,
                  label: getBodyPartName(BodyPart.Jaw),
                },
              ],
            },
          ],
        },
        {
          value: BodyPart.Waist,
          label: getBodyPartName(BodyPart.Waist),
        },
        {
          value: BodyPart.LeftShoulder,
          label: getBodyPartName(BodyPart.LeftShoulder),
          children: [
            {
              value: BodyPart.LeftArm,
              label: getBodyPartName(BodyPart.LeftArm),
            },
          ],
        },
        {
          value: BodyPart.RightShoulder,
          label: getBodyPartName(BodyPart.RightShoulder),
          children: [
            {
              value: BodyPart.RightArm,
              label: getBodyPartName(BodyPart.RightArm),
            },
          ],
        },
        {
          value: BodyPart.LeftLeg,
          label: getBodyPartName(BodyPart.LeftLeg),
        },
        {
          value: BodyPart.RightLeg,
          label: getBodyPartName(BodyPart.RightLeg),
        },
      ],
    },
  ]
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
