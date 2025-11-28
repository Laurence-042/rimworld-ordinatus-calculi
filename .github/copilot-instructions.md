# RimWorld DPS Calculator - AI Coding Agent Instructions

## Project Overview

This is a **Vue 3 + TypeScript** web application that calculates weapon DPS and armor effectiveness for the game RimWorld. The app implements RimWorld's complex combat mechanics including hit chance interpolation, burst fire timing, and multi-layer armor damage calculations.

**Two calculation modes:**

1. **Weapon-centric** (`DPSCalculator.vue`): Compare multiple weapons against armor curves (0-200%)
2. **Armor-centric** (`ArmorCalculator.vue`): Evaluate armor sets against various weapon/damage parameters

## Architecture

### Data Flow

```
RimWorld XML Defs (via tools/xml_def_data_parser/)
  → CSV Files (public/data/{weapon,apparel,material}/<ModName>/<locale>.csv)
  → manifest.json (auto-generated mod registry)
  → Parsers (src/utils/*DataParser.ts)
  → Calculation Utils (*Calculations.ts)
  → Vue Components (*.vue)
  → Visualization (Chart.js/Plotly)
```

### Key Directories

- `src/types/` - TypeScript interfaces for weapons, armor, materials, body parts, quality
- `src/utils/` - Game mechanic calculations, CSV parsers, data source configuration
- `src/components/` - Vue SFCs (calculators, charts, 3D surfaces, UI components)
- `src/i18n/` - Internationalization (zh-CN, en-US) with vue-i18n
- `public/data/` - CSV data files organized by type/mod/locale
- `tools/xml_def_data_parser/` - Node.js tool to extract data from RimWorld XML definitions

### Data Source System

The app uses a **manifest-based data loading system**:

1. **`public/data/manifest.json`** - Auto-generated registry of available mods, locales, and data types
2. **`src/utils/dataSourceConfig.ts`** - Central configuration for data paths and mod handling
3. **Vanilla MODs** (Core, Royalty, Ideology, Biotech, Anomaly, Odyssey) are merged into a single "Vanilla" source
4. **Third-party MODs** are loaded as separate data sources

## RimWorld Game Mechanics (Critical for Edits)

### Weapon DPS Formula

```typescript
// Total cycle time in ticks
cycleDuration = warmUp * 60 + (burstCount - 1) * burstTicks + cooldown * 60
DPS = (burstCount * damage * 60) / cycleDuration
```

### Hit Chance Interpolation

RimWorld uses **linear interpolation** between 4 distance brackets:

- Touch (0-3), Short (3-12), Medium (12-25), Long (25-40)
- See `calculateHitChance()` in `weaponCalculations.ts` for implementation

### Multi-Layer Armor Calculation

**Critical rules** (see `calculateMultiLayerDamage()` in `armorCalculations.ts`):

1. **Outer-to-inner processing** - Damage flows from outermost layer inward
2. **AP never depletes** - Armor penetration applies to all layers
3. **Sharp→Blunt conversion** - If Sharp damage is reduced 50%, remaining damage becomes Blunt
4. **Original armor values** - Even after Sharp→Blunt conversion, use original armor type for RNG check
5. **Deduplication** - Multi-layer items (e.g., Marine Armor on middle+shell) only roll once
6. **RNG per layer**: Random 0-100 vs. effective armor percentage
   - `< armor/2`: 0% damage (deflect)
   - `>= armor/2 && < armor`: 50% damage
   - `>= armor`: 100% damage (penetration)

## Development Conventions

### TypeScript Patterns

- **Strict mode enabled** - All type assertions must be valid
- **Percent values**: Store as `0-1` for AP, `0-100` for UI display, `0-2` for armor values
- **Enum usage**: `ApparelLayer`, `BodyPart`, `MaterialTag`, `DataSourceType` define game constants
- **CSV parsing**: Use `papaparse` with `header: true, skipEmptyLines: true`

### Vue Component Structure

```vue
<script setup lang="ts">
// 1. Imports (grouped: vue, vue-i18n, @element-plus, @/utils, @/types, components)
// 2. i18n setup (const { t } = useI18n())
// 3. Constants (colors, defaults)
// 4. State (ref/reactive)
// 5. Computed properties
// 6. Methods (creation, calculation, handlers)
// 7. Lifecycle hooks (onMounted)
</script>

<template><!-- Element Plus components with i18n labels: {{ t('key') }} --></template>
<style scoped>
<!-- Scoped styles only -->
</style>
```

### Internationalization (i18n)

- **vue-i18n** with Composition API (`useI18n()`)
- **Locale files**: `src/i18n/locales/{zh-CN,en-US}.json`
- **Usage**: `{{ t('calculator.damage') }}` in templates, `t('key')` in script
- **Language selector**: `LanguageSelector.vue` component
- **Persistence**: Locale stored in `localStorage`

### Calculation Utilities

- **Always validate inputs** - Clamp values to valid ranges (e.g., `Math.max(0, Math.min(1, hitChance))`)
- **Extensive JSDoc** - Document game mechanics with examples in Chinese/English
- **Return immutable data** - Use `[...array]` for sorting operations
- **Error handling** - `console.warn` for recoverable issues, `console.error` for calculation failures

### CSV Data Sources

- **Location**: `public/data/{weapon,apparel,material}/<ModName>/<locale>.csv`
- **Format**: Headers match locale (Chinese/English column names)
- **Manifest**: `public/data/manifest.json` registers available mods and their locales
- **Loading**: Use `dataSourceConfig.ts` utilities (`getCSVPath()`, `getManifestPath()`)

## Tools: XML Definition Parser

Located in `tools/xml_def_data_parser/`:

### Purpose

Extracts weapon, apparel, and material data from RimWorld's XML definition files and generates CSV files.

### Key Files

- `config.ts` - MOD configuration (paths, source URLs)
- `tool.ts` - Main parser orchestration
- `weaponParser.ts` / `apparelParser.ts` / `materialParser.ts` - Type-specific parsing
- `baseParser.ts` - Common utilities and inheritance resolution
- `README.template.md` - Template for generated README with attribution

### Usage

```powershell
npm run parse-mod   # Run the XML parser
```

### Configuration (`config.ts`)

```typescript
interface ModConfig {
  path: string // Absolute path to MOD directory
  sourceUrl: string // Steam Workshop or official URL (for attribution)
  outputName?: string // Custom output folder name
  enabled?: boolean // Toggle parsing
}
```

### Output

- CSV files in `public/data/{type}/{ModName}/{locale}.csv`
- `manifest.json` with mod registry
- `README.md` with attribution info

## Common Tasks

### Adding a New Weapon Property

1. Update `WeaponParams` interface in `src/types/weapon.ts`
2. Add CSV column parsing in `weaponDataParser.ts` (`WeaponCSVData` interface + `convertCSVToWeaponParams`)
3. Update `DEFAULT_WEAPON_PARAMS` in `DPSCalculator.vue`
4. Add UI slider in calculator component template
5. Add i18n keys to both locale files

### Adding Support for a New MOD

1. Add MOD config to `tools/xml_def_data_parser/config.ts`
2. Run `npm run parse-mod` to generate CSV files
3. The manifest and data sources will be auto-updated

### Modifying Armor Calculation Logic

- **Never skip layers** - All `ArmorLayer[]` must process outer-to-inner via `sortArmorLayersOuterToInner()`
- **Test multi-layer scenarios** - Single layer, 2 layers (different types), 3+ layers
- **Verify probability sums** - Final `DamageState[]` probabilities must sum to 1.0 (within 0.001 tolerance)
- **Check console validations** - The calculation functions log errors if results violate game rules

### Updating Charts/Visualization

- **2D charts**: Use `vue-chartjs` (wrapper for Chart.js) - see `DPSChart.vue`, `ArmorChart.vue`
- **3D surfaces**: Use `plotly.js` directly - see `DPSSurface3D.vue`
- **Color consistency**: Use `WEAPON_COLORS` array or `ArmorSet.color` property
- **Responsive**: Charts must handle window resize (implement resize handlers)

### Adding a New UI Language

1. Create new locale file in `src/i18n/locales/<locale-code>.json`
2. Import and register in `src/i18n/index.ts`
3. Update `LanguageSelector.vue` if needed

## Build & Development

```powershell
npm run dev          # Start Vite dev server (localhost:5173)
npm run build        # Production build
npm run type-check   # TypeScript validation (run before commits)
npm run lint         # ESLint + auto-fix
npm run format       # Prettier formatting
npm run parse-mod    # Parse RimWorld XML definitions to CSV
```

**Node version**: `^20.19.0 || >=22.12.0` (see `package.json` engines)

## Code Quality

- **Type safety**: Prefer explicit types over `any` - use generics for flexibility
- **No unused imports**: ESLint enforces clean imports
- **Consistent naming**: camelCase for functions/variables, PascalCase for types/components
- **i18n required**: All user-facing strings must use `t()` function
- **Comments in English/Chinese mix**: Game mechanics explained in both languages

## Testing Strategy

While no formal test suite exists, validate changes by:

1. **Type checking**: `npm run type-check` must pass
2. **Manual testing**: Compare DPS values against known RimWorld wiki data
3. **Edge cases**: Test with armor=0%, armor=200%, AP=100%, burstCount=1
4. **Console logs**: Check browser console for validation errors from calculation functions
5. **i18n validation**: Switch languages to verify all strings are translated

## External Data Sources

- **RimWorld XML Defs**: Primary source via `xml_def_data_parser` tool
- **Steam Workshop**: Source URLs for third-party mods
- **Game version**: Based on RimWorld 1.5+ mechanics (Core + all DLCs supported)
