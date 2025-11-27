/**
 * 身体部位工具函数
 * 包含需要i18n的身体部位相关函数
 */

import i18n from '@/i18n'
import { BodyPart, type BodyPartTreeNode } from '@/types/bodyPart'

const { global } = i18n

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
