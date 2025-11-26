# RimWorld DPS Calculator - AI Coding Agent Instructions

## Project Overview

This is a **Vue 3 + TypeScript** web application that calculates weapon DPS and armor effectiveness for the game RimWorld. The app implements RimWorld's complex combat mechanics including hit chance interpolation, burst fire timing, and multi-layer armor damage calculations.

**Two calculation modes:**

1. **Weapon-centric** (`DPSCalculator.vue`): Compare multiple weapons against armor curves (0-200%)
2. **Armor-centric** (`ArmorCalculator.vue`): Evaluate armor sets against various weapon/damage parameters

## Architecture

### Data Flow

```
CSV Files (src/utils/*_data/)
  → Parsers (*DataParser.ts)
  → Calculation Utils (*Calculations.ts)
  → Vue Components (*.vue)
  → Visualization (Chart.js/Plotly)
```

### Key Directories

- `src/types/` - TypeScript interfaces for weapons, armor, materials, body parts
- `src/utils/` - Game mechanic calculations and CSV parsers
- `src/components/` - Vue SFCs (calculators, charts, 3D surfaces)

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
- **Enum usage**: `ApparelLayer`, `BodyPart`, `MaterialTag` define game constants
- **CSV parsing**: Use `papaparse` with `header: true, skipEmptyLines: true`

### Vue Component Structure

```vue
<script setup lang="ts">
// 1. Imports (grouped: vue, @element-plus, @/utils, @/types, components)
// 2. Constants (colors, defaults)
// 3. State (ref/reactive)
// 4. Computed properties
// 5. Methods (creation, calculation, handlers)
// 6. Lifecycle hooks (onMounted)
</script>

<template><!-- Element Plus components with Chinese labels --></template>
<style scoped>
<!-- Scoped styles only -->
</style>
```

### Calculation Utilities

- **Always validate inputs** - Clamp values to valid ranges (e.g., `Math.max(0, Math.min(1, hitChance))`)
- **Extensive JSDoc** - Document game mechanics with examples in Chinese/English
- **Return immutable data** - Use `[...array]` for sorting operations
- **Error handling** - `console.warn` for recoverable issues, `console.error` for calculation failures

### CSV Data Sources

- **Location**: `src/utils/{weapon,clothing,material}_data/Vanilla.csv`
- **Format**: Chinese headers (名称, 护甲穿透, 伤害, etc.)
- **Extensibility**: Designed to support mod data - add new CSV files and import in `get*DataSources()`
- **Caching**: Data sources cached globally (`cachedDataSources` pattern)

## Common Tasks

### Adding a New Weapon Property

1. Update `WeaponParams` interface in `src/types/weapon.ts`
2. Add CSV column parsing in `weaponDataParser.ts` (`WeaponCSVData` interface + `convertCSVToWeaponParams`)
3. Update `DEFAULT_WEAPON_PARAMS` in `DPSCalculator.vue`
4. Add UI slider in calculator component template

### Modifying Armor Calculation Logic

- **Never skip layers** - All `ArmorLayer[]` must process outer-to-inner via `sortArmorLayersOuterToInner()`
- **Test multi-layer scenarios** - Single layer, 2 layers (different types), 3+ layers
- **Verify probability sums** - Final `DamageState[]` probabilities must sum to 1.0 (within 0.001 tolerance)
- **Check console validations** - The calculation functions log errors if results violate game rules

### Updating Charts/Visualization

- **2D charts**: Use `vue-chartjs` (wrapper for Chart.js) - see `DPSChart.vue`, `ArmorChart.vue`
- **3D surfaces**: Use `plotly.js` directly - see `DPSSurface3D.vue`, `ArmorSurface3D.vue`
- **Color consistency**: Use `WEAPON_COLORS` array or `ArmorSet.color` property
- **Responsive**: Charts must handle window resize (implement resize handlers)

## Build & Development

```powershell
npm run dev          # Start Vite dev server (localhost:5173)
npm run build        # Production build
npm run type-check   # TypeScript validation (run before commits)
npm run lint         # ESLint + auto-fix
npm run format       # Prettier formatting
```

**Node version**: `^20.19.0 || >=22.12.0` (see `package.json` engines)

## Code Quality

- **Type safety**: Prefer explicit types over `any` - use generics for flexibility
- **No unused imports**: ESLint enforces clean imports
- **Consistent naming**: camelCase for functions/variables, PascalCase for types/components
- **Chinese UI text**: All user-facing strings use Chinese (zh-CN)
- **Comments in English/Chinese mix**: Game mechanics explained in both languages

## Testing Strategy

While no formal test suite exists, validate changes by:

1. **Type checking**: `npm run type-check` must pass
2. **Manual testing**: Compare DPS values against known RimWorld wiki data
3. **Edge cases**: Test with armor=0%, armor=200%, AP=100%, burstCount=1
4. **Console logs**: Check browser console for validation errors from calculation functions

## External Data Sources

- **RimWorld Huiji Wiki** (Chinese): Source for all CSV data (see README.md for exact query URLs)
- **Game version**: Based on RimWorld 1.x mechanics (verify if updating for 1.5+)
