<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { Loading, CircleCheck, CircleClose, Setting } from '@element-plus/icons-vue'
import { useExtendedDataSourceManager } from '@/utils/extendedDataSourceManager'

const { t } = useI18n()
const manager = useExtendedDataSourceManager()

// Loading animation interval
const loadingFrame = ref(0)
let animationInterval: ReturnType<typeof setInterval> | null = null

// Computed stats
const stats = computed(() => manager.getLoadingStats())
const isLoading = computed(() => manager.getIsLoading())
const hasError = computed(() => stats.value.failed > 0)
const allSuccess = computed(() => stats.value.total > 0 && stats.value.loaded === stats.value.total)
const enabledSources = computed(() => manager.getEnabledSources())

// Status icon
const statusIcon = computed(() => {
  if (isLoading.value) return Loading
  if (hasError.value) return CircleClose
  if (allSuccess.value) return CircleCheck
  return Setting
})

// Status color class
const statusClass = computed(() => {
  if (isLoading.value) return 'status-loading'
  if (hasError.value) return 'status-error'
  if (allSuccess.value) return 'status-success'
  return 'status-idle'
})

// Tooltip content
const tooltipContent = computed(() => {
  if (enabledSources.value.length === 0) {
    return t('dataSource.statusTooltip.noSources')
  }
  if (isLoading.value) {
    return t('dataSource.statusTooltip.loading')
  }
  if (hasError.value) {
    return t('dataSource.statusTooltip.error', { count: stats.value.failed })
  }
  if (allSuccess.value) {
    return t('dataSource.statusTooltip.success', { count: stats.value.loaded })
  }
  return t('dataSource.statusTooltip.idle')
})

// Emit event to open settings drawer
const emit = defineEmits<{
  openSettings: []
}>()

function handleClick() {
  emit('openSettings')
}

// Animation for loading state
function startLoadingAnimation() {
  if (animationInterval) return
  animationInterval = setInterval(() => {
    loadingFrame.value = (loadingFrame.value + 1) % 360
  }, 50)
}

function stopLoadingAnimation() {
  if (animationInterval) {
    clearInterval(animationInterval)
    animationInterval = null
  }
}

// Watch loading state for animation
import { watch } from 'vue'
watch(
  isLoading,
  (loading) => {
    if (loading) {
      startLoadingAnimation()
    } else {
      stopLoadingAnimation()
    }
  },
  { immediate: true },
)

// Load on mount
onMounted(() => {
  manager.loadAllManifests()
})
</script>

<template>
  <el-tooltip :content="tooltipContent" placement="bottom">
    <el-button :class="['data-source-status', statusClass]" circle @click="handleClick">
      <el-icon :class="{ spinning: isLoading }">
        <component :is="statusIcon" />
      </el-icon>
    </el-button>
  </el-tooltip>
</template>

<style scoped>
.data-source-status {
  transition: all 0.3s ease;
}

.status-loading {
  color: var(--el-color-warning);
  border-color: var(--el-color-warning-light-5);
}

.status-loading:hover {
  color: var(--el-color-warning);
  border-color: var(--el-color-warning);
  background-color: var(--el-color-warning-light-9);
}

.status-success {
  color: var(--el-color-success);
  border-color: var(--el-color-success-light-5);
}

.status-success:hover {
  color: var(--el-color-success);
  border-color: var(--el-color-success);
  background-color: var(--el-color-success-light-9);
}

.status-error {
  color: var(--el-color-danger);
  border-color: var(--el-color-danger-light-5);
}

.status-error:hover {
  color: var(--el-color-danger);
  border-color: var(--el-color-danger);
  background-color: var(--el-color-danger-light-9);
}

.status-idle {
  color: var(--el-text-color-secondary);
}

.spinning {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}
</style>
