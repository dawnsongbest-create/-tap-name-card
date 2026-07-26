# M1.2 CloudBase development 部署与验收运行手册

> 状态：`DEPLOYED_VALIDATED`｜代码阶段：M1.2 final｜环境：development
>
> 本手册记录当前已验证 development 状态，并约束后续重部署、回滚和
> staging/production 接入。任何新的集合、权限、环境变量、部署或数据操作仍需产品负责人
> 单独授权。

## 1. 固定环境标识

| 项目             | development 值                                          |
| ---------------- | ------------------------------------------------------- |
| 小程序 AppID     | `wxc061682046272324`                                    |
| CloudBase EnvId  | `cloud1-d1gh2crj26320f882`                              |
| 现有云函数运行时 | `Nodejs16.13`（ADR-032 development accepted deviation） |
| 协议版本         | `v1`                                                    |
| 隐私政策版本     | `v1`                                                    |

AppID 和 EnvId 是客户端可见的环境标识，不是授权凭证。不得在本手册、Git、截图或聊天中
记录 AppSecret、OpenID、`IDENTITY_HMAC_SECRET` 或其他凭据。

## 2. 部署前本地门禁

在仓库根目录执行：

```powershell
npm.cmd ci
npm.cmd run shared:check
npm.cmd run format:check
npm.cmd run lint
npm.cmd run typecheck
npm.cmd test
npm.cmd run cloudfunctions:check
npm.cmd run cloudfunctions:check:isolated
git diff --check
```

`cloudfunctions:check` 必须确认三个函数均能构建和加载，且生成的 `index.js` 不跨函数目录
引用。`cloudfunctions:check:isolated` 必须在系统临时目录按锁文件安装生产依赖并加载
三个入口，不能借用仓库根 `node_modules`。生成的 `index.js` 被 Git 忽略，但必须在
上传前重新构建。

## 3. 当前控制台状态

1. CloudBase development 环境已关联 `wxc061682046272324`。
2. `users` 与 `identity_mappings` 已创建，均设置为所有客户端不可读写。
3. `authEnsureUser`、`accountGetMe`、`accountAcceptPolicies` 已部署，入口保持
   `index.main`；最终 invoke 规则已从排障期间的临时开放状态收紧，关联小程序真实调用
   仍全部通过。
4. 未创建 HTTP 或其他公网调用入口，客户端不得绕过云函数直接访问身份集合。
5. 三个现有 development 函数运行 `Nodejs16.13`。根据 ADR-032 不再尝试修改 existing
   function Runtime，也不为切换 Runtime 删除重建已验证函数。
6. staging/production 新建函数必须显式选择 `Nodejs20.19` 或届时批准的更新 LTS
   Runtime，不得复制 development 的 Nodejs16.13 偏差。

数据库权限规则和函数调用规则的当前控制台语法必须在操作时依据官方界面确认；不得从
旧截图照抄。数据库和函数只允许关联小程序经事件型 `callFunction` 调用。

## 4. 服务端环境变量

三个函数都必须配置以下变量：

| 变量                          | 值/来源                                             |
| ----------------------------- | --------------------------------------------------- |
| `EXPECTED_MINIPROGRAM_APP_ID` | `wxc061682046272324`                                |
| `TERMS_VERSION`               | `v1`                                                |
| `PRIVACY_VERSION`             | `v1`                                                |
| `IDENTITY_HMAC_SECRET`        | 产品负责人线下生成并保管的 development 独立随机密钥 |

`IDENTITY_HMAC_SECRET` 至少使用 32 字节密码学随机值，不得由 Codex生成，不得粘贴到
源代码、命令历史、测试、日志、截图或文档。四项中任一缺失时函数应安全返回
`SERVICE_UNAVAILABLE`，不得添加默认值。

## 5. 集合结构和索引

### `users/{userId}`

服务端字段：

- `openId`
- `status`
- 可选 `currentCardId`
- 可选 `acceptedTermsVersion`、`acceptedPrivacyVersion`
- 可选 `termsAcceptedAt`、`privacyAcceptedAt`
- `createdAt`、`updatedAt`
- 可选 `deletedAt`

M1.2 不需要额外查询索引；身份定位先读取 mapping，再按 user 文档 ID 读取。客户端不得
读取该集合。

### `identity_mappings/{identityKey}`

业务字段只能是：

- `userId`
- `provider`
- `createdAt`

文档 ID 是服务端 HMAC-SHA256 identityKey。不得保存 OpenID、HMAC 密钥、政策内容或
客户端身份字段。本阶段不需要额外索引。

## 6. 构建和部署顺序

1. 重新运行 `npm.cmd run cloudfunctions:check`。
2. 人工检查每个函数目录包含：
   - `index.js`
   - `package.json`
   - `package-lock.json`
   - 对应源码/README
3. 确认 `package.json` 精确依赖：
   - `@cloudbase/node-sdk@3.18.3`
   - `wx-server-sdk@4.0.2`
   - `ws@8.21.1`
4. 新部署或重部署时按顺序上传并选择云端安装依赖：
   - `authEnsureUser`
   - `accountGetMe`
   - `accountAcceptPolicies`
5. 不添加 HTTP 触发器，不从控制台使用伪造身份参数测试建号。
6. 部署完成后只从关联小程序调用。

当前 development 已完成上述部署。后续重部署必须先通过本地门禁，且不得隐式覆盖
环境变量、调用权限、Runtime、内存、超时、触发器或其他未获授权的配置。

## 7. development 验收

### 微信开发者工具

- App 启动调用一次 `wx.cloud.init`，环境 ID 正确；启动后保持 `ANONYMOUS`，不自动调用
  三个身份函数。
- 用户明确点击后才调用 ensure；真实 `authEnsureUser`、`accountGetMe` 和
  `accountAcceptPolicies` 均通过。
- 身份与政策自动验收整体 PASS：ensure ×5 全部成功且只有一个 userId，getMe 和
  CurrentUserView 白名单通过，政策 `v1/v1` 连续确认两次通过，第二次
  `replayed=true`，用户状态未改变。
- 初始化/调用失败安全降级，不白屏；Console 无敏感错误输出。

### 数据和并发

- development HMAC Secret 已轮换，三个函数使用同一个新值；旧测试身份数据清理后重新
  建立，Secret 未进入仓库、日志、截图或验收记录。
- 在 `users=0`、`identity_mappings=0` 的干净状态首次直接执行
  `authEnsureUser ×20`：成功 20、失败 0、不同 userId 数量 1、全部一致 PASS。
- 首次并发后两个集合各只有一条记录；后续 ensure/getMe/政策验收未增加数量。
- mapping 指向存在的 user，正文仅含 `userId/provider/createdAt`，不含原始 OpenID。
- 客户端直接 read/write 两个集合的四项探针均返回
  `DATABASE_PERMISSION_DENIED`，整体 PASS。
- 三个函数最新真实日志已人工抽查，不含 OpenID、identityKey、HMAC Secret、完整
  Error、stack 或临时排障输出。

### 真机

- iPhone 账号 A 和 Android 账号 B 分别建号，生成不同 user/mapping。
- 两端重复进入和失败重试不产生重复账号。
- 验收截图遮挡内部 userId、OpenID、日志标识和所有配置页敏感值。

## 8. DEFERRED_VALIDATION

以下项目不阻塞 M1-02，但必须在对应后续里程碑继续验证：

- RESTRICTED 用户的真实数据库状态测试。
- DELETED 用户返回 `ACCOUNT_DELETED` 且 ensure 不重建的真实数据库状态测试。
- iPhone/Android 不同微信账号 smoke。
- 精确 `DATABASE_TRANSACTION_CONFLICT` 平台错误对象和退避日志观察；当前真实首次
  20 路并发的唯一结果已通过。
- staging/production 前重新执行 SDK advisory 审计，升级到已修复的官方 SDK 或重新
  完成安全评估。

M1-02 已完成真实 development 主链路、首次并发唯一性、权限、日志、HMAC 轮换和
Runtime 偏差决策，状态为 `DONE`。上述结果不得替代后续 staging/production 验收。

## 9. 回滚

- 保留上一版本函数包和环境变量配置记录，但不记录密钥值。
- 函数异常时先停止客户端调用或切回 cloud disabled 构建，不删除现有数据。
- 权限异常时恢复为客户端完全禁止。
- HMAC 密钥必须与 mapping 数据和函数版本一起回滚；不得单独更换。
- 数据修复、集合删除或密钥轮换必须单独审批。

## 10. SDK 风险门禁

2026-07-25 的函数生产锁文件 `npm audit` 对当前双职责 SDK 基线报告 6 项传递依赖公告：
1 moderate、5 high、0 critical。`wx-server-sdk` 只用于可信上下文，
`@cloudbase/node-sdk` 只用于数据库事务；代码不把客户端值用于任意外部 URL、代理、
JWT、WebSocket 实时数据库或数据库表达式，但这不能替代上游修复。

ADR-031 已书面接受仅限隔离 development 的剩余风险。staging/production 前必须重新检查
官方版本与 `npm audit`，升级到已修复版本或重新进行安全评估；不得使用
`npm audit fix --force` 或未经验证的 override 静默降级/替换 SDK。
