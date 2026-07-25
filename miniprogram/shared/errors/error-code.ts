export type ErrorCode = 'INVALID_INPUT' | 'SERVICE_UNAVAILABLE' | 'UNKNOWN_ERROR';

export const SAFE_ERROR_MESSAGES: Readonly<Record<ErrorCode, string>> = {
  INVALID_INPUT: '检查一下刚才填写的内容。',
  SERVICE_UNAVAILABLE: '服务暂时不可用，请稍后再试。',
  UNKNOWN_ERROR: '暂时没有完成，请稍后再试。',
};
