# M1.2-B CloudBase development 部署运行手册

> 状态：`NOT_DEPLOYED`｜代码阶段：M1.2-B local｜环境：development
>
> 本手册只描述后续人工操作。创建集合、修改权限、注入环境变量和部署都需要产品负责人
> 单独授权；完成本地代码不代表真实云端能力通过。

## 1. 固定环境标识

| 项目 | development 值 |
|---|---|
| 小程序 AppID | `wxc061682046272324` |
| CloudBase EnvId | `cloud1-d1gh2crj26320f882` |
| 云函数运行时 | `Nodejs20.19` |
| 协议版本 | `1.0.0` |
| 隐私政策版本 | `1.0.0` |

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

## 3. 产品负责人控制台前置操作

1. 在 CloudBase development 环境的安全配置中，确认已关联
   `wxc061682046272324`。
2. 确认环境使用文档数据库，地域和计费状态正确。
3. 创建空集合：
   - `users`
   - `identity_mappings`
4. 在创建集合时或创建后立即将两个集合设置为客户端无读写权限。
5. 不创建客户端直连数据库入口，不创建 HTTP 云函数触发器。
6. 在三个函数中选择 `Nodejs20.19` 和默认入口 `index.main`。

数据库权限规则和函数调用规则的当前控制台语法必须在操作时依据官方界面确认；不得从
旧截图照抄。数据库和函数只允许关联小程序经事件型 `callFunction` 调用。

## 4. 服务端环境变量

三个函数都必须配置以下变量：

| 变量 | 值/来源 |
|---|---|
| `EXPECTED_MINIPROGRAM_APP_ID` | `wxc061682046272324` |
| `TERMS_VERSION` | `1.0.0` |
| `PRIVACY_VERSION` | `1.0.0` |
| `IDENTITY_HMAC_SECRET` | 产品负责人线下生成并保管的 development 独立随机密钥 |

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
4. 按顺序上传并选择云端安装依赖：
   - `authEnsureUser`
   - `accountGetMe`
   - `accountAcceptPolicies`
5. 不添加 HTTP 触发器，不从控制台使用伪造身份参数测试建号。
6. 部署完成后只从关联小程序调用。

本轮 M1.2-B local 不执行以上部署步骤。

## 7. development 验收

### 微信开发者工具

- App 启动调用一次 `wx.cloud.init`，环境 ID正确。
- 启动后身份仍显示 `ANONYMOUS`。
- 启动没有三个身份函数调用。
- 用户明确点击 ensure 后才创建账号。
- getMe 在未建号前返回 `USER_NOT_FOUND`，不会创建文档。
- 相同账号重复 ensure 只保留一个 user 和一个 mapping。
- 政策两版本同时写入；相同版本重放不更新时间。
- 初始化/调用失败安全降级，不白屏。
- Console 和函数日志没有 OpenID、identityKey、HMAC 密钥或原始平台错误。

### 数据和并发

- 同一微信身份 50 路并发首次 ensure 后只有一个有效 mapping/user。
- `identity_mappings` 不含 OpenID。
- 客户端直接读写两个集合均被权限拒绝。
- 精确事务冲突会退避，总尝试最多三次；非冲突错误不重试。
- 三次耗尽返回 `SERVICE_UNAVAILABLE`。
- 人工准备 RESTRICTED/DELETED 测试数据后验证限制和不重建行为。

### 真机

- iPhone 账号 A 和 Android 账号 B 分别建号，生成不同 user/mapping。
- 两端重复进入和失败重试不产生重复账号。
- 验收截图遮挡内部 userId、OpenID、日志标识和所有配置页敏感值。

## 8. NEEDS_VALIDATION

以下项目只有真实 development 环境可以解除：

- `wx-server-sdk.getWXContext()` 返回 `OPENID/APPID` 的真实形状和关联失败行为。
- `IDENTITY_HMAC_SECRET` 等函数环境变量注入。
- 文档不存在时的 SDK 返回形状。
- `DATABASE_TRANSACTION_CONFLICT` 的真实错误对象和最多三次退避。
- 跨集合事务隔离、提交和回滚。
- 数据库及函数权限规则。
- Nodejs20.19 在线安装依赖、冷启动和三个入口加载。
- 微信开发者工具、iPhone/Android 双账号行为。

这些项目全部通过并形成脱敏证据前，M1-02 必须保持 `IN_REVIEW`。

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

真实部署审查前必须重新检查官方版本与 `npm audit`，并由产品负责人决定等待上游修复或
书面接受 development 残余风险；不得使用 `npm audit fix --force` 或未经验证的 override
静默降级/替换 SDK。
