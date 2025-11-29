<script setup lang="ts">
/**
 * 滑块+输入框组合组件
 * 提供统一的数值输入体验，包含滑块和数字输入框
 */

interface Props {
  modelValue: number
  min?: number
  max?: number
  step?: number
  precision?: number
  unit?: string // 单位文字，如 "%"、"秒"、"格"
  formatTooltip?: (value: number) => string
}

withDefaults(defineProps<Props>(), {
  min: 0,
  max: 100,
  step: 1,
  precision: 0,
  unit: '',
})

const emit = defineEmits<{
  'update:modelValue': [value: number]
  change: [value: number]
}>()

const handleInput = (value: number) => {
  emit('update:modelValue', value)
}

const handleChange = (value: number) => {
  emit('change', value)
}
</script>

<template>
  <div class="slider-input-group">
    <el-slider
      :model-value="modelValue"
      :min="min"
      :max="max"
      :step="step"
      :format-tooltip="formatTooltip"
      @input="handleInput"
    />
    <el-input-number
      :model-value="modelValue"
      :min="min"
      :max="max"
      :step="step"
      :precision="precision"
      controls-position="right"
      class="input-number-fixed"
      @update:model-value="handleInput"
      @change="handleChange"
    />
    <span v-if="unit" class="unit">{{ unit }}</span>
    <span v-else class="unit-placeholder"></span>
  </div>
</template>

<style scoped>
.slider-input-group {
  align-items: center;
  display: flex;
  gap: 15px;
  width: 100%;
}

.slider-input-group :deep(.el-slider) {
  flex: 1;
}

.input-number-fixed {
  width: 6em;
}

.unit {
  color: #909399;
  width: 20px;
}

.unit-placeholder {
  width: 20px;
}

/* 平板适配 */
@media (max-width: 768px) {
  .slider-input-group {
    gap: 10px;
  }

  .input-number-fixed {
    width: 5.5em;
  }

  .input-number-fixed :deep(.el-input__inner) {
    padding: 0 8px;
  }
}

/* 手机适配 */
@media (max-width: 480px) {
  .slider-input-group {
    flex-wrap: wrap;
    gap: 8px;
  }

  .slider-input-group :deep(.el-slider) {
    width: 100%;
    flex: none;
  }

  .input-number-fixed {
    flex: 1;
    width: auto;
    min-width: 5em;
  }

  .unit {
    width: auto;
    flex-shrink: 0;
  }

  .unit-placeholder {
    display: none;
  }
}
</style>
