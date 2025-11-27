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
 * 查找两组数值数组在相邻位置的交点
 *
 * 用于计算两个曲面在某个固定坐标轴值下的交点
 * 通过检测符号变化和线性插值来找到精确的交点位置
 *
 * @param array1 - 第一组数值数组
 * @param array2 - 第二组数值数组
 * @param axisValues - 对应的坐标轴数值
 * @returns 交点数组，包含索引、插值参数和交点处的数值
 */
export function findSurfaceIntersections(
  array1: number[],
  array2: number[],
  axisValues: number[],
): Array<{ index: number; t: number; value: number }> {
  const intersections: Array<{ index: number; t: number; value: number }> = []

  for (let i = 0; i < axisValues.length - 1; i++) {
    const diff1 = array1[i]! - array2[i]!
    const diff2 = array1[i + 1]! - array2[i + 1]!

    // 如果符号改变，说明有交点
    if (diff1 * diff2 < 0) {
      // 线性插值找到精确的交点
      const t = Math.abs(diff1) / (Math.abs(diff1) + Math.abs(diff2))
      const valueIntersect = array1[i]! + t * (array1[i + 1]! - array1[i]!)

      intersections.push({
        index: i,
        t,
        value: valueIntersect,
      })
    }
  }

  return intersections
}

/**
 * 计算两个3D曲面的交线
 *
 * 通过在两个方向上扫描来找到所有交点：
 * 1. 固定Y轴，沿X轴扫描
 * 2. 固定X轴，沿Y轴扫描
 *
 * 然后使用最近邻算法将离散的交点连接成连续的曲线
 *
 * @param zData1 - 第一个曲面的z数据 [xIndex][yIndex]
 * @param zData2 - 第二个曲面的z数据 [xIndex][yIndex]
 * @param xValues - X轴的数值数组
 * @param yValues - Y轴的数值数组
 * @param normalizeRanges - 归一化范围，用于计算最近邻距离 { x, y, z }
 * @returns 交线曲线数组，每条曲线包含 { x, y, z } 坐标数组
 */
export function calculateSurfaceIntersection(
  zData1: number[][],
  zData2: number[][],
  xValues: number[],
  yValues: number[],
  normalizeRanges: { x: number; y: number; z: number } = { x: 50, y: 200, z: 1 },
): Array<{ x: number[]; y: number[]; z: number[] }> {
  const intersectionPoints: Array<{ x: number; y: number; z: number }> = []

  // 方法1：沿X方向（固定Y值），找到Z相等的X值
  for (let yIndex = 0; yIndex < yValues.length; yIndex++) {
    const y = yValues[yIndex]!
    const z1Array = zData1.map((row) => row[yIndex]!)
    const z2Array = zData2.map((row) => row[yIndex]!)

    const intersections = findSurfaceIntersections(z1Array, z2Array, xValues)
    for (const { index, t, value } of intersections) {
      const xIntersect = xValues[index]! + t * (xValues[index + 1]! - xValues[index]!)
      intersectionPoints.push({
        x: xIntersect,
        y,
        z: value,
      })
    }
  }

  // 方法2：沿Y方向（固定X值），找到Z相等的Y值
  for (let xIndex = 0; xIndex < xValues.length; xIndex++) {
    const x = xValues[xIndex]!
    const z1Array = zData1[xIndex]!
    const z2Array = zData2[xIndex]!

    const intersections = findSurfaceIntersections(z1Array, z2Array, yValues)
    for (const { index, t, value } of intersections) {
      const yIntersect = yValues[index]! + t * (yValues[index + 1]! - yValues[index]!)
      intersectionPoints.push({
        x,
        y: yIntersect,
        z: value,
      })
    }
  }

  // 使用最近邻算法连接点，但避免长距离跳跃
  // 将点分组为多条独立的曲线
  const curves: Array<typeof intersectionPoints> = []

  if (intersectionPoints.length > 1) {
    const remaining = [...intersectionPoints]

    while (remaining.length > 0) {
      const currentCurve: typeof intersectionPoints = [remaining[0]!]
      remaining.splice(0, 1)

      // 持续添加最近的点，直到距离超过阈值
      let foundNext = true
      while (foundNext && remaining.length > 0) {
        const last = currentCurve[currentCurve.length - 1]!
        let minDist = Infinity
        let minIndex = -1

        // 找到离最后一个点最近的点
        for (let i = 0; i < remaining.length; i++) {
          const point = remaining[i]!
          // 使用归一化距离：考虑x、y、z的实际范围
          const distX = (point.x - last.x) / normalizeRanges.x
          const distY = (point.y - last.y) / normalizeRanges.y
          const distZ = (point.z - last.z) / Math.max(normalizeRanges.z, 0.001)
          const dist = Math.sqrt(distX * distX + distY * distY + distZ * distZ)

          if (dist < minDist) {
            minDist = dist
            minIndex = i
          }
        }

        // 如果最近的点距离太远，认为是不同的曲线段
        // 阈值：归一化距离 > 0.2 表示跳跃太大
        if (minIndex >= 0 && minDist < 0.2) {
          currentCurve.push(remaining[minIndex]!)
          remaining.splice(minIndex, 1)
        } else {
          foundNext = false
        }
      }

      curves.push(currentCurve)
    }
  } else if (intersectionPoints.length === 1) {
    curves.push([intersectionPoints[0]!])
  }

  // 转换为三个数组的数组（每条曲线一组）
  return curves.map((curve) => ({
    x: curve.map((p) => p.x),
    y: curve.map((p) => p.y),
    z: curve.map((p) => p.z),
  }))
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
