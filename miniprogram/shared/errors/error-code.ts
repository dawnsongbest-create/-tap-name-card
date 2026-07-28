export type ErrorCode =
  | 'AUTH_REQUIRED'
  | 'ACCOUNT_RESTRICTED'
  | 'ACCOUNT_DELETED'
  | 'USER_NOT_FOUND'
  | 'POLICY_VERSION_UNSUPPORTED'
  | 'INVALID_INPUT'
  | 'REQUIRED_FIELD_MISSING'
  | 'RESOURCE_NOT_FOUND'
  | 'FORBIDDEN'
  | 'CARD_REQUIRED'
  | 'CARD_NOT_PUBLISHED'
  | 'CARD_UNAVAILABLE'
  | 'CONTENT_REJECTED'
  | 'DUPLICATE_ACTION'
  | 'GREETING_ALREADY_SENT'
  | 'GREETING_EXPIRED'
  | 'GREETING_NOT_PENDING'
  | 'RETURN_REQUIRED'
  | 'CONTACT_REQUEST_PENDING'
  | 'CONTACT_REQUEST_COOLDOWN'
  | 'USER_BLOCKED'
  | 'RATE_LIMITED'
  | 'UPLOAD_FAILED'
  | 'AI_FAILED'
  | 'IMAGE_EXPORT_FAILED'
  | 'REVIEW_IN_PROGRESS'
  | 'NETWORK_ERROR'
  | 'SERVICE_UNAVAILABLE'
  | 'UNKNOWN_ERROR';

export const SAFE_ERROR_MESSAGES: Readonly<Record<ErrorCode, string>> = {
  AUTH_REQUIRED: '需要先完成身份确认。',
  ACCOUNT_RESTRICTED: '当前账号暂时无法完成这个操作。',
  ACCOUNT_DELETED: '当前账号已不可用。',
  USER_NOT_FOUND: '暂时没有找到账号信息。',
  POLICY_VERSION_UNSUPPORTED: '协议版本已更新，请刷新后重新确认。',
  INVALID_INPUT: '检查一下刚才填写的内容。',
  REQUIRED_FIELD_MISSING: '还有一些内容没有填写。',
  RESOURCE_NOT_FOUND: '这项内容已经不存在了。',
  FORBIDDEN: '你无法进行这个操作。',
  CARD_REQUIRED: '先创建一张名牌，再介绍自己。',
  CARD_NOT_PUBLISHED: '这张名牌还没有正式发布。',
  CARD_UNAVAILABLE: '这张名牌暂时无法查看。',
  CONTENT_REJECTED: '部分内容需要修改后才能发布。',
  DUPLICATE_ACTION: '这个操作已经完成了。',
  GREETING_ALREADY_SENT: '已经把名牌递出去了。',
  GREETING_EXPIRED: '这次认识请求已经过期了。',
  GREETING_NOT_PENDING: '这次认识请求已经无法处理。',
  RETURN_REQUIRED: '先互相回赠名牌，再继续。',
  CONTACT_REQUEST_PENDING: '对方还没有处理上一次申请。',
  CONTACT_REQUEST_COOLDOWN: '可以过几天再发起申请。',
  USER_BLOCKED: '当前无法与对方互动。',
  RATE_LIMITED: '操作有点频繁，稍后再试。',
  UPLOAD_FAILED: '图片没有上传成功，请重试。',
  AI_FAILED: '刚才没有整理成功，可以重试。',
  IMAGE_EXPORT_FAILED: '图片没有生成成功，请重试。',
  REVIEW_IN_PROGRESS: '内容正在审核中。',
  NETWORK_ERROR: '网络好像不太稳定。',
  SERVICE_UNAVAILABLE: '服务暂时不可用，请稍后再试。',
  UNKNOWN_ERROR: '暂时没有完成，请稍后再试。',
};

export function isErrorCode(value: unknown): value is ErrorCode {
  return (
    typeof value === 'string' && Object.prototype.hasOwnProperty.call(SAFE_ERROR_MESSAGES, value)
  );
}
