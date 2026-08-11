/**
 * 业务错误：携带稳定 code（HTTP 映射键），不依赖 message 文本。
 * 用法：throw new AppError('LOOP_NOT_FOUND')
 * routes/toError 按 code 查 HTTP 状态表，message 改文案不影响映射。
 */
export class AppError extends Error {
  constructor(
    public readonly code: string,
    message?: string,
  ) {
    super(message ?? code);
    this.name = 'AppError';
  }
}
