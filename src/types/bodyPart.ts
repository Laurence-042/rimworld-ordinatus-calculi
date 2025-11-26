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
 * 身体部位中文名称映射
 */
export const BodyPartNames: Record<BodyPart, string> = {
  [BodyPart.Torso]: '躯干',
  [BodyPart.Neck]: '颈部',
  [BodyPart.Head]: '头',
  [BodyPart.Waist]: '腰',

  [BodyPart.LeftEye]: '左眼',
  [BodyPart.RightEye]: '右眼',
  [BodyPart.LeftEar]: '左耳',
  [BodyPart.RightEar]: '右耳',
  [BodyPart.Nose]: '鼻',
  [BodyPart.Jaw]: '下颌',

  [BodyPart.LeftShoulder]: '左肩',
  [BodyPart.RightShoulder]: '右肩',
  [BodyPart.LeftArm]: '左臂',
  [BodyPart.RightArm]: '右臂',

  [BodyPart.LeftLeg]: '左腿',
  [BodyPart.RightLeg]: '右腿',
} /**
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
      label: BodyPartNames[BodyPart.Torso],
      children: [
        {
          value: BodyPart.Neck,
          label: BodyPartNames[BodyPart.Neck],
          children: [
            {
              value: BodyPart.Head,
              label: BodyPartNames[BodyPart.Head],
              children: [
                {
                  value: BodyPart.LeftEye,
                  label: BodyPartNames[BodyPart.LeftEye],
                },
                {
                  value: BodyPart.RightEye,
                  label: BodyPartNames[BodyPart.RightEye],
                },
                {
                  value: BodyPart.LeftEar,
                  label: BodyPartNames[BodyPart.LeftEar],
                },
                {
                  value: BodyPart.RightEar,
                  label: BodyPartNames[BodyPart.RightEar],
                },
                {
                  value: BodyPart.Nose,
                  label: BodyPartNames[BodyPart.Nose],
                },
                {
                  value: BodyPart.Jaw,
                  label: BodyPartNames[BodyPart.Jaw],
                },
              ],
            },
          ],
        },
        {
          value: BodyPart.Waist,
          label: BodyPartNames[BodyPart.Waist],
        },
        {
          value: BodyPart.LeftShoulder,
          label: BodyPartNames[BodyPart.LeftShoulder],
          children: [
            {
              value: BodyPart.LeftArm,
              label: BodyPartNames[BodyPart.LeftArm],
            },
          ],
        },
        {
          value: BodyPart.RightShoulder,
          label: BodyPartNames[BodyPart.RightShoulder],
          children: [
            {
              value: BodyPart.RightArm,
              label: BodyPartNames[BodyPart.RightArm],
            },
          ],
        },
        {
          value: BodyPart.LeftLeg,
          label: BodyPartNames[BodyPart.LeftLeg],
        },
        {
          value: BodyPart.RightLeg,
          label: BodyPartNames[BodyPart.RightLeg],
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
