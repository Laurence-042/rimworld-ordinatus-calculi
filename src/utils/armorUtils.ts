/**
 * 护甲工具函数
 * 包含需要i18n的护甲相关函数
 */

import i18n from '@/i18n'
import { ApparelLayer } from '@/types/armor'

const { global } = i18n

/**
 * 获取层级的显示名称（支持i18n）
 */
export function getApparelLayerName(layer: ApparelLayer): string {
  const layerNames: Record<ApparelLayer, string> = {
    [ApparelLayer.Skin]: 'skin',
    [ApparelLayer.Middle]: 'middle',
    [ApparelLayer.Outer]: 'outer',
    [ApparelLayer.Belt]: 'belt',
    [ApparelLayer.Headgear]: 'headgear',
    [ApparelLayer.Eyes]: 'eyes',
  }
  const key = `apparelLayer.${layerNames[layer]}` as const
  return global.t(key)
}
