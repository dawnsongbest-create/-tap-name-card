# M1.4 Final Closeout

> 日期：2026-07-29  
> 仓库：`tap-name-card`  
> 分支：`main`  
> 验收基线 HEAD：`6bb1d4c`  
> Verdict：`PASS`

## Purpose

M1.4 的定位是：

`M2 Entry Readiness / Foundation Acceptance Sprint`

本 Sprint 根据 M1.1、M1.2、M1.3 Closeout，当前 main HEAD 自动回归，
development CloudBase 只读核验和微信开发者工具聚焦回归，对 M1 foundation 进行最终
接受，并关闭 M2 Entry Gate。

## No Product Code Change

M1.4 没有修改产品代码、shared、miniprogram、cloudfunctions、数据库、CloudBase、
权限、Secret、Runtime、依赖、锁文件或项目配置。

CloudBase 核验全程只读，`observed drift=NONE`，`no mutation performed=YES`。

## Automated Validation

在当前 HEAD 上实际执行：

| 命令                                        | 结果                               |
| ------------------------------------------- | ---------------------------------- |
| `npm.cmd run shared:check`                  | PASS；两套各 23 个 shared 镜像一致 |
| `npm.cmd run format:check`                  | PASS                               |
| `npm.cmd run lint`                          | PASS                               |
| `npm.cmd run typecheck`                     | PASS                               |
| `npm.cmd test`                              | PASS；23 个文件、161 项测试        |
| `npm.cmd run cloudfunctions:check`          | PASS；三个函数构建并验证           |
| `npm.cmd run cloudfunctions:check:isolated` | PASS；三个生产依赖包隔离安装并加载 |
| `git diff --check`                          | PASS                               |

测试数量与 M1.3 final 基线一致，M1.4 没有增加或删除测试。

## CloudBase Read-only Validation

产品负责人在 development CloudBase 控制台只读确认：

- `authEnsureUser`、`accountGetMe`、`accountAcceptPolicies` 均存在；
- 三个入口均为 `index.main`；
- 三个现有函数保持 `Nodejs16.13`，符合 ADR-032 development-only accepted deviation；
- `IDENTITY_HMAC_SECRET`、`EXPECTED_MINIPROGRAM_APP_ID`、`TERMS_VERSION`、
  `PRIVACY_VERSION` 四个环境变量 Key 均存在；
- 非敏感政策版本为 `v1/v1`；
- invoke permissions 保持默认拒绝，三个批准身份函数要求存在 CloudBase auth identity；
- `users`、`identity_mappings` 均存在，客户端权限均为所有用户不可读写；
- 未开放 HTTP 或其他公网入口；
- observed drift：`NONE`；
- no mutation performed：`YES`。

本报告不记录、不引用也不要求查看任何 HMAC Secret 值、OpenID 或 identityKey。

## WeChat DevTools Validation

产品负责人完成聚焦回归：

- 项目正常编译：PASS；
- anonymous cold start：PASS；
- cold start 零次自动身份函数调用：PASS；
- 七种 canonical PageState：PASS；
- Retry 可见性和单击一次产生一个 intent：PASS；
- invalid input 使用无 Retry、不反射输入的安全 fallback：PASS；
- M1.2 development-only tools 保持存在且 UI 可访问：PASS；
- observed regression：`NONE`。

本轮没有重跑 M1.2 重型验收。

## M1 Foundation Acceptance

### M1_FOUNDATION_ACCEPTANCE

| 维度                    | 结果 | 证据                                                       |
| ----------------------- | ---- | ---------------------------------------------------------- |
| Engineering             | PASS | M1.1 Closeout、clean main、完整本地门禁                    |
| Identity                | PASS | M1.2 Closeout、三个身份函数与身份集合只读核验无漂移        |
| Security                | PASS | 仓库敏感项扫描、最小权限、无公网入口、客户端数据库默认拒绝 |
| Client runtime boundary | PASS | M1.3 runtime response validation 与 endpoint DTO parser    |
| Page state              | PASS | 七状态、Retry 和 invalid safe fallback 自动/人工回归       |
| CloudBase               | PASS | development 函数、入口、Runtime、Key、权限和集合只读核验   |
| Environment separation  | PASS | development 启用；local/staging/production 关闭且边界保留  |
| Testing                 | PASS | 23 个文件、161 项测试及完整构建/静态门禁                   |
| Manual validation       | PASS | CloudBase 只读核验和微信开发者工具聚焦回归                 |
| Documentation           | PASS | TASKS、计划、ADR、测试、README 与本 Closeout 同步          |
| M2 planning readiness   | PASS | M2.1 planning 边界已明确；未授予 implementation 权限       |

Verdict：`PASS`

## M2 Entry Gate

### M2_ENTRY_GATE

| #   | Gate                                                               | 状态   |
| --- | ------------------------------------------------------------------ | ------ |
| 1   | main clean，HEAD 与 origin/main 一致                               | CLOSED |
| 2   | M1.1、M1.2、M1.3 均为 `DONE`                                       | CLOSED |
| 3   | 当前 HEAD 完整自动门禁 PASS                                        | CLOSED |
| 4   | development CloudBase 只读核验无漂移                               | CLOSED |
| 5   | 匿名启动、runtime boundary、PageState 聚焦回归 PASS                | CLOSED |
| 6   | M2.1 planning 边界明确：不修改身份、不创建 cards、不实现草稿或发布 | CLOSED |
| 7   | M1.4 Closeout 和任务状态进入仓库事实来源                           | CLOSED |

M2 Entry Gate 全部关闭。该结论只允许 M2.1 进入独立 Preflight + Planning，不表示
M2.1 已经开始，也不授予 Implementation 权限。

## M2.1 Planning Boundary

M2.1 Preflight + Planning 可以覆盖：

- Template schema；
- versioned registry；
- renderer foundation；
- preview foundation。

当前 Planning 不得扩展到：

- 修改 `authEnsureUser`、`accountGetMe`、`accountAcceptPolicies`；
- 修改 `users`、`identity_mappings` 或 HMAC identity foundation；
- 创建 `cards`；
- 实现草稿或发布流程。

若出现必须修改 M1 identity foundation 的 blocker，必须停止并重新获得独立批准。

M2.1 Implementation 必须在 Planning 完成、Plan 通过 Review 并获得明确 implementation
approval 后才能开始。当前 M2.1 状态保持 `NOT_STARTED`。

## Staging Decision

```text
NOT REQUIRED BEFORE M2.1 CODING
MUST BEFORE EXTERNAL TESTING
```

未来 staging 必须具备并验证：

- isolated CloudBase environment；
- isolated App/approved WeChat configuration；
- isolated data；
- isolated HMAC Secret；
- target Node Runtime；
- SDK advisory reassessment；
- invoke/database security validation。

development 的 ADR-031 SDK accepted risk 和 ADR-032 Nodejs16.13 deviation 不得继承到
staging 或 production。

ADR-034 已取代 ADR-033 中“staging integration 仍属于 M1.4”的旧排期决定；ADR-033
其他决策保持不变。

## Deferred

以下项目没有在 M1.4 执行，不阻塞本次 Closeout：

- M1.2 的 RESTRICTED/DELETED 真实状态验证；
- 精确 `DATABASE_TRANSACTION_CONFLICT` 平台错误对象观察；
- M1.3 deferred capabilities；
- Secret Rotation、数据库 reset 和首次 ensure ×20 重型验收；
- iPhone/Android 双设备、双账号 smoke；
- staging 建设和外部测试门禁；
- CI/CD、monitoring 和后续生产运维能力。

这些项目继续由对应产品 Sprint、external testing 或 release gate 承担。

## Independent Review / Fix Round 1

M1.4 Final Independent Review Verdict：`CHANGES_REQUIRED`，无 BLOCKER/HIGH。

- MEDIUM：ADR-033 与 ADR-034 staging 排期冲突。已明确 ADR-034 部分取代 ADR-033 的
  staging scheduling decision，并保留 ADR-033 其他决定。
- MEDIUM：M2.1 权限表述过宽。已统一为仅允许独立 Preflight + Planning；Implementation
  仍需 Planning 完成、Plan Review 和明确批准，M2.1 保持 `NOT_STARTED`。
- LOW：新增 Closeout 已按仓库 Prettier 规则格式化。`DEVELOPMENT_PLAN.md` 的 HEAD
  基线和当前文件均不通过全文件 Prettier；M1.4 新增/修改段落与 Prettier 输出一致，
  未进行全文件格式 churn。

该 Fix Round 完成后进入 Independent Re-Review；当前复审已完成，Final Verdict 为 `PASS`。

## Non-blocking Notes

- `DEVELOPMENT_PLAN.md` 全文件 Prettier 差异为
  `PRE-EXISTING NON-BLOCKING BASELINE FORMAT DEBT`。
- 证据：`HEAD:docs/DEVELOPMENT_PLAN.md` 使用相同规则检查同样失败。
- M1.4 没有引入该全文件 debt；本轮只保证新增/修改段落格式正确。

## Final Status

- M1.1：`DONE`
- M1.2：`DONE`
- M1.3：`DONE`
- M1.4 / M1-04：`DONE`
- M1 Foundation：`COMPLETE`
- M2 Entry Gate：`CLOSED`
- M2.1：`NOT_STARTED`
- blocker：`NONE`

本 Closeout 不包含 Commit 或 Push，不开始 M2.1；Independent Re-Review 已完成并通过。
