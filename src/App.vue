<script setup lang="ts">
import { ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import DPSCalculator from './components/DPSCalculator.vue'
import ArmorCalculator from './components/ArmorCalculator.vue'
import LanguageSelector from './components/LanguageSelector.vue'

const { t, locale } = useI18n()
const calculationMode = ref<'weapon' | 'armor'>('weapon')

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
        <LanguageSelector />
      </div>
    </header>
    <main class="app-main">
      <DPSCalculator v-if="calculationMode === 'weapon'" />
      <ArmorCalculator v-else-if="calculationMode === 'armor'" />
      <div v-else class="placeholder">{{ t('error.invalidData') }}</div>
    </main>
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
