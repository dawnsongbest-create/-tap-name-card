# 「碰一下名牌」MVP 数据模型

> 版本：M0 v1.1（第二轮 Review）｜日期：2026-07-24｜状态：`IN_REVIEW`  
> 本文为逻辑模型；CloudBase 实际索引、事务和唯一能力须在 M1/M4 依据官方文档及并发测试确认。  
> 关联：[架构](./ARCHITECTURE.md)｜[接口](./API_SPEC.md)｜[测试](./TEST_PLAN.md)｜[决策](./DECISIONS.md)

## 1. 全局约定

- 所有 `_id` 为内部随机 ID；所有公开入口使用随机不可枚举 `shareToken`。
- 时间由服务端生成，存 UTC：`createdAt`、`updatedAt`、`deletedAt`、`resolvedAt` 等。
- 客户端不得直写核心集合；公开读取和敏感读取均通过云函数字段投影。
- 逻辑删除立即使当前入口失效；不可变快照和必要安全审计按留存策略保留。
- 写操作携带 `operationId/clientMutationId`；确定性业务键统一做规范化、分隔和哈希，日志仅记摘要。
- P0 集合：除 `ai_usage`（P1）和 `nfc_devices`（P2）外全部；`encounter_events` P0 只存首次系统事件。

## 2. 核心键与唯一语义

| 键 | 规范 | 唯一语义 |
|---|---|---|
| `requestKey`（greeting） | `hash(senderId:receiverId:generation)` | 单次方向性请求的幂等与历史标识 |
| `pendingPairKey`（greeting） | `hash(min(senderId,receiverId):max(senderId,receiverId))` | 同一对用户无论方向至多一个有效 `PENDING`；离开 PENDING 时释放占位 |
| `pairKey` | `hash(min(userA,userB):max(userA,userB))` | 同一对用户只有一个 encounter |
| `collectionKey` | `hash(ownerId:cardId)` | 同一用户/名牌一条收藏文档 |
| `blockKey` | `hash(blockerId:blockedId)` | 同方向一条拉黑关系 |
| 联系申请 `requestKey` | `hash(encounterId:requesterId:activeGeneration)` | 同一发起方在一轮内至多一个有效申请 |
| 当前名牌 | owner 范围的 `currentCardId` + cards `isCurrent` 镜像 | 每用户至多一张当前名牌 |

CloudBase 若无严格唯一约束：用键本身作为文档 `_id` 或建立 `unique_keys/{kind:key}` 占位文档；事务内“创建占位/条件更新 → 复查业务文档 → 写入”，冲突方读取胜者；若无跨集合事务，采用可恢复操作记录与状态条件更新，任何公开/敏感读只认最终状态。不得仅靠“先查再写”。

## 3. 集合规格

### 3.1 `users`（P0）

- 目的/关系：微信身份对应内部账号；一对多 cards/contacts，一对一当前名牌引用。
- 字段：`_id:string*`、`openId:string* [server/private]`、`status:ACTIVE|RESTRICTED|DELETED*`、`currentCardId?:string`、`acceptedTermsVersion?:string`、`createdAt:Date* [server]`、`updatedAt:Date* [server]`、`deletedAt?:Date [server]`、`deletionVersion?:number`。
- 索引/唯一：`openId` 唯一语义；`status+updatedAt` 管理查询；`currentCardId` 普通索引。
- 所有权/可见：本人可经 `accountGetMe` 看状态和当前名牌 ID；`openId` 永不返回；他人只在公开快照中看到用户主动发布内容。
- 删除/保留：注销置 `DELETED`，清除公开映射和联系方式访问；安全审计/举报按规则留存，历史相遇只保留注销快照。
- 典型查询：按可信 `openId` 获取/幂等创建；读取本人；注销。
- 事务/幂等：`authEnsureUser` 以 `openId` 唯一语义；`accountDelete` 以 `userId+deletionVersion` 可恢复执行。

### 3.2 `cards`（P0）

- 目的/关系：名牌可编辑聚合；引用当前公开 `card_snapshots`。
- 字段：`_id:string*`、`ownerId:string*`、`type:SOCIAL|RESUME*`、`status:DRAFT|REVIEWING|PUBLISHED|REJECTED|HIDDEN|DELETED*`、`title:string*`、`templateId:string*`、`templateVersion:number*`、`draftContent:CardContent* [private]`、`draftRevision:number* [server]`、`draftRecovery?:CardContent [private]`、`pendingReviewContent?:CardContent [private]`、`pendingReviewRevision?:number`、`publishedSnapshotId?:string`、`shareToken:string* [public-entry]`、`isCurrent:boolean*`、`privacy:CardPrivacy*`、`reviewFailure?:{category,field?,imageId?}`、时间字段。
- 状态：见第 4 节；“审核中新版”用 `status=PUBLISHED + pendingReviewContent` 表达，旧快照继续公开；首次提交可用 `REVIEWING`。
- 索引/唯一：`shareToken` 唯一；`ownerId+status+updatedAt`；`ownerId+isCurrent` 唯一语义；最多 10 张非删除卡由配置和事务校验。
- 所有权/可见：仅 owner 可读草稿/审核内容并写；公共接口只经 Token 投影当前审核通过快照及隐私开关；他人看不到 ownerId 内部值。
- 删除/快照/保留：删除逻辑删除并使 Token 失效；快照不删除以满足收藏/请求/相遇历史，按数据保留政策处理。
- 查询：本人列表/详情；Token 解析；当前名牌；审核队列。
- 事务/幂等：创建、草稿修订、提交审核、审核通过切换、设置当前、隐藏/删除均条件更新。

### 3.3 `card_snapshots`（P0）

- 目的：审核通过版本、收藏/请求/相遇证据的不可变内容。
- 字段：`_id:string*`、`cardId:string*`、`ownerId:string*`、`version:number*`、`cardType:SOCIAL|RESUME*`、`templateId:string*`、`templateVersion:number*`、`content:CardContent*`、`publicProjectionVersion:number*`、`createdAt:Date* [server]`、`contentHash:string* [server]`。
- 索引/唯一：`cardId+version` 唯一语义；`ownerId+createdAt`；`contentHash` 辅助幂等。
- 所有权/可见：原始快照仅服务端；公共/历史 DTO 按场景白名单过滤，绝不含 `user_contacts`。
- 删除/保留：不可修改；卡片隐藏/删除不抹去合法历史引用，但公共 Token 不再打开。
- 查询/事务：按 ID 供收藏/请求/相遇；审核通过事务中创建并切换。

### 3.4 `greetings`（P0）

- 目的：单向认识请求，独立于收藏。
- 字段：PRD 字段全部：`_id`、`requestKey`、`senderId`、`receiverId`、`senderCardId/senderSnapshotId`、`receiverCardId/receiverSnapshotId`、`returnedCardId?/returnedSnapshotId?`、`status:PENDING|RETURNED|DECLINED|CANCELLED|EXPIRED`、`expiresAt`、`createdAt`、`resolvedAt?`；补充 `pendingPairKey?`（仅 PENDING 有效）、`returnOperationId?`、`source?`。
- 索引/唯一：`requestKey` 唯一语义；活动 `pendingPairKey` 唯一语义；`receiverId+status+createdAt`；`senderId+status+createdAt`；`expiresAt+status`。
- 所有权/可见：sender 看发出状态，receiver 看详情并处理；双方看到必要快照，其他人不可见；不提供已读字段。
- 删除/保留：业务记录不物理删除；账号注销后当前主页失效，历史快照按规则保留。
- 查询：待处理、已发出、详情、过期扫描。
- 事务/幂等：发送先占用 `pendingPairKey`，保存双方当时快照引用并通知；离开 PENDING 时原子释放占位。`greetingReturnCard` 原子创建回赠快照、`RETURNED`、encounter/首次事件/通知；取消/拒绝/过期均为条件迁移。

### 3.5 `encounters`（P0）

- 目的：双方回赠后的唯一私密关系。
- 字段：`_id`、`pairKey`、`userAId/userBId`、`userASnapshotId/userBSnapshotId`、`sharedInterests:SharedInterest[]`、`firstEncounterAt/latestEncounterAt`、`status:ACTIVE|BLOCKED`、`hiddenForUserIds:string[]`（每方视图隐藏，不是全局状态）、时间字段。
- 索引/唯一：`pairKey` 唯一语义；`userAId+latestEncounterAt`、`userBId+latestEncounterAt`。
- 所有权/可见：仅双方；列表/详情按当前用户投影“对方”；隐藏标记仅影响对应用户；共享兴趣只由允许字段生成。
- 删除/快照/保留：用户“删除/隐藏”只改自己的视图；拉黑变 `BLOCKED`；不覆盖双方历史快照。若同一对用户后来再次完成回赠，已有 encounter 保留首次 `userASnapshotId/userBSnapshotId`，只更新 `latestEncounterAt` 和可重新计算的共同兴趣；新一轮双方快照继续保存在对应 greeting，P0 不额外创建用户事件。
- 查询：本人最近相遇；pair 查找；详情。
- 事务/幂等：只能由 `PENDING→RETURNED` 原子事务 upsert；重复请求命中同一 `pairKey`，不得覆盖首次历史快照。

### 3.6 `encounter_events`（P0 最小、P1 增强）

- 目的：相遇发生记录。P0 仅在首次回赠时创建一个系统事件；用户新增/完整时间线为 P1。
- 字段：`_id`、`encounterId`、`createdBy`、`occurredAt`、`scene:INTEREST_EVENT|FRIEND_GATHERING|WORK_EVENT|SCHOOL|TRAVEL|DAILY|ONLINE|CUSTOM`、`source:SHARE|MINI_CODE|COLLECTION|NFC|OTHER`、`customScene?`、`createdAt`、`eventKey`。
- 索引/唯一：`eventKey` 唯一语义；`encounterId+occurredAt`。
- 权限/私密：双方可看非私人事件字段；不采集精确位置；用户私人文字放 `encounter_notes`，不放共享事件。
- 保留/事务：随 encounter 安全留存；首次事件在回赠事务中幂等写，`encounterAddEvent` 到 P1 才开放。

### 3.7 `encounter_notes`（P0）

- 目的：每方独立私人备注。
- 字段：`_id`、`encounterId`、`ownerId`、`content:string(≤500)*`、`updatedAt`、`revision`。
- 索引/唯一：`encounterId+ownerId` 唯一语义。
- 权限：仅 owner 可读写；另一方、共同兴趣、AI 和日志永不可见。
- 删除/保留：owner 可清空/逻辑删除；注销后按隐私政策处理。
- 查询/幂等：详情按 owner 获取；条件修订更新。

### 3.8 `user_contacts`（P0）

- 目的：与公开名牌分离保存用户联系方式。
- 字段：`_id`、`ownerId`、`type:WECHAT_ID|WECHAT_QR|PHONE|EMAIL|XIAOHONGSHU|WEIBO|INSTAGRAM|GITHUB|WEBSITE|CUSTOM`、`label`、`value [private]`、`fileId? [private]`、`visibility:PRIVATE|PUBLIC`、`enabled`、时间/删除字段。
- 索引/唯一：`ownerId+enabled+type`；可允许同类型多条时不强制类型唯一。
- 权限/可见：本人管理；`PUBLIC` 仅在明确加入名牌公开模块且通过审核时以安全链接投影；`PRIVATE` 只由 `contactGetShared` 按已接受且未撤销的选择返回。
- 删除/保留：删除/禁用后新请求不可选；已共享项若被删除应立即停止后续返回；二维码使用私密存储。
- 查询/事务：本人列表；验证请求选项归本人且 enabled；接受时不复制明文，只保存 ID 选择。

### 3.9 `contact_requests`（P0）

- 目的：相遇后双方各自选择的联系方式交换。
- 字段：`_id`、`requestKey`、`encounterId`、`requesterId/receiverId`、`requesterContactIds[]`、`receiverContactIds?[]`、`status:PENDING|ACCEPTED|DECLINED|CANCELLED|REVOKED`、`cooldownUntil?`、`createdAt/resolvedAt?`、`revokedAt?`、`revokedBy?`、操作 ID。
- 索引/唯一：`requestKey` 唯一语义；`receiverId+status+createdAt`；`requesterId+status+createdAt`；`encounterId+status`。
- 权限/可见：仅 encounter 双方；请求详情只显示选择的 contact 元数据，不预泄露对方私密 value。
- 删除/保留：不物理删除；`REVOKED` 后 `contactGetShared` 不再返回明文；无法收回已复制内容。
- 查询/事务：有效申请、冷却、共享读取。
- 幂等：发送校验 `ACTIVE`/无拉黑/开关/冷却；接受事务校验接收方联系人并写通知；撤销由任一方触发。

### 3.10 `collections`（P0）

- 目的：静默单向保存名牌，绝不触发社交。
- 字段：`_id`、`collectionKey`、`ownerId`、`cardOwnerId`、`cardId`、`snapshotId`、`source:MANUAL`、`status:COLLECTED|REMOVED`、时间字段。
- 索引/唯一：`collectionKey` 唯一语义；`ownerId+status+updatedAt`。
- 权限/可见：仅收藏者；名牌主人看不到收藏者身份或数量。
- 删除/快照：取消为 `REMOVED`；名牌失效后保留缩略快照并标“不可查看”。
- 查询/幂等：列表分页；add upsert/恢复；remove 条件更新；无通知、无 greeting、无 encounter 写入。

### 3.11 `notifications`（P0 小程序内）

- 目的：业务结果入口；订阅消息另属 P1。
- 字段：`_id`、`receiverId`、`type:GREETING_RECEIVED|CARD_RETURNED|CONTACT_REQUEST_RECEIVED|CONTACT_REQUEST_ACCEPTED|CONTACT_REQUEST_DECLINED|CARD_REVIEW_PASSED|CARD_REVIEW_REJECTED`、`relatedId?`、`title`、`summary`、`read`、`createdAt`、`dedupeKey`。
- 索引/唯一：`dedupeKey` 唯一语义；`receiverId+read+createdAt`。
- 权限：仅 receiver；read 不反馈给业务对方。
- 保留/幂等：分页保留期待政策确认；与业务事务同写或 outbox 可恢复投递；浏览、收藏、拉黑均不得创建通知。

### 3.12 `blocks`（P0）

- 目的：单向拉黑关系。
- 字段：`_id`、`blockKey`、`blockerId`、`blockedId`、`createdAt`、`deletedAt?`。
- 索引/唯一：`blockKey` 唯一；双向检查分别查 `a:b` 与 `b:a`。
- 权限：仅 blocker 管理/看见；不通知 blocked。
- 影响/事务：创建时关闭双方有效 `PENDING` greeting/contact request，并释放 greeting 的 `pendingPairKey` 占位；将双方现有 `ACCEPTED` contact request 迁移为 `REVOKED` 以停止站内展示；将 encounter 标 `BLOCKED` 并对 blocker 隐藏；不删审计。解除不自动恢复已取消请求或已撤销共享；仅当双方方向都没有有效 block 时将 encounter 从 `BLOCKED` 恢复为 `ACTIVE`，各自隐藏标记仍保留。
- 幂等：blockKey upsert；unblock 条件删除/失效并在事务内复查反向 block。

### 3.13 `reports`（P0）

- 目的：举报与证据保全。
- 字段：`_id`、`reporterId`、`reportedUserId`、`reportedCardId?`、`snapshotId?`、`reason:SEXUAL_CONTENT|HARASSMENT|HATE|IMPERSONATION|FRAUD|PRIVACY|ILLEGAL|OTHER`、`description?`、`status:PENDING|RESOLVED|REJECTED`、时间字段、`reportKey`。
- 索引/唯一：`reporterId+reportedCardId+status` 防刷语义；`status+createdAt`；`reportedUserId+createdAt`。
- 权限：举报者仅获提交结果；处理详情为运营私密；被举报者不获举报者身份。
- 快照/保留：提交时引用/创建当时快照，防止被修改；按安全与法律规则留存。
- 幂等/频率：`operationId` 与 `reportKey`；频率限制；匿名举报登录歧义见 ADR，P0 暂按提交时登录。

### 3.14 `nfc_devices`（P2，仅规划）

- 目的：随机动态 NFC 入口与设备绑定。
- 字段：PRD 的 `deviceToken`、`ownerId?`、`mode:CURRENT_CARD|FIXED_CARD`、`fixedCardId?`、`status:UNBOUND|BOUND|DISABLED|LOST`、`displayName?`、时间字段。
- 索引/唯一：`deviceToken` 唯一且不可枚举；`ownerId+status`。
- 权限/删除：owner 管理；设备不存个人资料；解绑/注销后原资料立即不可解析。
- P0：不建集合、不开放接口、不显示入口。

### 3.15 `ai_usage`（P1，仅规划）

- 目的：AI 限额、可靠性和安全统计。
- 字段：PRD 的 `ownerId`、`requestId`、`fieldType`、`inputLength`、`outputCount`、`status:SUCCESS|FAILED|BLOCKED`、`createdAt`；可加 `providerCode`（非密钥）。
- 索引/唯一：`requestId` 唯一；`ownerId+createdAt`。
- 权限/私密：本人不直接读取；默认不保存完整输入/输出，不含联系方式、相遇和备注。
- P0：不建集合、不调用模型。

## 4. 状态机

```text
User: ACTIVE -> RESTRICTED -> ACTIVE | DELETED

Card:
DRAFT -> REVIEWING -> PUBLISHED | REJECTED
REJECTED -> REVIEWING
PUBLISHED --编辑提交--> PUBLISHED + pendingReviewContent
PUBLISHED + pending --通过--> PUBLISHED(new snapshot)
PUBLISHED + pending --拒绝--> PUBLISHED(old snapshot) + reviewFailure
PUBLISHED -> HIDDEN | DELETED
HIDDEN -> REVIEWING | DELETED

Collection: NOT_COLLECTED -> COLLECTED -> REMOVED -> COLLECTED

Greeting:
PENDING -> RETURNED | DECLINED | CANCELLED | EXPIRED
只有 PENDING -> RETURNED 原子创建/更新 Encounter

Encounter:
不存在 --Greeting RETURNED--> ACTIVE
ACTIVE --用户隐藏--> ACTIVE + hiddenForUserIds
ACTIVE -> BLOCKED
BLOCKED --双方均无有效 block--> ACTIVE

Contact:
NOT_REQUESTED -> PENDING
PENDING -> ACCEPTED | DECLINED | CANCELLED
ACCEPTED -> REVOKED
```

禁止状态：Greeting 无 `ACCEPTED`；Encounter 不由浏览/收藏/`PENDING` 创建；Contact 不在 Encounter `ACTIVE` 前创建。

## 5. 事务边界

1. 审核通过：验证冻结内容 → 创建不可变快照 → 切换 `publishedSnapshotId`/状态 → 清 pending → 审核通知。
2. 设置当前名牌：校验 owner/PUBLISHED → 清旧 `isCurrent` → 设新 → 更新 `users.currentCardId`。
3. 回赠：锁定 `PENDING` greeting → 验证回赠卡 → 创建回赠快照引用 → `RETURNED` → upsert `pairKey` encounter → 首次 event → 去重通知。
4. 接受联系方式：锁定 PENDING → 验证 receiver 及双方联系人 → 保存 receiver IDs → ACCEPTED → 去重通知。
5. 拉黑：写 block → 关闭待处理 greeting/contact → ACCEPTED contact 变 REVOKED → encounter BLOCKED/隐藏 → 禁止后续敏感读取；解除时只有双方均无 block 才恢复 encounter ACTIVE，不恢复旧请求/共享。
6. 注销：先将 user DELETED、Token/联系读取失效，再幂等清理个人活动数据；任何失败可从 deletionVersion 续跑。

## 6. 权限矩阵摘要

| 数据 | 匿名 | 本人 | 业务对方 | 其他登录用户 |
|---|---|---|---|---|
| 审核通过公开快照 | Token 可读白名单 | 可读 | 可读 | Token 可读 |
| 草稿/待审核 | 否 | 读写 | 否 | 否 |
| 收藏 | 否 | 读写自己的 | 名牌主人不可见 | 否 |
| Greeting | 否 | 参与方按角色 | 参与方按角色 | 否 |
| Encounter/共享兴趣 | 否 | 双方可读 | 双方可读 | 否 |
| 私人备注 | 否 | 仅 owner | 否 | 否 |
| 联系方式明文 | 否 | 自己全部 | 仅 ACCEPTED 且被选项 | 否 |
| 举报 | 入口可见；提交策略待确认 | 仅提交结果 | 否 | 否 |
| OpenID/审计 | 否 | 否 | 否 | 否 |

## 7. 注销、拉黑与保留

- 注销先撤销所有公开 Token、当前名牌、NFC（未来）和联系方式展示，再逻辑删除。
- 对方相遇册可保留当时快照并显示“该用户已注销”，但不能打开当前主页/联系方式。
- 拉黑关闭双方新互动和待处理请求，撤销已接受联系方式的站内展示，不通知被拉黑者，不删除举报/审计；解除后可在双方均无 block 时恢复 encounter ACTIVE，但不复活已取消请求或已撤销联系方式。
- 精确保留期限、导出/删除 SLA、通知清理期需要在上线隐私与合规评审确认，属于上线阻断前决策，不在 M0 虚构。
