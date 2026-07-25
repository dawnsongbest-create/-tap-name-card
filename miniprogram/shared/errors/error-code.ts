export type ErrorCode =
  | 'AUTH_REQUIRED'
  | 'ACCOUNT_RESTRICTED'
  | 'ACCOUNT_DELETED'
  | 'USER_NOT_FOUND'
  | 'POLICY_VERSION_UNSUPPORTED'
  | 'INVALID_INPUT'
  | 'SERVICE_UNAVAILABLE'
  | 'UNKNOWN_ERROR';

export const SAFE_ERROR_MESSAGES: Readonly<Record<ErrorCode, string>> = {
  AUTH_REQUIRED: '需要先完成身份确认。',
  ACCOUNT_RESTRICTED: '当前账号暂时无法完成这个操作。',
  ACCOUNT_DELETED: '当前账号已不可用。',
  USER_NOT_FOUND: '暂时没有找到账号信息。',
  POLICY_VERSION_UNSUPPORTED: '协议版本已更新，请刷新后重新确认。',
  INVALID_INPUT: '检查一下刚才填写的内容。',
  SERVICE_UNAVAILABLE: '服务暂时不可用，请稍后再试。',
  UNKNOWN_ERROR: '暂时没有完成，请稍后再试。',
};
