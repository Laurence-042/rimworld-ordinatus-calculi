<script setup lang="ts">
import { ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import DPSCalculator from './components/DPSCalculator.vue'
import ArmorCalculator from './components/ArmorCalculator.vue'
import LanguageSelector from './components/LanguageSelector.vue'
import DataSourceStatus from './components/DataSourceStatus.vue'
import DataSourceSettings from './components/DataSourceSettings.vue'

const { t, locale } = useI18n()
const calculationMode = ref<'weapon' | 'armor'>('weapon')

// Data source settings drawer ref
const dataSourceSettingsRef = ref<InstanceType<typeof DataSourceSettings> | null>(null)

// Open data source settings drawer
function openDataSourceSettings() {
  dataSourceSettingsRef.value?.openDrawer()
}

// Update document title when locale changes
watch(
  locale,
  () => {
    document.title = t('app.pageTitle')
  },
  { immediate: true },
)
</script>

<template>
  <div class="app-container">
    <header class="app-header">
      <h1 class="app-title">
        {{ t('app.title') }} - {{ t('app.subtitleWeapon') }}·{{ t('app.subtitleArmor') }}
      </h1>
      <div class="header-actions">
        <el-radio-group v-model="calculationMode" size="default">
          <el-radio-button value="weapon"
            >{{ t('app.subtitleWeapon') }}({{ t('calculator.dps.title') }})</el-radio-button
          >
          <el-radio-button value="armor"
            >{{ t('app.subtitleArmor') }}({{ t('calculator.armor.title') }})</el-radio-button
          >
        </el-radio-group>
        <DataSourceStatus @open-settings="openDataSourceSettings" />
        <LanguageSelector />
        <a
          href="https://github.com/Laurence-042/rimworld-ordinatus-calculi"
          target="_blank"
          rel="noopener noreferrer"
          class="github-link"
          :title="t('app.githubLink')"
        >
          <svg height="24" width="24" viewBox="0 0 16 16" fill="currentColor">
            <path
              d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z"
            />
          </svg>
        </a>
      </div>
    </header>
    <main class="app-main">
      <DPSCalculator v-if="calculationMode === 'weapon'" />
      <ArmorCalculator v-else-if="calculationMode === 'armor'" />
      <div v-else class="placeholder">{{ t('error.invalidData') }}</div>
    </main>

    <!-- Data Source Settings Drawer -->
    <DataSourceSettings ref="dataSourceSettingsRef" />
  </div>
</template>

<style scoped>
.app-container {
  display: flex;
  flex-direction: column;
  height: 100vh;
  overflow: hidden;
}

.app-header {
  border-bottom: 1px solid var(--border-color);
  padding: 20px 30px;
  top: 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 15px;
}

.github-link {
  color: var(--el-text-color-primary);
  display: flex;
  align-items: center;
  transition: color 0.2s;
}

.github-link:hover {
  color: var(--el-color-primary);
}

.app-title {
  color: var(--el-text-color-primary);
  font-size: 1.5em;
  font-weight: 500;
  margin: 0;
}

.app-main {
  flex: 1;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  background: var(--el-bg-color-page);
}

.placeholder {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  font-size: 1.5em;
  color: var(--el-text-color-secondary);
}

@media (max-width: 768px) {
  .app-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 15px;
  }

  .app-title {
    font-size: 1.3em;
  }
}
</style>
<style>
body {
  margin: 0;
}
</style>
