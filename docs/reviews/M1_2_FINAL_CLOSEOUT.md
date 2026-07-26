# M1.2 最终独立 Review 与 Closeout

> 日期：2026-07-27  
> 仓库：`tap-name-card`  
> 分支：`main`  
> 审查基线 HEAD：`8cc49bb`  
> 结论：`PASS`  
> M1-02：`DONE`

## 1. 范围

本报告关闭 M1.2 云环境与身份。覆盖 M1.2-A 本地身份领域层、M1.2-B CloudBase
平台接入、development 真实部署和最终人工验收。

本轮没有进入 M1.3，没有实现名牌、模板、收藏、认识请求、相遇、联系方式、AI 或 NFC，
没有 Commit 或 Push。

## 2. 最终结论

M1.2 本地实现、部署候选、真实 development 主链路、身份唯一性、政策幂等、数据库权限、
日志脱敏、HMAC 轮换和 Runtime 偏差决策均已完成。没有剩余 M1-02 blocker。

M1-02 从 `IN_REVIEW` 更新为 `DONE`。第 7 节列出的验证项有充分自动覆盖或属于后续
staging/状态夹具范围，因此记录为 `DEFERRED_VALIDATION`，不阻塞本次关闭。

## 3. development 最终配置边界

| 项目             | 已确认状态                                                       |
| ---------------- | ---------------------------------------------------------------- |
| 小程序 AppID     | `wxc061682046272324`                                             |
| CloudBase EnvId  | `cloud1-d1gh2crj26320f882`                                       |
| 云函数           | `authEnsureUser`、`accountGetMe`、`accountAcceptPolicies` 已部署 |
| 入口             | 三个函数均为 `index.main`                                        |
| Runtime          | 三个现有函数均为 `Nodejs16.13`；ADR-032 development-only 偏差    |
| 政策版本         | `TERMS_VERSION=v1`、`PRIVACY_VERSION=v1`                         |
| 集合             | `users`、`identity_mappings`                                     |
| 客户端数据库权限 | 两个集合均为所有客户端不可读写                                   |
| 调用权限         | 已从排障期间临时开放状态收紧；关联小程序三个函数调用均通过       |
| HTTP/公网入口    | 未开放                                                           |

三个函数均配置 `IDENTITY_HMAC_SECRET`、`EXPECTED_MINIPROGRAM_APP_ID`、
`TERMS_VERSION`、`PRIVACY_VERSION`。报告只记录 Key，不记录 Value。

development `IDENTITY_HMAC_SECRET` 已轮换，三个函数使用同一个新 Secret；Secret 未进入
仓库、日志、截图或验收记录。旧 development 测试身份数据已清理后重新建立。

## 4. 真实 CloudBase 验收

| 验收项                              | 结果 | 证据摘要                                   |
| ----------------------------------- | ---- | ------------------------------------------ |
| `authEnsureUser`                    | PASS | 真实调用成功，显式操作才建号               |
| `accountGetMe`                      | PASS | 真实调用成功，不额外调用 ensure            |
| `accountAcceptPolicies`             | PASS | `v1/v1` 连续确认两次成功                   |
| 政策幂等                            | PASS | 第二次 `replayed=true`，用户状态未改变     |
| CurrentUserView                     | PASS | 白名单通过，不含服务端私有字段             |
| ensure ×5                           | PASS | 成功 5、失败 0、不同 userId 数量 1         |
| 干净身份首次 ensure ×20             | PASS | 成功 20、失败 0、不同 userId 数量 1        |
| 首次并发数据库结果                  | PASS | `users=1`、`identity_mappings=1`           |
| 后续身份/政策验收                   | PASS | 两个集合记录数量未增长                     |
| mapping 引用                        | PASS | `mapping.userId` 指向存在的 user           |
| mapping 正文                        | PASS | 仅契约字段，不保存原始 OpenID              |
| users 客户端 read/write             | PASS | 两项均被 `DATABASE_PERMISSION_DENIED` 拒绝 |
| identity_mappings 客户端 read/write | PASS | 两项均被 `DATABASE_PERMISSION_DENIED` 拒绝 |
| 匿名启动                            | PASS | 只初始化 CloudBase，不自动调用三个身份函数 |
| 安全降级                            | PASS | 未配置/调用失败不白屏、不伪装成功          |

真实首次并发是在 `users=0`、`identity_mappings=0` 的干净状态直接执行，不是已有账号的
重复调用。页面只统计次数、成功/失败和不同 userId 数量，不展示实际 userId。

## 5. 安全与日志

产品负责人已抽查三个身份函数最新真实调用日志：

- 无 OpenID；
- 无 identityKey；
- 无 HMAC Secret；
- 无完整 Error 对象；
- 无 stack；
- 无临时排障输出；
- 只保留安全公开日志信息。

CurrentUserView、客户端状态、development-only 探针和错误映射均不展示 OpenID、
identityKey、HMAC、接受时间、完整数据库记录或 SDK 原始错误。

## 6. Runtime 决策

M1.2 原目标 Runtime 为 `Nodejs20.19`。CloudBase 控制台无法修改三个 existing function
的 Runtime；两次 CLI canary 均报告更新成功但云端回读仍为 `Nodejs16.13`。底层 SCF
官方 API 说明 Runtime 创建时指定，目前不支持修改。

静态兼容性审计、生产依赖 engines 和真实 development 主链路均未发现 Node 16.13
兼容性阻断，因此 ADR-032 将该问题记录为
`ACCEPTED_DEVELOPMENT_DEVIATION`。不删除或重建已验证的 development 身份基础设施。

该偏差不得复制到 staging/production。新建 staging/production 函数必须显式选择
`Nodejs20.19` 或届时批准的更新 LTS Runtime，并重新执行完整 Runtime、SDK、构建、
安全和真实主链路验收。

## 7. DEFERRED_VALIDATION

以下项目不阻塞 M1-02：

- RESTRICTED 用户真实数据库状态测试；
- DELETED 用户真实数据库状态测试；
- iPhone/Android 不同微信账号 smoke；
- 精确 `DATABASE_TRANSACTION_CONFLICT` 平台错误对象与退避日志观察；
- staging/production 前升级已修复的官方 SDK，或重新评估当前 advisory。

RESTRICTED/DELETED 行为、最多三次冲突重试和非冲突不重试已有自动测试。真实干净身份
首次 20 路并发已验证最终唯一结果；双端真机和 SDK 上线风险属于后续 staging/发布门禁。

## 8. 最终自动门禁

2026-07-27 在仓库根目录真实执行：

| 命令                                        | 结果                               |
| ------------------------------------------- | ---------------------------------- |
| `npm.cmd run shared:check`                  | PASS；两套各 21 个 shared 镜像一致 |
| `npm.cmd run format:check`                  | PASS                               |
| `npm.cmd run lint`                          | PASS                               |
| `npm.cmd run typecheck`                     | PASS                               |
| `npm.cmd test`                              | PASS；19 个文件、107 项测试        |
| `npm.cmd run cloudfunctions:check`          | PASS；三个函数构建并加载           |
| `npm.cmd run cloudfunctions:check:isolated` | PASS；三个生产依赖包隔离安装并加载 |
| `git diff --check`                          | PASS                               |

文档更新完成后必须再次执行同一组门禁；最终结果以 Closeout 交付回复为准。

## 9. 关门状态

- M1.2-A 独立审查：`PASS`
- M1.2-B 本地代码独立审查：`PASS`
- Runtime deviation：`ACCEPT_DEVIATION`
- M1.2 最终 Closeout：`PASS`
- M1-02：`DONE`
- M1.3：`NOT_STARTED`

代码、测试、development-only 验收工具、ADR、运行手册和本报告可作为一个 M1.2
closeout 提交范围。提交前不得加入 Secret、OpenID、`project.private.config.json`、
`node_modules` 或生成缓存。
