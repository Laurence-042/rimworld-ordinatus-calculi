/**
 * RimWorld身体部位类型定义
 */

/**
 * 身体部位枚举
 * 基于 RimWorld 官方英文定义，使用常见中文名作为标准
 */
export enum BodyPart {
  // 核心部位
  Torso = 'Torso', // 躯干
  Neck = 'Neck', // 颈部
  Head = 'Head', // 头
  Waist = 'Waist', // 腰

  // 头部子部位
  Skull = 'Skull', // 颅骨
  Brain = 'Brain', // 大脑
  LeftEye = 'LeftEye', // 左眼
  RightEye = 'RightEye', // 右眼
  LeftEar = 'LeftEar', // 左耳
  RightEar = 'RightEar', // 右耳
  Nose = 'Nose', // 鼻
  Jaw = 'Jaw', // 下颌
  Tongue = 'Tongue', // 舌

  // 躯干内部器官
  Spine = 'Spine', // 脊椎
  Ribcage = 'Ribcage', // 肋骨
  Sternum = 'Sternum', // 胸骨
  Pelvis = 'Pelvis', // 骨盆
  Heart = 'Heart', // 心脏
  LeftLung = 'LeftLung', // 左肺
  RightLung = 'RightLung', // 右肺
  Liver = 'Liver', // 肝
  Stomach = 'Stomach', // 胃
  LeftKidney = 'LeftKidney', // 左肾
  RightKidney = 'RightKidney', // 右肾

  // 上肢
  LeftShoulder = 'LeftShoulder', // 左肩
  RightShoulder = 'RightShoulder', // 右肩
  LeftClavicle = 'LeftClavicle', // 左锁骨
  RightClavicle = 'RightClavicle', // 右锁骨
  LeftArm = 'LeftArm', // 左臂
  RightArm = 'RightArm', // 右臂
  LeftHumerus = 'LeftHumerus', // 左肱骨
  RightHumerus = 'RightHumerus', // 右肱骨
  LeftRadius = 'LeftRadius', // 左桡骨
  RightRadius = 'RightRadius', // 右桡骨
  LeftHand = 'LeftHand', // 左手
  RightHand = 'RightHand', // 右手

  // 手指（简化为左右手指）
  LeftFingers = 'LeftFingers', // 左手指
  RightFingers = 'RightFingers', // 右手指

  // 下肢
  LeftLeg = 'LeftLeg', // 左腿
  RightLeg = 'RightLeg', // 右腿
  LeftFemur = 'LeftFemur', // 左股骨
  RightFemur = 'RightFemur', // 右股骨
  LeftTibia = 'LeftTibia', // 左胫骨
  RightTibia = 'RightTibia', // 右胫骨
  LeftFoot = 'LeftFoot', // 左脚
  RightFoot = 'RightFoot', // 右脚

  // 脚趾（简化为左右脚趾）
  LeftToes = 'LeftToes', // 左脚趾
  RightToes = 'RightToes', // 右脚趾
}

/**
 * 身体部位中文名称映射（标准名称）
 */
export const BodyPartNames: Record<BodyPart, string> = {
  // 核心部位
  [BodyPart.Torso]: '躯干',
  [BodyPart.Neck]: '颈部',
  [BodyPart.Head]: '头',
  [BodyPart.Waist]: '腰',

  // 头部子部位
  [BodyPart.Skull]: '颅骨',
  [BodyPart.Brain]: '大脑',
  [BodyPart.LeftEye]: '左眼',
  [BodyPart.RightEye]: '右眼',
  [BodyPart.LeftEar]: '左耳',
  [BodyPart.RightEar]: '右耳',
  [BodyPart.Nose]: '鼻',
  [BodyPart.Jaw]: '下颌',
  [BodyPart.Tongue]: '舌',

  // 躯干内部器官
  [BodyPart.Spine]: '脊椎',
  [BodyPart.Ribcage]: '肋骨',
  [BodyPart.Sternum]: '胸骨',
  [BodyPart.Pelvis]: '骨盆',
  [BodyPart.Heart]: '心脏',
  [BodyPart.LeftLung]: '左肺',
  [BodyPart.RightLung]: '右肺',
  [BodyPart.Liver]: '肝',
  [BodyPart.Stomach]: '胃',
  [BodyPart.LeftKidney]: '左肾',
  [BodyPart.RightKidney]: '右肾',

  // 上肢
  [BodyPart.LeftShoulder]: '左肩',
  [BodyPart.RightShoulder]: '右肩',
  [BodyPart.LeftClavicle]: '左锁骨',
  [BodyPart.RightClavicle]: '右锁骨',
  [BodyPart.LeftArm]: '左臂',
  [BodyPart.RightArm]: '右臂',
  [BodyPart.LeftHumerus]: '左肱骨',
  [BodyPart.RightHumerus]: '右肱骨',
  [BodyPart.LeftRadius]: '左桡骨',
  [BodyPart.RightRadius]: '右桡骨',
  [BodyPart.LeftHand]: '左手',
  [BodyPart.RightHand]: '右手',
  [BodyPart.LeftFingers]: '左手指',
  [BodyPart.RightFingers]: '右手指',

  // 下肢
  [BodyPart.LeftLeg]: '左腿',
  [BodyPart.RightLeg]: '右腿',
  [BodyPart.LeftFemur]: '左股骨',
  [BodyPart.RightFemur]: '右股骨',
  [BodyPart.LeftTibia]: '左胫骨',
  [BodyPart.RightTibia]: '右胫骨',
  [BodyPart.LeftFoot]: '左脚',
  [BodyPart.RightFoot]: '右脚',
  [BodyPart.LeftToes]: '左脚趾',
  [BodyPart.RightToes]: '右脚趾',
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
  [BodyPart.Skull]: BodyPart.Head,
  [BodyPart.Brain]: BodyPart.Skull,
  [BodyPart.LeftEye]: BodyPart.Head,
  [BodyPart.RightEye]: BodyPart.Head,
  [BodyPart.LeftEar]: BodyPart.Head,
  [BodyPart.RightEar]: BodyPart.Head,
  [BodyPart.Nose]: BodyPart.Head,
  [BodyPart.Jaw]: BodyPart.Head,
  [BodyPart.Tongue]: BodyPart.Jaw,

  // 躯干内部器官
  [BodyPart.Spine]: BodyPart.Torso,
  [BodyPart.Ribcage]: BodyPart.Torso,
  [BodyPart.Sternum]: BodyPart.Torso,
  [BodyPart.Pelvis]: BodyPart.Torso,
  [BodyPart.Heart]: BodyPart.Torso,
  [BodyPart.LeftLung]: BodyPart.Torso,
  [BodyPart.RightLung]: BodyPart.Torso,
  [BodyPart.Liver]: BodyPart.Torso,
  [BodyPart.Stomach]: BodyPart.Torso,
  [BodyPart.LeftKidney]: BodyPart.Torso,
  [BodyPart.RightKidney]: BodyPart.Torso,

  // 上肢
  [BodyPart.LeftShoulder]: BodyPart.Torso,
  [BodyPart.RightShoulder]: BodyPart.Torso,
  [BodyPart.LeftClavicle]: BodyPart.LeftShoulder,
  [BodyPart.RightClavicle]: BodyPart.RightShoulder,
  [BodyPart.LeftArm]: BodyPart.LeftShoulder,
  [BodyPart.RightArm]: BodyPart.RightShoulder,
  [BodyPart.LeftHumerus]: BodyPart.LeftArm,
  [BodyPart.RightHumerus]: BodyPart.RightArm,
  [BodyPart.LeftRadius]: BodyPart.LeftArm,
  [BodyPart.RightRadius]: BodyPart.RightArm,
  [BodyPart.LeftHand]: BodyPart.LeftArm,
  [BodyPart.RightHand]: BodyPart.RightArm,
  [BodyPart.LeftFingers]: BodyPart.LeftHand,
  [BodyPart.RightFingers]: BodyPart.RightHand,

  // 下肢
  [BodyPart.LeftLeg]: BodyPart.Torso,
  [BodyPart.RightLeg]: BodyPart.Torso,
  [BodyPart.LeftFemur]: BodyPart.LeftLeg,
  [BodyPart.RightFemur]: BodyPart.RightLeg,
  [BodyPart.LeftTibia]: BodyPart.LeftLeg,
  [BodyPart.RightTibia]: BodyPart.RightLeg,
  [BodyPart.LeftFoot]: BodyPart.LeftLeg,
  [BodyPart.RightFoot]: BodyPart.RightLeg,
  [BodyPart.LeftToes]: BodyPart.LeftFoot,
  [BodyPart.RightToes]: BodyPart.RightFoot,
}

/**
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
                  children: [
                    {
                      value: BodyPart.Tongue,
                      label: BodyPartNames[BodyPart.Tongue],
                    },
                  ],
                },
              ],
            },
          ],
        },
        {
          value: BodyPart.Spine,
          label: BodyPartNames[BodyPart.Spine],
        },
        {
          value: BodyPart.Ribcage,
          label: BodyPartNames[BodyPart.Ribcage],
        },
        {
          value: BodyPart.Sternum,
          label: BodyPartNames[BodyPart.Sternum],
        },
        {
          value: BodyPart.Pelvis,
          label: BodyPartNames[BodyPart.Pelvis],
        },
        {
          value: BodyPart.Heart,
          label: BodyPartNames[BodyPart.Heart],
        },
        {
          value: BodyPart.LeftLung,
          label: BodyPartNames[BodyPart.LeftLung],
        },
        {
          value: BodyPart.RightLung,
          label: BodyPartNames[BodyPart.RightLung],
        },
        {
          value: BodyPart.Liver,
          label: BodyPartNames[BodyPart.Liver],
        },
        {
          value: BodyPart.Stomach,
          label: BodyPartNames[BodyPart.Stomach],
        },
        {
          value: BodyPart.LeftKidney,
          label: BodyPartNames[BodyPart.LeftKidney],
        },
        {
          value: BodyPart.RightKidney,
          label: BodyPartNames[BodyPart.RightKidney],
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
              value: BodyPart.LeftClavicle,
              label: BodyPartNames[BodyPart.LeftClavicle],
            },
            {
              value: BodyPart.LeftArm,
              label: BodyPartNames[BodyPart.LeftArm],
              children: [
                {
                  value: BodyPart.LeftHumerus,
                  label: BodyPartNames[BodyPart.LeftHumerus],
                },
                {
                  value: BodyPart.LeftRadius,
                  label: BodyPartNames[BodyPart.LeftRadius],
                },
                {
                  value: BodyPart.LeftHand,
                  label: BodyPartNames[BodyPart.LeftHand],
                  children: [
                    {
                      value: BodyPart.LeftFingers,
                      label: BodyPartNames[BodyPart.LeftFingers],
                    },
                  ],
                },
              ],
            },
          ],
        },
        {
          value: BodyPart.RightShoulder,
          label: BodyPartNames[BodyPart.RightShoulder],
          children: [
            {
              value: BodyPart.RightClavicle,
              label: BodyPartNames[BodyPart.RightClavicle],
            },
            {
              value: BodyPart.RightArm,
              label: BodyPartNames[BodyPart.RightArm],
              children: [
                {
                  value: BodyPart.RightHumerus,
                  label: BodyPartNames[BodyPart.RightHumerus],
                },
                {
                  value: BodyPart.RightRadius,
                  label: BodyPartNames[BodyPart.RightRadius],
                },
                {
                  value: BodyPart.RightHand,
                  label: BodyPartNames[BodyPart.RightHand],
                  children: [
                    {
                      value: BodyPart.RightFingers,
                      label: BodyPartNames[BodyPart.RightFingers],
                    },
                  ],
                },
              ],
            },
          ],
        },
        {
          value: BodyPart.LeftLeg,
          label: BodyPartNames[BodyPart.LeftLeg],
          children: [
            {
              value: BodyPart.LeftFemur,
              label: BodyPartNames[BodyPart.LeftFemur],
            },
            {
              value: BodyPart.LeftTibia,
              label: BodyPartNames[BodyPart.LeftTibia],
            },
            {
              value: BodyPart.LeftFoot,
              label: BodyPartNames[BodyPart.LeftFoot],
              children: [
                {
                  value: BodyPart.LeftToes,
                  label: BodyPartNames[BodyPart.LeftToes],
                },
              ],
            },
          ],
        },
        {
          value: BodyPart.RightLeg,
          label: BodyPartNames[BodyPart.RightLeg],
          children: [
            {
              value: BodyPart.RightFemur,
              label: BodyPartNames[BodyPart.RightFemur],
            },
            {
              value: BodyPart.RightTibia,
              label: BodyPartNames[BodyPart.RightTibia],
            },
            {
              value: BodyPart.RightFoot,
              label: BodyPartNames[BodyPart.RightFoot],
              children: [
                {
                  value: BodyPart.RightToes,
                  label: BodyPartNames[BodyPart.RightToes],
                },
              ],
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
