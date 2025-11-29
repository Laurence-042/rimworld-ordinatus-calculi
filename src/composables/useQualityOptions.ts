import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { QualityCategory, QualityColors } from '@/types/quality'

/**
 * 品质选项 composable
 * 自动响应语言切换，返回带有翻译标签的品质选项列表
 */
export function useQualityOptions() {
  const { t } = useI18n()

  const qualityOptions = computed(() =>
    Object.values(QualityCategory).map((quality) => ({
      value: quality,
      label: t(`quality.${quality}`),
      color: QualityColors[quality],
    })),
  )

  return { qualityOptions }
}
