# 「碰一下名牌」云函数 API 规格

> 版本：M1.2-A v1.0｜日期：2026-07-25｜状态：`IN_REVIEW`
> 本文定义逻辑契约，不声明任何未验证的微信/CloudBase API 名称。  
> 关联：[范围](./MVP_SCOPE.md)｜[数据](./DATA_MODEL.md)｜[UI](./UI_SPEC.md)｜[测试](./TEST_PLAN.md)

## 1. 通用协议

```ts
type ErrorCode =
  | 'AUTH_REQUIRED' | 'ACCOUNT_RESTRICTED' | 'ACCOUNT_DELETED'
  | 'USER_NOT_FOUND' | 'POLICY_VERSION_UNSUPPORTED' | 'INVALID_INPUT'
  | 'REQUIRED_FIELD_MISSING' | 'RESOURCE_NOT_FOUND' | 'FORBIDDEN'
  | 'CARD_REQUIRED' | 'CARD_NOT_PUBLISHED' | 'CARD_UNAVAILABLE'
  | 'CONTENT_REJECTED' | 'DUPLICATE_ACTION' | 'GREETING_ALREADY_SENT'
  | 'GREETING_EXPIRED' | 'GREETING_NOT_PENDING' | 'RETURN_REQUIRED'
  | 'CONTACT_REQUEST_PENDING' | 'CONTACT_REQUEST_COOLDOWN'
  | 'USER_BLOCKED' | 'RATE_LIMITED' | 'UPLOAD_FAILED' | 'AI_FAILED'
  | 'IMAGE_EXPORT_FAILED' | 'REVIEW_IN_PROGRESS' | 'NETWORK_ERROR'
  | 'SERVICE_UNAVAILABLE' | 'UNKNOWN_ERROR';

interface CloudFunctionResult<T> {
  success: boolean;
  data?: T;
  error?: { code: ErrorCode; message: string; field?: string; details?: Record<string, unknown> };
  requestId: string;
}

interface MutationMeta { operationId: string; clientTime?: string }
interface PageInput { cursor?: string; limit?: number }
interface Page<T> { items: T[]; nextCursor?: string }
interface Ack { completed: true; replayed?: boolean }
interface Id { id: string }
interface CardRef { cardId: string; snapshotId: string }
interface CurrentUserView {
  userId: string; status: 'ACTIVE'|'RESTRICTED'; currentCardId?: string;
  acceptedTermsVersion?: string; acceptedPrivacyVersion?: string;
  needsPolicyAcceptance: boolean; createdAt: string;
}
interface PublicCardView {
  snapshotId: string; type: 'SOCIAL' | 'RESUME'; templateId: string;
  templateVersion: number; content: PublicCardContent; privacy: PublicCardPrivacy;
  availability: 'AVAILABLE';
}
interface CardMineView {
  cardId: string; status: CardStatus; title: string; type: CardType;
  templateId: string; templateVersion: number; draftRevision: number;
  draftContent: CardContent; publishedSnapshotId?: string; reviewFailure?: ReviewFailure;
}
interface ContactSummary { contactId: string; type: ContactType; label: string; visibility: 'PRIVATE'|'PUBLIC'; enabled: boolean }
interface SharedContact extends ContactSummary { value?: string; fileUrl?: string }
```

所有输入先做运行时校验；所有时间、身份和状态由服务端决定。登录接口从可信调用上下文取身份，不接受客户端传 `ownerId/openId`。默认日志字段：`requestId,function,environment,actorId,resourceIds,fromState,toState,resultCode,durationMs`；仅有 operationId 的业务接口可额外记录其摘要。不得记录 OpenID、联系人明文、二维码、密钥、完整 AI 输入或内部堆栈。

频率使用服务端配置。表中的“常规”表示仍有全局防刷；“严格”表示按用户、目标和时间窗限制。所有 P0 写操作至少测试：成功、鉴权/所有权、非法输入、状态前置、拉黑、重复/并发、存储失败、响应字段过滤。客户端失败统一映射安全文案；未知写结果先查状态再重试。

## 2. 账号与模板

| 函数（优先级） | 目的与 TypeScript 契约 | 登录/权限/校验 | 数据、状态、事务、幂等 | 频率、错误、测试与客户端失败 |
|---|---|---|---|---|
| `authEnsureUser` P0 | `input:{}` → `CurrentUserView`；首次主动互动时建号 | 需要可信微信身份；不接受 openId/userId；匿名打开 P11 或应用启动不调用 | R/W `users/identity_mappings`；identityKey 保证幂等；同一事务创建；冲突最多三次退避；无 operationId | `AUTH_REQUIRED/ACCOUNT_DELETED/INVALID_INPUT/SERVICE_UNAVAILABLE`；50 路并发本地只有一条；失败保持匿名/提示重试 |
| `accountGetMe` P0 | `input:{}` → `CurrentUserView` | 登录；仅本人；不接受身份字段 | R users；只读；无 operationId | `AUTH_REQUIRED/USER_NOT_FOUND/ACCOUNT_DELETED/SERVICE_UNAVAILABLE`；响应无 openId；失败回匿名/不可用 |
| `accountAcceptPolicies` P0 | `input:{acceptedTermsVersion:string,acceptedPrivacyVersion:string}` → `{user:CurrentUserView,replayed:boolean}` | 登录；两项必须一次同时确认且必须等于当前服务端版本；RESTRICTED 可调用 | W users；两版本和两时间原子写；相同版本状态幂等；不解除 RESTRICTED；无 operationId | `AUTH_REQUIRED/USER_NOT_FOUND/ACCOUNT_DELETED/POLICY_VERSION_UNSUPPORTED/INVALID_INPUT/SERVICE_UNAVAILABLE`；版本过期后关键业务写阻止，但 getMe/阅读/确认仍可用 |
| `accountDelete` P0（M4） | `input:{confirm:true,meta}` → `Ack` | 登录、本人、二次确认 | W users/cards/contacts/blocks；先 DELETED 和公开/私密入口失效，后续清理可恢复；恢复/幂等字段在 M4 决定 | 严格；`INVALID_INPUT/DUPLICATE_ACTION/SERVICE_UNAVAILABLE`；故障注入与重放；未知结果调用 accountGetMe/公共 Token 验证 |
| `templateList` P0 | `input:{cardType?:CardType}` → `{templates:TemplateSummary[]}` | 匿名可读；只返回启用的仓库配置 | R 版本化模板注册；无数据库写 | 可缓存；`INVALID_INPUT/SERVICE_UNAVAILABLE`；六模板与类型过滤；失败用安全内置配置/重试 |
| `templateGet` P0 | `input:{templateId:string,version?:number}` → `{template:CardTemplate}` | 匿名可读；ID/版本白名单 | R 模板注册；配置错误安全回退并记录 | 可缓存；`RESOURCE_NOT_FOUND/SERVICE_UNAVAILABLE`；版本兼容；失败返回列表 |

## 3. 名牌

```ts
type CardType = 'SOCIAL'|'RESUME';
type CardStatus = 'DRAFT'|'REVIEWING'|'PUBLISHED'|'REJECTED'|'HIDDEN'|'DELETED';
interface CardListInput extends PageInput { statuses?: CardStatus[] }
interface CardCreateInput { type:CardType; templateId:string; title:string; meta:MutationMeta }
interface CardUpdateDraftInput {
  cardId:string; baseRevision:number; draftContent:CardContent;
  templateId:string; templateVersion:number; meta:MutationMeta;
}
interface CardSubmitReviewInput { cardId:string; expectedDraftRevision:number; meta:MutationMeta }
```

| 函数 | 目的与契约 | 登录/权限/校验 | 数据、状态、事务、幂等 | 频率、错误、测试与客户端失败 |
|---|---|---|---|---|
| `cardList` P0 | `CardListInput` → `Page<CardMineSummary>` | 登录；仅本人；limit/cursor | R cards；排除 DELETED 或按明确筛选 | 常规；`INVALID_INPUT`; 分页/状态；失败显示缓存+重试 |
| `cardCreate` P0 | `CardCreateInput` → `CardMineView` | 登录 ACTIVE；模板类型一致；标题；未超配置上限 | W cards；创建 DRAFT、随机 Token；operationId + owner | 严格；`ACCOUNT_RESTRICTED/INVALID_INPUT/RATE_LIMITED`; 并发上限；未知结果查列表 |
| `cardGetMine` P0 | `{cardId}` → `CardMineView` | 登录、owner | R cards | 常规；`RESOURCE_NOT_FOUND/FORBIDDEN`; 他人访问；失败返回列表 |
| `cardUpdateDraft` P0 | `CardUpdateDraftInput` → `{cardId,draftRevision,savedAt,conflict?:RecoveryRef}` | 登录 ACTIVE/owner；具体模块 Schema、数量、链接、模板；图片已上传或明确本地待同步不能入云 | R/W cards；条件 `baseRevision` 增量；保留 recovery；operationId 重放 | 防抖后常规；`INVALID_INPUT/FORBIDDEN/UPLOAD_FAILED`; 断网/冲突/重复；失败保留本地并排队 |
| `cardDuplicate` P0 | `{sourceCardId,title,meta}` → `CardMineView` | 登录 ACTIVE/owner；上限；复制为草稿 | R/W cards；新 ID/Token，DRAFT，不复制当前/审核状态；operationId | 严格；`RESOURCE_NOT_FOUND/RATE_LIMITED`; 并发上限；未知查列表 |
| `cardSubmitReview` P0 | `CardSubmitReviewInput` → `{cardId,reviewState:'REVIEWING',publicSnapshotUnchanged:boolean}` | 登录 ACTIVE/owner；必填、数量、图片、链接、模板类型完整 | R/W cards；冻结 pending；首次 DRAFT/REJECTED/HIDDEN→REVIEWING；已发布保持 PUBLISHED+pending；operationId/修订条件 | 严格；`REQUIRED_FIELD_MISSING/CONTENT_REJECTED/REVIEW_IN_PROGRESS`; 旧版隔离；失败定位字段 |
| `cardSetCurrent` P0 | `{cardId,meta}` → `{currentCardId}` | 登录 ACTIVE/owner；card PUBLISHED、可用 | W users/cards；owner 范围原子清旧设新；operationId | 严格；`CARD_NOT_PUBLISHED/FORBIDDEN`; 并发两卡；未知读 accountGetMe |
| `cardHide` P0 | `{cardId,meta}` → `{status:'HIDDEN'}` | 登录/owner；非 DELETED；重复安全 | W cards/Token 映射；立即 HIDDEN、isCurrent=false，必要时清 users.currentCardId | 严格；`RESOURCE_NOT_FOUND/DUPLICATE_ACTION`; Token 立即失效；未知查 mine/public |
| `cardDelete` P0 | `{cardId,confirm:true,meta}` → `{status:'DELETED'}` | 登录/owner/二次确认 | W cards/当前映射；逻辑删除、Token 失效；历史快照保留；operationId | 严格；`INVALID_INPUT/DUPLICATE_ACTION`; 历史收藏/相遇；未知查 mine/public |
| `cardGetPublicByToken` P0 | `{shareToken:string,source?:OpenSource}` → `PublicCardView` | **不登录**；Token 格式；名牌公开、审核通过且未隐藏/删除；拉黑不改变公开页匿名可见性，只由互动接口阻断双方操作 | R cards/card_snapshots；只投影 published snapshot 白名单；无写、无通知、无访客身份记录 | 严格防枚举+缓存；`CARD_UNAVAILABLE/RESOURCE_NOT_FOUND/RATE_LIMITED`; 字段泄漏/匿名；失败显示不可用页/重试 |

### 3.1 `cardUpdateDraft` 详细规则

1. `baseRevision` 必须等于当前服务端修订；同一 `operationId` 返回原结果。
2. 每种模块使用具体 Schema；社交最多 10 模块、图片最多 4、自定义文本最多 2；简历项目最多 5、经历最多 8、公开链接最多 10，字符限制遵循 PRD。
3. 更换模板不删除不兼容模块；响应可附兼容警告，客户端显示“暂未展示”。
4. 已发布卡更新仅改变 draft；`publishedSnapshotId` 不变。
5. 冲突返回 `INVALID_INPUT` 的结构化 `details:{kind:'REVISION_CONFLICT',serverRevision,recoveryRef}`（不暴露内部数据）；客户端保留本地版本并提供恢复/重试。

### 3.2 `cardSubmitReview` 详细规则

- 事务冻结 `draftContent + revision + templateVersion` 为 `pendingReviewContent`，之后的编辑进入新草稿修订，不改变本次审核对象。
- 审核通过处理器（内部能力，不是客户端接口）创建不可变快照并原子切换；失败记录字段/图片/链接类别。
- 首次审核中公共 Token 不可用；新版审核中旧快照继续公开。

### 3.3 `cardSetCurrent` 详细规则

- 同一 owner 范围事务内复查卡片仍为 PUBLISHED。
- 更新 `users.currentCardId` 与 cards 镜像；若 CloudBase 无跨集合事务，`users.currentCardId` 为权威，cards 镜像异步校正且公共通用入口只读权威值。

### 3.4 `cardGetPublicByToken` 详细规则

- 响应禁止字段：内部 owner/user/card ID（除非使用对外随机引用）、OpenID、draft/pending、review detail、私密 contact、备注、收藏者/浏览者、统计。
- 只记录匿名汇总来源事件；不得形成主人可见访客记录或通知。
- 匿名点击收藏/认识时客户端打开 P25；浏览本身不调用建号接口。

## 4. 收藏

| 函数 | 契约 | 权限/前置 | 数据/幂等 | 频率、错误、测试、失败 |
|---|---|---|---|---|
| `collectionList` P0 | `PageInput` → `Page<CollectionView>` | 登录；仅本人 | R collections/snapshots；失效卡返回不可打开快照状态 | 常规；分页、删除卡；失败缓存+重试 |
| `collectionAdd` P0 | `{cardId,meta}` → `{collectionId,status:'COLLECTED'}` | 登录 ACTIVE；卡公开且 allowCollection；双方无拉黑 | W collections，R snapshot；`collectionKey` upsert/恢复；**不写 greetings/encounters/notifications** | 严格；`CARD_UNAVAILABLE/USER_BLOCKED/DUPLICATE_ACTION`; 断言无副作用；未知查列表 |
| `collectionRemove` P0 | `{cardId,meta}` → `{status:'REMOVED'}` | 登录、collection owner | W collections 条件更新；operationId | 常规；`RESOURCE_NOT_FOUND/DUPLICATE_ACTION`; 重复移除；UI 乐观回滚 |

`collectionAdd` 保存当时 `publishedSnapshotId`；绝不通知名牌主人、不自动认识、不创建相遇或开放联系方式。

## 5. 认识请求

```ts
interface GreetingView {
  greetingId:string; status:'PENDING'|'RETURNED'|'DECLINED'|'CANCELLED'|'EXPIRED';
  senderCard:SnapshotSummary; receiverCard:SnapshotSummary;
  returnedCard?:SnapshotSummary; createdAt:string; expiresAt:string;
}
```

| 函数 | 目的与契约 | 登录/权限/前置 | 数据、事务、幂等 | 频率、错误、测试与失败 |
|---|---|---|---|---|
| `greetingSend` P0 | `{receiverCardId,senderCardId,meta}` → `{greetingId,status:'PENDING',expiresAt}` | 登录 ACTIVE；sender card 和 receiver card 均 PUBLISHED；非自己；allowGreeting；双方无拉黑；同一对用户任一方向都没有有效 PENDING | R cards/blocks；W greetings/notifications；保存双方快照引用；`requestKey` 幂等并占用排序双方 ID 的 `pendingPairKey`；不写 collections/encounters | 严格；`CARD_REQUIRED/GREETING_ALREADY_SENT/USER_BLOCKED/RATE_LIMITED`; 同向和反向重复/并发/无副作用；未知查 incoming+sent |
| `greetingListIncoming` P0 | `PageInput+{status?}` → `Page<GreetingSummary>` | 登录 receiver | R greetings/snapshots | 常规；分页；失败缓存+重试 |
| `greetingListSent` P0 | 同上 → `Page<GreetingSummary>` | 登录 sender | R greetings/snapshots | 常规；不暴露已读；失败重试 |
| `greetingGetDetail` P0 | `{greetingId}` → `GreetingView & {sharedInterestsPreview}` | 登录；参与方按角色 | R greetings/snapshots/cards；若发现 PENDING 已过期，则条件更新为 EXPIRED 并原子释放 pendingPairKey | 常规；`FORBIDDEN/GREETING_EXPIRED`; 越权/过期并发；失败返回列表 |
| `greetingReturnCard` P0 | `{greetingId,returnedCardId,meta}` → `{status:'RETURNED',encounterId}` | 登录 receiver ACTIVE；greeting PENDING 未过期；回赠卡本人 PUBLISHED 且 allowReturnCard；无拉黑 | 原子：快照→greeting RETURNED/释放 pendingPairKey→encounter upsert→仅首次建 event→共同兴趣→双方去重通知；已有 encounter 不覆盖首次快照；`greetingId+operationId`,`pairKey` | 严格；`GREETING_NOT_PENDING/GREETING_EXPIRED/CARD_NOT_PUBLISHED/USER_BLOCKED`; 故障注入/并发；未知查 detail/encounter |
| `greetingDecline` P0 | `{greetingId,meta}` → `{status:'DECLINED'}` | 登录 receiver；PENDING | W greetings 并释放 pendingPairKey；条件迁移；**不新增 PRD 未列出的拒绝通知类型**，发起方从已发列表看到中性结果 | 严格；`GREETING_NOT_PENDING`; 重复；未知查详情 |
| `greetingCancel` P0 | `{greetingId,meta}` → `{status:'CANCELLED'}` | 登录 sender；PENDING | W greetings；条件迁移并原子释放 pendingPairKey | 严格；`GREETING_NOT_PENDING`; 重复；未知查 sent |

### 5.1 `greetingSend` 详细规则

- 接收者由目标卡 owner 推导，不能由客户端传。
- 30 天 `expiresAt` 由服务端配置。
- 成功可创建 `GREETING_RECEIVED` 小程序内通知；浏览、收藏不创建。
- `pendingPairKey` 对双方 ID 排序，因此同向和反向请求都不能与现有有效 `PENDING` 并存；这只是并发防重，不产生匹配或双向关系。

### 5.2 `greetingReturnCard` 原子规则

唯一合法顺序：

```text
锁定并复查 PENDING
→ 验证回赠卡
→ 固化 returnedSnapshotId
→ greeting.status=RETURNED
→ 用 pairKey 创建唯一 encounter 并写首次双方快照；已有 encounter 只更新允许变化的字段
→ 计算可解释共同兴趣
→ 创建首次 encounter_event
→ 写去重通知
→ 提交
```

任一步失败均不得留下对客户端可见的半完成状态；不存在 `greetingAccept`、`ACCEPTED` 或先接受后回赠。

若 `pairKey` 已有 encounter，必须保留 encounter 中首次双方快照；本次请求/回赠快照保留在 greeting，仅更新 `latestEncounterAt` 和允许重算的共同兴趣。P0 只创建首次 encounter event。

## 6. 相遇

| 函数 | 契约 | 权限/前置 | 数据/幂等 | 频率、错误、测试、失败 |
|---|---|---|---|---|
| `encounterList` P0 | `PageInput` → `Page<EncounterSummary>` | 登录；仅本人参与且未对自己隐藏 | R encounters/snapshots/notes/contact status | 常规；双方视图、分页；失败缓存+重试 |
| `encounterGetDetail` P0 | `{encounterId}` → `EncounterDetailView` | 登录；双方之一；拉黑时过滤敏感操作 | R encounters/events/snapshots/本人 note/contact status | 常规；他人备注不可见；失败列表 |
| `encounterUpdateNote` P0 | `{encounterId,content:string,baseRevision?,meta}` → `{revision,updatedAt}` | 登录；参与方；≤500 | W encounter_notes；`encounterId+ownerId` upsert，operationId | 防抖；`FORBIDDEN/INVALID_INPUT`; 双方隔离；失败保留本地 |
| `encounterAddEvent` **P1** | `{encounterId,occurredAt,scene,source,customScene?,meta}` → `{eventId}` | 登录；参与方；不收精确位置 | W encounter_events；eventKey | 常规；P0 返回功能关闭；P1 测试时间线 |
| `encounterHideForMe` P0 | `{encounterId,meta}` → `Ack` | 登录；参与方 | W encounters.hiddenForUserIds；只影响本人；operationId | 常规；重复安全；未知查列表 |

## 7. 联系方式与交换

| 函数 | 目的与契约 | 登录/权限/前置 | 数据、事务、幂等 | 频率、错误、测试与失败 |
|---|---|---|---|---|
| `contactListMine` P0 | `PageInput` → `Page<ContactSummary & {maskedValue?:string}>` | 登录、本人 | R user_contacts；明文仅本人按需返回 | 常规；敏感日志检查；失败重试 |
| `contactSaveMine` P0 | `{contactId?,type,label,value?,fileId?,visibility,enabled,meta}` → `{contactId}` | 登录 ACTIVE；类型/值/URL/文件校验；二维码审核 | W user_contacts；operationId；更新 owner 条件 | 严格；`INVALID_INPUT/UPLOAD_FAILED/CONTENT_REJECTED`; 失败保留表单 |
| `contactDeleteMine` P0 | `{contactId,meta}` → `Ack` | 登录/owner | W user_contacts 逻辑删除；后续共享读取立即过滤 | 严格；`FORBIDDEN/DUPLICATE_ACTION`; 已接受后删除；未知查列表 |
| `contactRequestSend` P0 | `{encounterId,requesterContactIds:string[],meta}` → `{contactRequestId,status:'PENDING'}` | 登录 ACTIVE；encounter ACTIVE 且参与；无拉黑；目标卡允许；ID 均属于本人且 enabled；无 pending/冷却 | R encounters/blocks/contacts；W contact_requests/notification；requestKey | 严格；`RETURN_REQUIRED/CONTACT_REQUEST_PENDING/CONTACT_REQUEST_COOLDOWN/USER_BLOCKED`; 越权/并发；未知查详情 |
| `contactRequestAccept` P0 | `{contactRequestId,receiverContactIds:string[],meta}` → `{status:'ACCEPTED'}` | 登录 receiver ACTIVE；PENDING；encounter ACTIVE/无拉黑；ID 属于 receiver 且 enabled | 事务 W request/notification；只保存双方选定 IDs，不复制明文；operationId | 严格；`FORBIDDEN/CONTACT_REQUEST_PENDING/USER_BLOCKED`; 未选项泄漏/重复；未知查状态 |
| `contactRequestDecline` P0 | `{contactRequestId,meta}` → `{status:'DECLINED',cooldownUntil}` | 登录 receiver；PENDING | W request/notification；服务端配置冷却；条件迁移 | 严格；状态并发；未知查状态 |
| `contactRequestCancel` P0 | `{contactRequestId,meta}` → `{status:'CANCELLED'}` | 登录 requester；PENDING | W request；条件迁移 | 严格；重复；未知查状态 |
| `contactRequestRevoke` P0 | `{contactRequestId,confirm:true,meta}` → `{status:'REVOKED'}` | 登录参与方；ACCEPTED | W request；记录 revokedBy/At；立即停止小程序内展示 | 严格；`DUPLICATE_ACTION`; 任一方撤销；未知用 getShared 验证 |
| `contactGetShared` P0 | `{contactRequestId}` → `{mine:SharedContact[],theirs:SharedContact[],status:'ACCEPTED'}` | 登录参与方；request ACCEPTED、encounter ACTIVE、无拉黑；联系人仍 enabled | R request/encounter/blocks/contacts；严格按双方保存的 ID 投影 | 严格且不缓存；`FORBIDDEN/RETURN_REQUIRED/USER_BLOCKED/RESOURCE_NOT_FOUND`; 全量越权矩阵；失败不展示旧敏感缓存 |

### 7.1 `contactRequestSend`

- 请求方至少选择一项；任何不属于请求方、已禁用或删除的 ID 均整体拒绝。
- 只在 `ACTIVE` encounter 后允许；不能用已收藏/待处理 greeting 代替。
- 冷却按目标 encounter/双方方向和最近 `DECLINED` 计算，数值只来自服务端配置。

### 7.2 `contactRequestAccept`

- 接收方明确选择愿意提供的项目；不得默认全选或自动共享全部。
- 与 request 状态、联系人有效性、通知同一事务或可恢复一致性边界。
- 接受响应不必直接携带明文；客户端随后调用 `contactGetShared`。

### 7.3 `contactGetShared`

- 只返回 `requesterContactIds` 和 `receiverContactIds` 的交集投影（按角色分别返回），且实时过滤 disabled/deleted。
- `PENDING/DECLINED/CANCELLED/REVOKED`、BLOCKED、注销均不返回任何对方明文。
- 响应头/客户端策略禁止持久缓存敏感值；页面退出、拉黑、撤销后清内存。

## 8. 通知

| 函数 | 契约 | 权限/数据/幂等 | 错误、测试、失败 |
|---|---|---|---|
| `notificationList` P0 | `PageInput+{unreadOnly?:boolean}` → `Page<NotificationView>` | 登录 receiver；R notifications；不含浏览/收藏事件 | 分页/类型/相关资源失效；失败缓存非敏感摘要+重试 |
| `notificationMarkRead` P0 | `{notificationId,meta}` → `Ack` | 登录 receiver；W read=true；operationId | 越权/重复；失败可乐观回滚 |
| `notificationMarkAllRead` P0 | `{before?:string,meta}` → `{updatedCount:number}` | 登录 receiver；批量条件更新；operationId | 分页/并发新通知；失败重试 |

## 9. 安全

| 函数 | 目的与契约 | 登录/权限/前置 | 数据、事务、幂等 | 频率、错误、测试与失败 |
|---|---|---|---|---|
| `safetyBlock` P0 | `{targetUserRef:string,confirm:true,meta}` → `Ack` | 登录 ACTIVE；不可拉黑自己；目标解析服务端完成 | W blocks/greetings/contact_requests/encounters；blockKey；关闭 PENDING、将 ACCEPTED 联系交换迁移 REVOKED、encounter BLOCKED/隐藏；**不通知目标** | 严格；`INVALID_INPUT/DUPLICATE_ACTION`; 故障注入/后续交互与敏感读取全拒；未知查安全状态/重试 |
| `safetyUnblock` P0 | `{targetUserRef,meta}` → `Ack` | 登录 blocker | W blocks/encounters；失效本方向 block，复查反向 block；双方均无 block 时 encounter 恢复 ACTIVE；不恢复已取消请求或已撤销共享 | 严格；重复安全；并发双向 block；失败重试 |
| `safetyReport` P0 | `{targetUserRef,cardToken?,reason,description?,meta}` → `{reportId}` | 提交暂按登录；理由/描述；频率；不能篡改目标 | R/创建证据 snapshot；W reports；reportKey/operationId | 严格；`INVALID_INPUT/RATE_LIMITED`; 修改后证据仍在；失败保留表单 |

### 9.1 `safetyBlock` 详细规则

- 事务先建立 block，再关闭双方有效 `PENDING` greetings/contact requests；任何敏感读即时查询 block，故即使后续清理延迟也不会泄露。
- 已 `ACCEPTED` 的 contact request 迁移为 `REVOKED`，encounter 进入 `BLOCKED` 并对 blocker 默认隐藏。
- 解除拉黑不自动恢复已取消请求或已撤销联系方式，也不通知对方；只有双方方向都无 block 时 encounter 才恢复 `ACTIVE`。

## 10. 分享、AI 与 NFC

| 函数 | 契约 | 权限/数据/幂等 | 频率、错误、测试、失败 |
|---|---|---|---|
| `shareGenerateMiniCode` P0 | `{cardId,mode:'FIXED_CARD'|'CURRENT_CARD',meta}` → `{fileId,expiresAt?}` | 登录/owner；卡 PUBLISHED/allowShare；服务端生成受控 scene；可按内容哈希缓存 | 严格；`CARD_NOT_PUBLISHED/RATE_LIMITED/SERVICE_UNAVAILABLE`; 真机扫码固定/当前；失败允许分享或无码导出 |
| `aiAssistCardField` P1 | `{cardType,fieldType,input,relatedFields?,tone?,maxLength,meta}` → `{fieldType,candidates:{text,tone,length}[],suggestedTags?,safetyStatus}` | 登录；最小上下文；最多三候选；不写 cards；W ai_usage | 日限额；`AI_FAILED/RATE_LIMITED`; P0 功能关闭；失败保留原文 |
| `nfcResolve` P2 | `{deviceToken}` → `{mode,cardToken}` | 匿名；随机 Token；设备 BOUND 且目标可用 | 严格防枚举；P0 不部署 |
| `nfcBind` P2 | `{deviceToken,mode,fixedCardId?,meta}` → `Ack` | 登录 owner；设备可绑定；固定卡本人 PUBLISHED | 设备 Token 唯一/事务；P0 不部署 |
| `nfcUnbind` P2 | `{deviceId,meta}` → `Ack` | 登录 owner | 清 owner/目标，旧入口不显示原资料；P0 不部署 |
| `nfcDisable` P2 | `{deviceId,reason:'DISABLED'|'LOST',meta}` → `Ack` | 登录 owner | 条件迁移；P0 不部署 |

## 11. 客户端失败行为基线

| 场景 | 行为 |
|---|---|
| `AUTH_REQUIRED` | 仅在用户主动互动时打开 P25；公开浏览保持可用 |
| 校验/必填/审核 | 定位字段、图片或链接；保留输入；不只显示“失败” |
| `DUPLICATE_ACTION` | 查询服务端事实；若已完成，展示完成结果而非再次写 |
| 网络/超时 | 读操作有限重试；写操作标“结果待确认”，调用列表/详情确认 |
| `USER_BLOCKED/FORBIDDEN` | 清除敏感缓存，解释当前不能互动，不透露谁拉黑谁 |
| 码/图片 | 小程序码失败允许无码图片；保存失败提供授权说明与重试 |
| 服务不可用 | 保留本地草稿/表单，显示温和文案和明确重试 |

## 12. 契约覆盖检查

- PRD 31.2 的账号、模板、名牌、收藏、认识请求、相遇、联系方式、通知、安全、分享函数已全部覆盖。
- `encounterAddEvent`、`aiAssistCardField` 明确为 P1；`nfc*` 明确为 P2。
- 不存在单独接受认识请求接口；唯一入口是原子 `greetingReturnCard`。
- 所有公共/敏感响应均有白名单投影；私密联系方式不在公开名牌对象中。
