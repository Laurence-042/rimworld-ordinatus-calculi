/**
 * MOD解析配置文件
 *
 * 使用方法：
 * 1. 修改MOD_CONFIGS数组，添加你的MOD路径
 * 2. 运行 npm run parse-mod
 */

export interface ModConfig {
  /** MOD目录的绝对路径 */
  path: string
  /** （可选）自定义输出文件名，默认使用About.xml中的名称 */
  outputName?: string
  /** （可选）是否启用此MOD的解析，默认true */
  enabled?: boolean
}

/**
 * MOD配置列表
 *
 * 示例路径格式：
 * - Steam Workshop: 'D:\\SteamLibrary\\steamapps\\workshop\\content\\294100\\<MOD_ID>'
 * - 本地MOD: 'C:\\Program Files\\Steam\\steamapps\\common\\RimWorld\\Mods\\<MOD_NAME>'
 */
export const MOD_CONFIGS: ModConfig[] = [
  {
    path: 'D:\\SteamLibrary\\steamapps\\common\\RimWorld\\Data\\Core',
    enabled: true,
  },
  {
    path: 'D:\\SteamLibrary\\steamapps\\common\\RimWorld\\Data\\Royalty',
    enabled: true,
  },
  {
    path: 'D:\\SteamLibrary\\steamapps\\common\\RimWorld\\Data\\Ideology',
    enabled: true,
  },
  {
    path: 'D:\\SteamLibrary\\steamapps\\common\\RimWorld\\Data\\Biotech',
    enabled: true,
  },
  {
    path: 'D:\\SteamLibrary\\steamapps\\common\\RimWorld\\Data\\Anomaly',
    enabled: true,
  },
  {
    path: 'D:\\SteamLibrary\\steamapps\\common\\RimWorld\\Data\\Odyssey',
    enabled: true,
  },
  {
    // Vanilla Expanded - Weapons
    path: 'D:\\SteamLibrary\\steamapps\\workshop\\content\\294100\\1814383360',
    enabled: true,
  },
  {
    // Vanilla Expanded - Weapons Translate
    path: 'D:\\SteamLibrary\\steamapps\\workshop\\content\\294100\\2459440010',
    enabled: true,
  },
  {
    // ratkin
    path: 'D:\\SteamLibrary\\steamapps\\workshop\\content\\294100\\3497673755',
    enabled: true,
  },
  {
    // ratkin translate
    path: 'D:\\SteamLibrary\\steamapps\\workshop\\content\\294100\\2898638732',
    enabled: true,
  },
  {
    // ratkin royalty
    path: 'D:\\SteamLibrary\\steamapps\\workshop\\content\\294100\\3159926804',
    enabled: true,
  },
  {
    // Milira
    path: 'D:\\SteamLibrary\\steamapps\\workshop\\content\\294100\\3256974620',
    enabled: true,
  },
  {
    // Milira empire
    path: 'D:\\SteamLibrary\\steamapps\\workshop\\content\\294100\\3588393755',
    enabled: true,
  },
  // 添加更多MOD配置...
  // {
  //   path: 'D:\\SteamLibrary\\steamapps\\workshop\\content\\294100\\1234567890',
  //   outputName: 'CustomName',
  //   enabled: true,
  // },
]

/**
 * 调试选项
 */
export const DEBUG_OPTIONS = {
  /** 是否输出详细日志 */
  verbose: true,
  /** 是否输出原始XML节点信息（用于调试） */
  dumpRawNodes: false,
  /** 是否跳过CSV生成（仅测试解析） */
  skipCSVGeneration: false,
  /** 输出到其他目录 */
  outputDirectory: 'data_mods',
}
