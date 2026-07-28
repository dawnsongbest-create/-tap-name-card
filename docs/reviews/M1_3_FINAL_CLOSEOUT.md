# M1.3 Final Closeout

> 日期：2026-07-28
> 仓库：`tap-name-card`
> 分支：`main`
> 审查基线 HEAD：`0e5bcbf`
> Verdict：`PASS`

## Scope

### M1.3-A Runtime Safety Boundary

建立客户端远端响应安全边界：

```text
CloudBase response
→ CloudFunctionResult runtime validation
→ endpoint-specific success DTO parser
→ whitelist DTO
→ application state
```

### M1.3-B Minimal PageState

建立七种 canonical PageState：

`ready | loading | empty | network-error | forbidden | not-found | unavailable`

只有 `network-error` 和 canonical `unavailable` 显示 Retry。retry 只是 UI intent；
unknown/invalid input 使用 `kind=unavailable`、`isError=true`、`showRetry=false` 的
无 action 安全 fallback。

## Implemented

M1.3-A：

- 最小 runtime validation primitives：object、string、number、boolean、enum、optional
  和白名单 projection；
- `CloudFunctionResult` envelope、success/failure 字段组合、requestId、canonical
  `ErrorCode`、failure `error.message` 运行时验证；
- 远端错误和 malformed response 安全归一化，使用本地 canonical 安全文案；
- `authEnsureUser`、`accountGetMe`、`accountAcceptPolicies` 三个 endpoint-specific
  success DTO parser；
- `CurrentUserView` 和政策确认结果白名单重建，丢弃 `openId`、`identityKey`、内部时间和
  其他未知字段；
- 保持三个身份云函数服务端 wire contract 与实现不变，App cold start 仍只初始化
  CloudBase。

M1.3-B：

- 扩展既有 `components/page-state`，没有建立第二套状态机制；
- 七种 canonical PageState、本地安全文案、错误/重试可见性；
- retry 每次只产生一个组件 intent，不直接发请求；
- unknown/invalid 不反射输入、不显示 Retry、不产生 action；
- Foundation development-only 七状态、非法状态 fallback 和 retry 计数验证入口；
- M1.2 身份、政策、并发和数据库权限验证工具保持可用。

根 `shared/` 继续作为唯一 shared source；`miniprogram/shared/` 和
`cloudfunctions/shared/contracts/` 由同步工具生成并通过镜像一致性检查。

## Explicitly Deferred

以下能力没有在 M1.3 实现，按 YAGNI / first real consumer 原则延后，不属于 M1.3
blocker：

- analytics；
- automatic retry、exponential backoff；
- timeout、`UNKNOWN_AFTER_TIMEOUT`；
- operation state machine；
- skeleton system；
- P25 login prompt；
- cloud-function middleware framework；
- Template/Card/Greeting/Encounter/Contact 领域 schema 或功能；
- staging integration。

## M1.3-A Review History

```text
Implementation
→ Independent Review
→ HIGH/MEDIUM Findings
→ Fix Round 1
→ Re-Review PASS
→ Manual Validation PASS
→ Final Independent Review PASS
```

- HIGH：failure envelope 未验证 contract 必填的 `error.message`；修复后要求其存在且为
  string，但仍丢弃远端内容并使用本地安全文案。
- MEDIUM：补齐 table-driven malformed-envelope regression matrix，覆盖 envelope
  类型、字段缺失/冲突、未知错误码、非法 requestId 和错误 message。
- 修复后 M1.3-A 基线：22 个测试文件、145 项测试。

## M1.3-B Review History

```text
Implementation
→ Independent Review
→ MEDIUM Finding
→ Fix Round 1
→ Re-Review PASS
→ Manual Validation PASS
→ Final Independent Review PASS
```

- MEDIUM：unknown/invalid PageState 不应继承 canonical `unavailable` 的 Retry。
- 修复后 unknown/invalid 保持 unavailable-looking 本地安全视觉，但
  `showRetry=false`，Foundation 非法状态 demo 不绑定 retry。
- 最终 M1.3 基线：23 个测试文件、161 项测试。

## Manual Validation

M1.3-A development compatibility smoke：

- `ensureUser`：PASS；
- `getMe`：PASS；
- policy：PASS；
- replay：PASS；
- identity/policy automatic validation：PASS；
- 真实 development 身份 response 与客户端 runtime boundary 兼容：PASS。

M1.3-B 微信开发者工具：

- seven canonical states：PASS；
- correct retry visibility：PASS；
- invalid safe fallback、不反射且无 action：PASS；
- retry once → one intent：PASS；
- anonymous startup：PASS；
- M1.2 development-only tools preserved：PASS。

## Automated Gates

2026-07-28 在仓库根目录最终执行：

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

## Security / Privacy

- `openId`、`identityKey` 和内部时间字段不进入客户端业务 DTO/state；
- 远端 `message/details/stack`、SDK 原始异常和未知字段不透传到安全结果或 UI；
- malformed response fail closed，success parser 不接受 malformed envelope；
- failure `error.message` 必须符合 wire contract 的存在/类型要求，但内容不被信任、展示或记录；
- PageState 不依赖 CloudBase/auth，unknown/invalid 不产生 retry intent；
- App cold start 保持匿名，只初始化 CloudBase，不自动 ensure/getMe/acceptPolicies 或建号。

## CloudBase Impact

M1.3 没有：

- deployment；
- new cloud function；
- collection/database change；
- permission change；
- environment variable change；
- Secret change；
- Runtime change。

三个 M1.2 身份云函数服务端 contract 和实现保持不变。

## Deferred

首次真实消费者路由：

- analytics → 首个真实产品事件及同意/隐私边界 Sprint；
- timeout/automatic retry/`UNKNOWN_AFTER_TIMEOUT`/operation state → 首个真实读写操作 Sprint；
- skeleton → 首个真实产品页面布局 Sprint；
- P25 login prompt → 首个匿名用户主动互动 Sprint；
- middleware abstraction → 多个真实领域云函数出现后；
- Template/Card schema → M2.1 及后续对应领域 Sprint；
- staging integration → M1.4。

这些是明确排期，不写成技术债或未完成 blocker。

## Non-blocking Notes

- runtime number parser 没有单独的 `NaN` 独立测试 case；
- 当前 `Number.isFinite` 同时拒绝 `NaN`、`Infinity` 和 `-Infinity`；
- Final Review 将该项判定为 LOW / non-blocking，不因此修改已通过 Review 的代码。

## Final Status

- M1.3-A：`PASS`
- M1.3-B：`PASS`
- M1.3 Final Independent Review：`PASS`
- M1-03：`DONE`
- M1-04：`NOT_STARTED`
- blocker：`NONE`

本 Closeout 不开始 M1.4 或 M2，不包含 Commit 或 Push。M1.3 implementation、tests 和
closeout docs 可作为后续产品负责人批准的安全提交范围。
