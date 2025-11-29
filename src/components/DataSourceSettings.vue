<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { useWindowSize } from '@vueuse/core'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Plus, Delete, Refresh, Link } from '@element-plus/icons-vue'
import {
  useExtendedDataSourceManager,
  type ExtendedDataSource,
} from '@/utils/extendedDataSourceManager'

const { t } = useI18n()
const manager = useExtendedDataSourceManager()

// Drawer visibility
const drawerVisible = ref(false)

// Responsive drawer size using VueUse
const { width: windowWidth } = useWindowSize()
const drawerSize = computed(() => {
  if (windowWidth.value <= 480) return '100%'
  if (windowWidth.value <= 768) return '85%'
  return '450px'
})

// Form for adding new source
const newSourceForm = ref({
  name: '',
  manifestUrl: '',
})

// Edit mode
const editingSourceId = ref<string | null>(null)
const editForm = ref({
  name: '',
  manifestUrl: '',
})

// Get sources (reactive)
const sources = computed(() => manager.getSources())
const isLoading = computed(() => manager.getIsLoading())

// Open drawer
function openDrawer() {
  drawerVisible.value = true
}

// Close drawer
function closeDrawer() {
  drawerVisible.value = false
  editingSourceId.value = null
}

// Add new source
function addSource() {
  if (!newSourceForm.value.name.trim() || !newSourceForm.value.manifestUrl.trim()) {
    ElMessage.warning(t('dataSource.validation.required'))
    return
  }

  // Validate URL format
  try {
    new URL(newSourceForm.value.manifestUrl)
  } catch {
    ElMessage.error(t('dataSource.validation.invalidUrl'))
    return
  }

  manager.addSource(newSourceForm.value.name.trim(), newSourceForm.value.manifestUrl.trim())
  newSourceForm.value = { name: '', manifestUrl: '' }
  ElMessage.success(t('dataSource.message.added'))
}

// Start editing
function startEdit(source: ExtendedDataSource) {
  editingSourceId.value = source.id
  editForm.value = {
    name: source.name,
    manifestUrl: source.manifestUrl,
  }
}

// Save edit
function saveEdit(sourceId: string) {
  if (!editForm.value.name.trim() || !editForm.value.manifestUrl.trim()) {
    ElMessage.warning(t('dataSource.validation.required'))
    return
  }

  try {
    new URL(editForm.value.manifestUrl)
  } catch {
    ElMessage.error(t('dataSource.validation.invalidUrl'))
    return
  }

  manager.updateSource(sourceId, {
    name: editForm.value.name.trim(),
    manifestUrl: editForm.value.manifestUrl.trim(),
  })
  editingSourceId.value = null
  ElMessage.success(t('dataSource.message.updated'))
}

// Cancel edit
function cancelEdit() {
  editingSourceId.value = null
}

// Toggle source enabled
function toggleEnabled(source: ExtendedDataSource) {
  manager.updateSource(source.id, { enabled: !source.enabled })
}

// Delete source
async function deleteSource(source: ExtendedDataSource) {
  try {
    await ElMessageBox.confirm(
      t('dataSource.confirm.deleteMessage', { name: source.name }),
      t('dataSource.confirm.deleteTitle'),
      {
        confirmButtonText: t('common.confirm'),
        cancelButtonText: t('common.cancel'),
        type: 'warning',
      },
    )
    manager.removeSource(source.id)
    ElMessage.success(t('dataSource.message.deleted'))
  } catch {
    // User cancelled
  }
}

// Refresh single source
async function refreshSource(source: ExtendedDataSource) {
  await manager.refreshSource(source.id)
  if (source.status === 'success') {
    ElMessage.success(t('dataSource.message.refreshed'))
  } else if (source.status === 'error') {
    ElMessage.error(t('dataSource.message.refreshFailed', { error: source.errorMessage }))
  }
}

// Refresh all sources
async function refreshAll() {
  await manager.refreshAll()
  const stats = manager.getLoadingStats()
  if (stats.failed > 0) {
    ElMessage.warning(
      t('dataSource.message.partialRefresh', { loaded: stats.loaded, failed: stats.failed }),
    )
  } else {
    ElMessage.success(t('dataSource.message.allRefreshed', { count: stats.loaded }))
  }
}

// Reset to default
async function resetToDefault() {
  try {
    await ElMessageBox.confirm(
      t('dataSource.confirm.resetMessage'),
      t('dataSource.confirm.resetTitle'),
      {
        confirmButtonText: t('common.confirm'),
        cancelButtonText: t('common.cancel'),
        type: 'warning',
      },
    )
    manager.resetToDefault()
    ElMessage.success(t('dataSource.message.reset'))
  } catch {
    // User cancelled
  }
}

// Get status tag type
function getStatusType(
  status: ExtendedDataSource['status'],
): 'success' | 'warning' | 'danger' | 'info' {
  switch (status) {
    case 'success':
      return 'success'
    case 'loading':
      return 'warning'
    case 'error':
      return 'danger'
    default:
      return 'info'
  }
}

// Format last synced time
function formatLastSynced(timestamp?: number): string {
  if (!timestamp) return t('dataSource.status.neverSynced')
  return new Date(timestamp).toLocaleString()
}

// Load manifests on mount
onMounted(() => {
  manager.loadAllManifests()
})

// Expose openDrawer for parent component
defineExpose({ openDrawer })
</script>

<template>
  <el-drawer
    v-model="drawerVisible"
    :title="t('dataSource.title')"
    direction="rtl"
    :size="drawerSize"
    @close="closeDrawer"
  >
    <div class="data-source-settings">
      <!-- Add new source form -->
      <el-card class="add-source-card" shadow="never">
        <template #header>
          <div class="card-header">
            <span>{{ t('dataSource.addNew') }}</span>
          </div>
        </template>
        <el-form :model="newSourceForm" label-position="top" size="small">
          <el-form-item :label="t('dataSource.form.name')">
            <el-input
              v-model="newSourceForm.name"
              :placeholder="t('dataSource.form.namePlaceholder')"
            />
          </el-form-item>
          <el-form-item :label="t('dataSource.form.manifestUrl')">
            <el-input
              v-model="newSourceForm.manifestUrl"
              :placeholder="t('dataSource.form.urlPlaceholder')"
            >
              <template #prefix>
                <el-icon><Link /></el-icon>
              </template>
            </el-input>
          </el-form-item>
          <el-form-item>
            <el-button type="primary" :icon="Plus" @click="addSource">
              {{ t('common.add') }}
            </el-button>
          </el-form-item>
        </el-form>
      </el-card>

      <!-- Source list -->
      <div class="source-list-header">
        <span>{{ t('dataSource.sourceList') }} ({{ sources.length }})</span>
        <div class="header-actions">
          <el-button size="small" :icon="Refresh" :loading="isLoading" @click="refreshAll">
            {{ t('dataSource.refreshAll') }}
          </el-button>
          <el-button size="small" @click="resetToDefault">
            {{ t('common.reset') }}
          </el-button>
        </div>
      </div>

      <el-scrollbar class="source-list-scrollbar">
        <div v-if="sources.length === 0" class="empty-state">
          {{ t('dataSource.empty') }}
        </div>

        <el-card v-for="source in sources" :key="source.id" class="source-card" shadow="hover">
          <!-- View mode -->
          <template v-if="editingSourceId !== source.id">
            <div class="source-header">
              <div class="source-info">
                <el-switch
                  :model-value="source.enabled"
                  size="small"
                  @change="toggleEnabled(source)"
                />
                <span class="source-name" :class="{ disabled: !source.enabled }">
                  {{ source.name }}
                </span>
                <el-tag :type="getStatusType(source.status)" size="small">
                  {{ t(`dataSource.status.${source.status}`) }}
                </el-tag>
              </div>
              <div class="source-actions">
                <el-button
                  :icon="Refresh"
                  size="small"
                  circle
                  :loading="source.status === 'loading'"
                  @click="refreshSource(source)"
                />
                <el-button size="small" @click="startEdit(source)">
                  {{ t('common.edit') }}
                </el-button>
                <el-button
                  :icon="Delete"
                  size="small"
                  type="danger"
                  circle
                  @click="deleteSource(source)"
                />
              </div>
            </div>
            <div class="source-url">
              <el-icon><Link /></el-icon>
              <span class="url-text">{{ source.manifestUrl }}</span>
            </div>
            <div class="source-meta">
              <span v-if="source.lastSynced">
                {{ t('dataSource.lastSynced') }}: {{ formatLastSynced(source.lastSynced) }}
              </span>
              <span v-if="source.errorMessage" class="error-message">
                {{ source.errorMessage }}
              </span>
            </div>
          </template>

          <!-- Edit mode -->
          <template v-else>
            <el-form :model="editForm" label-position="top" size="small">
              <el-form-item :label="t('dataSource.form.name')">
                <el-input v-model="editForm.name" />
              </el-form-item>
              <el-form-item :label="t('dataSource.form.manifestUrl')">
                <el-input v-model="editForm.manifestUrl">
                  <template #prefix>
                    <el-icon><Link /></el-icon>
                  </template>
                </el-input>
              </el-form-item>
              <el-form-item>
                <el-button type="primary" size="small" @click="saveEdit(source.id)">
                  {{ t('common.save') }}
                </el-button>
                <el-button size="small" @click="cancelEdit">
                  {{ t('common.cancel') }}
                </el-button>
              </el-form-item>
            </el-form>
          </template>
        </el-card>
      </el-scrollbar>
    </div>
  </el-drawer>
</template>

<style scoped>
.data-source-settings {
  display: flex;
  flex-direction: column;
  height: 100%;
  gap: 16px;
}

.add-source-card {
  flex-shrink: 0;
}

.card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.source-list-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 4px;
  font-weight: 500;
}

.header-actions {
  display: flex;
  gap: 8px;
}

.source-list-scrollbar {
  flex: 1;
  min-height: 0;
}

.empty-state {
  text-align: center;
  padding: 40px 20px;
  color: var(--el-text-color-secondary);
}

.source-card {
  margin-bottom: 12px;
}

.source-card:last-child {
  margin-bottom: 0;
}

.source-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
}

.source-info {
  display: flex;
  align-items: center;
  gap: 8px;
}

.source-name {
  font-weight: 500;
}

.source-name.disabled {
  color: var(--el-text-color-placeholder);
}

.source-actions {
  display: flex;
  gap: 4px;
}

.source-url {
  display: flex;
  align-items: center;
  gap: 4px;
  color: var(--el-text-color-secondary);
  font-size: 12px;
  margin-bottom: 8px;
}

.url-text {
  word-break: break-all;
}

.source-meta {
  font-size: 12px;
  color: var(--el-text-color-placeholder);
}

.error-message {
  color: var(--el-color-danger);
  display: block;
  margin-top: 4px;
}
</style>
