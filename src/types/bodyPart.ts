/**
 * RimWorld身体部位类型定义
 */

/**
 * 身体部位枚举（按层级组织）
 */
export enum BodyPart {
  // 头部 (Head)
  Head = 'Head',
  Skull = 'Skull',
  Brain = 'Brain',
  Eyes = 'Eyes',
  Ears = 'Ears',
  Nose = 'Nose',
  Tongue = 'Tongue',
  Jaw = 'Jaw',

  // 躯干 (Torso)
  Torso = 'Torso',
  Neck = 'Neck',
  Spine = 'Spine',
  Pelvis = 'Pelvis',
  Sternum = 'Sternum',
  Ribcage = 'Ribcage',
  Lung = 'Lung',
  Stomach = 'Stomach',
  Liver = 'Liver',
  Heart = 'Heart',
  Kidney = 'Kidney',

  // 肩部 (Shoulder)
  Shoulder = 'Shoulder',
  Clavicle = 'Clavicle',

  // 手臂 (Arm)
  Arm = 'Arm',
  Humerus = 'Humerus',
  Radius = 'Radius',
  Hand = 'Hand',
  Fingers = 'Fingers',

  // 腿部 (Leg)
  Leg = 'Leg',
  Femur = 'Femur',
  Tibia = 'Tibia',
  Foot = 'Foot',
  Toes = 'Toes',
}

/**
 * 身体部位中文名称映射
 */
export const BodyPartNames: Record<BodyPart, string> = {
  // 头部
  [BodyPart.Head]: '头部',
  [BodyPart.Skull]: '颅骨',
  [BodyPart.Brain]: '大脑',
  [BodyPart.Eyes]: '眼睛',
  [BodyPart.Ears]: '耳朵',
  [BodyPart.Nose]: '鼻子',
  [BodyPart.Tongue]: '舌头',
  [BodyPart.Jaw]: '下颚',

  // 躯干
  [BodyPart.Torso]: '躯干',
  [BodyPart.Neck]: '颈部',
  [BodyPart.Spine]: '脊柱',
  [BodyPart.Pelvis]: '骨盆',
  [BodyPart.Sternum]: '胸骨',
  [BodyPart.Ribcage]: '肋骨',
  [BodyPart.Lung]: '肺',
  [BodyPart.Stomach]: '胃',
  [BodyPart.Liver]: '肝脏',
  [BodyPart.Heart]: '心脏',
  [BodyPart.Kidney]: '肾脏',

  // 肩部
  [BodyPart.Shoulder]: '肩部',
  [BodyPart.Clavicle]: '锁骨',

  // 手臂
  [BodyPart.Arm]: '手臂',
  [BodyPart.Humerus]: '肱骨',
  [BodyPart.Radius]: '桡骨',
  [BodyPart.Hand]: '手',
  [BodyPart.Fingers]: '手指',

  // 腿部
  [BodyPart.Leg]: '腿',
  [BodyPart.Femur]: '股骨',
  [BodyPart.Tibia]: '胫骨',
  [BodyPart.Foot]: '脚',
  [BodyPart.Toes]: '脚趾',
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
  // 头部层级
  [BodyPart.Head]: null,
  [BodyPart.Skull]: BodyPart.Head,
  [BodyPart.Brain]: BodyPart.Skull,
  [BodyPart.Eyes]: BodyPart.Head,
  [BodyPart.Ears]: BodyPart.Head,
  [BodyPart.Nose]: BodyPart.Head,
  [BodyPart.Tongue]: BodyPart.Head,
  [BodyPart.Jaw]: BodyPart.Head,

  // 躯干层级
  [BodyPart.Torso]: null,
  [BodyPart.Neck]: BodyPart.Torso,
  [BodyPart.Spine]: BodyPart.Torso,
  [BodyPart.Pelvis]: BodyPart.Torso,
  [BodyPart.Sternum]: BodyPart.Torso,
  [BodyPart.Ribcage]: BodyPart.Torso,
  [BodyPart.Lung]: BodyPart.Torso,
  [BodyPart.Stomach]: BodyPart.Torso,
  [BodyPart.Liver]: BodyPart.Torso,
  [BodyPart.Heart]: BodyPart.Torso,
  [BodyPart.Kidney]: BodyPart.Torso,

  // 肩部层级
  [BodyPart.Shoulder]: null,
  [BodyPart.Clavicle]: BodyPart.Shoulder,

  // 手臂层级
  [BodyPart.Arm]: null,
  [BodyPart.Humerus]: BodyPart.Arm,
  [BodyPart.Radius]: BodyPart.Arm,
  [BodyPart.Hand]: BodyPart.Arm,
  [BodyPart.Fingers]: BodyPart.Hand,

  // 腿部层级
  [BodyPart.Leg]: null,
  [BodyPart.Femur]: BodyPart.Leg,
  [BodyPart.Tibia]: BodyPart.Leg,
  [BodyPart.Foot]: BodyPart.Leg,
  [BodyPart.Toes]: BodyPart.Foot,
}

/**
 * 构建身体部位树形数据（用于UI组件）
 */
export function buildBodyPartTree(): BodyPartTreeNode[] {
  return [
    {
      value: BodyPart.Head,
      label: BodyPartNames[BodyPart.Head],
      children: [
        {
          value: BodyPart.Skull,
          label: BodyPartNames[BodyPart.Skull],
          children: [
            {
              value: BodyPart.Brain,
              label: BodyPartNames[BodyPart.Brain],
            },
          ],
        },
        {
          value: BodyPart.Eyes,
          label: BodyPartNames[BodyPart.Eyes],
        },
        {
          value: BodyPart.Ears,
          label: BodyPartNames[BodyPart.Ears],
        },
        {
          value: BodyPart.Nose,
          label: BodyPartNames[BodyPart.Nose],
        },
        {
          value: BodyPart.Tongue,
          label: BodyPartNames[BodyPart.Tongue],
        },
        {
          value: BodyPart.Jaw,
          label: BodyPartNames[BodyPart.Jaw],
        },
      ],
    },
    {
      value: BodyPart.Torso,
      label: BodyPartNames[BodyPart.Torso],
      children: [
        {
          value: BodyPart.Neck,
          label: BodyPartNames[BodyPart.Neck],
        },
        {
          value: BodyPart.Spine,
          label: BodyPartNames[BodyPart.Spine],
        },
        {
          value: BodyPart.Pelvis,
          label: BodyPartNames[BodyPart.Pelvis],
        },
        {
          value: BodyPart.Sternum,
          label: BodyPartNames[BodyPart.Sternum],
        },
        {
          value: BodyPart.Ribcage,
          label: BodyPartNames[BodyPart.Ribcage],
        },
        {
          value: BodyPart.Lung,
          label: BodyPartNames[BodyPart.Lung],
        },
        {
          value: BodyPart.Stomach,
          label: BodyPartNames[BodyPart.Stomach],
        },
        {
          value: BodyPart.Liver,
          label: BodyPartNames[BodyPart.Liver],
        },
        {
          value: BodyPart.Heart,
          label: BodyPartNames[BodyPart.Heart],
        },
        {
          value: BodyPart.Kidney,
          label: BodyPartNames[BodyPart.Kidney],
        },
      ],
    },
    {
      value: BodyPart.Shoulder,
      label: BodyPartNames[BodyPart.Shoulder],
      children: [
        {
          value: BodyPart.Clavicle,
          label: BodyPartNames[BodyPart.Clavicle],
        },
      ],
    },
    {
      value: BodyPart.Arm,
      label: BodyPartNames[BodyPart.Arm],
      children: [
        {
          value: BodyPart.Humerus,
          label: BodyPartNames[BodyPart.Humerus],
        },
        {
          value: BodyPart.Radius,
          label: BodyPartNames[BodyPart.Radius],
        },
        {
          value: BodyPart.Hand,
          label: BodyPartNames[BodyPart.Hand],
          children: [
            {
              value: BodyPart.Fingers,
              label: BodyPartNames[BodyPart.Fingers],
            },
          ],
        },
      ],
    },
    {
      value: BodyPart.Leg,
      label: BodyPartNames[BodyPart.Leg],
      children: [
        {
          value: BodyPart.Femur,
          label: BodyPartNames[BodyPart.Femur],
        },
        {
          value: BodyPart.Tibia,
          label: BodyPartNames[BodyPart.Tibia],
        },
        {
          value: BodyPart.Foot,
          label: BodyPartNames[BodyPart.Foot],
          children: [
            {
              value: BodyPart.Toes,
              label: BodyPartNames[BodyPart.Toes],
            },
          ],
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
