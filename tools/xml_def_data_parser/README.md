# RimWorld MOD XML数据解析工具

从RimWorld MOD的XML定义文件中提取武器数据，生成与Vanilla.csv格式兼容的CSV文件。

## 功能特性

- ✅ 解析ThingDef继承树，自动填充父类属性
- ✅ 提取武器统计数据（精度、冷却、连发等）
- ✅ 关联子弹数据（伤害、穿甲、抑止）
- ✅ **多语言支持**：自动生成中文(zh-CN)和英文(en-US)版本的CSV文件
- ✅ 批量处理多个MOD

## 快速开始

### 1. 配置MOD路径

编辑 `config.ts`，修改 `MOD_CONFIGS` 数组：

```typescript
export const MOD_CONFIGS: ModConfig[] = [
  {
    path: 'D:\\SteamLibrary\\steamapps\\workshop\\content\\294100\\3588393755',
    enabled: true,
  },
  // 添加更多MOD
  {
    path: 'D:\\SteamLibrary\\steamapps\\workshop\\content\\294100\\另一个MOD_ID',
    outputName: '自定义文件名', // 可选
    enabled: true,
  },
]
```

**常见路径：**

- Steam Workshop: `<Steam目录>\steamapps\workshop\content\294100\<MOD_ID>`
- 本地MOD: `<RimWorld目录>\Mods\<MOD名称>`

### 2. 运行解析

```powershell
npm run parse-mod
```

### 3. 查看结果

生成的CSV文件位于：`src/utils/weapon_data/<MOD名称>/`

**输出文件结构：**

```
src/utils/weapon_data/
└── <MOD名称>/
    ├── en-US.csv     # 英文（原始label或英文翻译）
    ├── zh-CN.csv     # 中文翻译（如果存在）
    └── ...           # 其他支持的语言
```

## 工作原理

1. **扫描XML** - 递归扫描MOD目录下所有XML文件
2. **建立映射** - 解析ThingDef节点，建立defName到节点的映射
3. **解析语言文件** - 扫描 `Languages/` 目录，提取各语言的翻译数据
4. **依赖解析** - 根据ParentName建立继承树，递归填充缺失属性
5. **数据提取** - 识别武器定义，通过defaultProjectile查找子弹数据
6. **生成CSV** - 组合武器和子弹属性，为每种语言生成对应的CSV文件

## 多语言支持

工具会自动搜索 MOD 目录下（最多 2 层深度）的所有 `Languages/` 目录，并扫描其直接子目录获取语言文件：

- `Languages/ChineseSimplified (简体中文)/` → 生成 `zh-CN.csv`
- `Languages/English/` → 生成 `en-US.csv`

**多 Languages 目录支持：**

工具会合并所有找到的 `Languages` 目录中的翻译。例如：

```
D:\SteamLibrary\steamapps\common\RimWorld\Data/
├── Languages/                    # 根目录的语言文件
│   ├── ChineseSimplified (简体中文)/
│   └── English/
├── Core/
│   └── Defs/
└── Anomaly/
    └── Languages/                # DLC 的语言文件
        ├── ChineseSimplified (简体中文)/
        └── English/
```

工具会找到并解析 `Data/Languages` 和 `Data/Anomaly/Languages` 两个目录中的所有翻译文件，自动合并为完整的翻译数据，最终在 `src/utils/weapon_data/Data/` 目录下生成 `zh-CN.csv` 和 `en-US.csv`。

**目录结构示例：**

```
MOD目录/
├── Defs/           # ThingDef 定义
├── Languages/      # 可能在根目录
│   ├── ChineseSimplified (简体中文)/
│   └── English/
或
MOD目录/
├── 1.5/
│   ├── Defs/
│   └── Languages/  # 也可能在子目录
│       ├── ChineseSimplified (简体中文)/
│       └── English/
```

工具会自动找到 `Languages` 目录（最多搜索 2 层），无论它在哪一级。

**语言文件示例：**

```xml
<!-- Languages/ChineseSimplified (简体中文)/DefInjected/ThingDef/Weapons.xml -->
<LanguageData>
  <Gun_ChargeRifle.label>电荷步枪</Gun_ChargeRifle.label>
  <Gun_AssaultRifle.label>突击步枪</Gun_AssaultRifle.label>
</LanguageData>
```

生成的 `*_zh-CN.csv` 会使用 "电荷步枪" 作为 `Gun_ChargeRifle` 的 `label`。

## 解析示例

### XML定义

```xml
<!-- 父定义 -->
<ThingDef Name="Milira_ImperiumWeaponBase" ParentName="BaseMakeableGun" Abstract="True">
  <statBases>
    <RangedWeapon_Cooldown>1.5</RangedWeapon_Cooldown>
  </statBases>
</ThingDef>

<!-- 武器定义 -->
<ThingDef ParentName="Milira_ImperiumWeaponBase">
  <defName>Milira_MarksmanGaussrifle</defName>
  <label>R-63 Gaussrifle</label>
  <statBases>
    <AccuracyMedium>1</AccuracyMedium>
    <RangedWeapon_Cooldown>1</RangedWeapon_Cooldown>  <!-- 覆盖父值 -->
  </statBases>
  <verbs>
    <li>
      <defaultProjectile>Bullet_Milira_MarksmanGaussrifle</defaultProjectile>
      <warmupTime>1</warmupTime>
      <range>64.9</range>
      <burstShotCount>3</burstShotCount>
      <ticksBetweenBurstShots>10</ticksBetweenBurstShots>
    </li>
  </verbs>
</ThingDef>

<!-- 子弹定义 -->
<ThingDef>
  <defName>Bullet_Milira_MarksmanGaussrifle</defName>
  <projectile>
    <damageAmountBase>35</damageAmountBase>
    <armorPenetrationBase>0.85</armorPenetrationBase>
    <stoppingPower>2.8</stoppingPower>
  </projectile>
</ThingDef>
```

### 生成的CSV

```csv
名称,弹药伤害,护甲穿透,抑止能力,瞄准时间,冷却时间,射程(tiles),连发数量,连发间隔(ticks),精度（贴近）,精度（近）,精度（中）,精度（远）,市场价值
R-63 Gaussrifle,35,85%,2.8,1.00秒,1.00秒,64.9,3,10,,,,100%,
```

## 调试选项

编辑 `config.ts` 中的 `DEBUG_OPTIONS`：

```typescript
export const DEBUG_OPTIONS = {
  verbose: true, // 详细日志
  dumpRawNodes: false, // 输出原始XML节点（调试用）
  skipCSVGeneration: false, // 仅测试解析，不生成CSV
}
```

## 常见问题

### ❓ 提示"MOD目录不存在"

- 检查路径中的反斜杠是否正确转义（使用 `\\`）
- 在文件资源管理器中确认目录存在

### ❓ 未找到有效的武器定义

可能原因：

- MOD中没有远程武器（仅支持有range和defaultProjectile的武器）
- 查看控制台输出的ThingDef数量，确认XML被正确解析

### ❓ 某些属性为空

这是正常的：

- 单发武器没有连发间隔
- 部分武器没有市场价值
- 父定义未找到时使用默认值（空）

## 输出格式

| 列名                  | 说明                            | 示例            |
| --------------------- | ------------------------------- | --------------- |
| 名称                  | 武器显示名称                    | R-63 Gaussrifle |
| 弹药伤害              | 基础伤害值                      | 35              |
| 护甲穿透              | 穿甲百分比                      | 85%             |
| 抑止能力              | 击退力                          | 2.8             |
| 瞄准时间              | warmupTime                      | 1.00秒          |
| 冷却时间              | cooldown                        | 1.00秒          |
| 射程(tiles)           | 最大射程                        | 64.9            |
| 连发数量              | burstShotCount                  | 3               |
| 连发间隔(ticks)       | ticksBetweenBurstShots          | 10              |
| 精度（贴近/近/中/远） | AccuracyTouch/Short/Medium/Long | 100%            |
| 市场价值              | MarketValue                     | "12000 银"      |

## 已知限制

- 仅支持远程武器（需要range和defaultProjectile）
- 不支持多重继承
- 抽象定义（Abstract="True"）会被跳过
