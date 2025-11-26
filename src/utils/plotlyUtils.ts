/**
 * Plotly 工具函数
 * 提供 Plotly 图表相关的辅助功能
 */

/**
 * 转置二维矩阵
 *
 * **重要说明：为什么需要转置？**
 *
 * Plotly Surface 的坐标系统规则：
 * - z 数据：z[i][j] 对应 y[i] 和 x[j]（第一维=Y轴，第二维=X轴）
 * - text 数据：text[i][j] 对应 x[i] 和 y[j]（第一维=X轴，第二维=Y轴）
 *
 * 在我们的数据结构中：
 * - 原始数据：data[i][j] 其中 i 对应第一个变量，j 对应第二个变量
 * - 如果第一个变量映射到 X 轴，第二个变量映射到 Y 轴：
 *   - 需要转置 z 数据（因为 z 期望第一维是 Y）
 *   - 不需要转置 text 数据（因为 text 期望第一维是 X）
 *
 * @example
 * // 护甲曲面：penetration × damage → expectedDamage
 * // 原始：data[penetrationIndex][damageIndex]
 * // 目标：x=penetration, y=damage
 * // 需要转置 z，因为我们的第一维(penetration)需要映射到X轴，但z期望第一维是Y轴
 * const zTransposed = transposeMatrix(originalData);
 *
 * @param matrix - 原始矩阵 matrix[row][col]
 * @returns 转置后的矩阵 transposed[col][row]
 */
export function transposeMatrix<T>(matrix: T[][]): T[][] {
  if (!matrix || matrix.length === 0 || !matrix[0] || matrix[0].length === 0) {
    return []
  }

  const rows = matrix.length
  const cols = matrix[0].length
  const transposed: T[][] = []

  for (let col = 0; col < cols; col++) {
    const newRow: T[] = []
    for (let row = 0; row < rows; row++) {
      newRow.push(matrix[row]![col]!)
    }
    transposed.push(newRow)
  }

  return transposed
}

/**
 * 验证矩阵维度是否匹配
 * 用于在绘制图表前检查数据完整性
 *
 * @param x - X 轴数据数组
 * @param y - Y 轴数组
 * @param z - Z 数据矩阵（应该是 z[y.length][x.length]）
 * @throws 如果维度不匹配则抛出错误
 */
export function validateSurfaceDimensions(x: number[], y: number[], z: number[][]): void {
  if (z.length !== y.length) {
    throw new Error(
      `Z 矩阵的行数(${z.length})与 Y 数组长度(${y.length})不匹配。` +
        `Plotly Surface 要求 z[i][j] 中 i 对应 y[i]。`,
    )
  }

  if (z.length > 0 && z[0] && z[0].length !== x.length) {
    throw new Error(
      `Z 矩阵的列数(${z[0].length})与 X 数组长度(${x.length})不匹配。` +
        `Plotly Surface 要求 z[i][j] 中 j 对应 x[j]。`,
    )
  }
}
