/**
 * 修补 canvas getContext 以设置 willReadFrequently 属性
 * 这可以消除 Plotly 等库使用 getImageData 时的性能警告
 *
 * 必须在使用 canvas 的库（如 Plotly）导入之前导入此模块
 */

const originalGetContext = HTMLCanvasElement.prototype.getContext

HTMLCanvasElement.prototype.getContext = function (
  this: HTMLCanvasElement,
  contextId: string,
  options?: CanvasRenderingContext2DSettings,
) {
  if (contextId === '2d') {
    options = { ...options, willReadFrequently: true }
  }
  return originalGetContext.call(this, contextId, options)
} as typeof HTMLCanvasElement.prototype.getContext

export {}
