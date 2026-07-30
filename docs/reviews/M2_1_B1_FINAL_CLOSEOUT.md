# M2.1-B1 Final Closeout

> 版本：v1.0  
> 日期：2026-07-30  
> Verdict：`PASS`  
> 状态：M2.1 `IN_PROGRESS`；M2.1-A `DONE`；M2.1-B `IN_PROGRESS`；
> B1 `DONE`；B2/B3 `NOT_STARTED`；M2.1-C `NOT_STARTED`

## 1. Purpose

本记录关闭 M2.1-B1 Renderer Foundation，固化实现边界、failure design、自动与人工验证、
review 证据、package observation 和 deferred scope。它不关闭 M2.1-B 或 M2.1，不授予
B2、B3 或 M2.1-C implementation 权限。

## 2. Approved Scope

B1 获批范围是 renderer foundation：

- `prepareCardRender`、capability enforcement、`PreparedCardViewModel`；
- `RendererKey`/bindings、公共 `CardRenderer` shell；
- fixture architecture、Foundation development-only Renderer Lab；
- automated tests；
- 为静态 dispatch 建立六个最小 child renderer shells。

## 3. Implemented Scope

已完成：

- single public `CardRenderer` entry；
- raw unknown single ingress；
- typed、pure、deterministic、local、renderer-neutral preparation；
- exact template resolution 和 static renderer binding；
- capability consistency enforcement；
- ready/failure component projection 与 stale-state cleanup；
- 六个 isolated minimal child renderer shells；
- 24 个 official fixtures 与 development-only Renderer Lab；
- architecture invariant tests；
- WeChat DevTools runtime smoke 和 native package measurement。

## 4. Architecture Decisions

B1 保持 `RenderModel v1`，不创建第二套 domain model，不引入 persistence、service、route、
identity、network、time 或 CloudBase dependency。相同合法输入与相同 template capability
definition 产生确定结果。image ratio `1:1 | 3:4 | 4:3` 只属于 renderer/component
presentation primitives。

## 5. Raw Ingress and Trust Boundary

唯一正式链路为：

```text
raw unknown
→ parseCardRendererInput
→ parseRenderModel
→ typed RenderModel
→ prepareCardRender
→ exact resolution
→ capability enforcement
→ PreparedCardViewModel
→ exact RendererKey
→ static WXML branch
→ one child renderer
```

`prepareCardRender` 接受 typed `RenderModel`，不解析 raw。official fixture presentation
path 和 child renderers 不解析 raw，也不存在绕过 parser 的正式 fixture path。

## 6. Failure Taxonomy

| Failure kind              | Reasons                                                                                                      |
| ------------------------- | ------------------------------------------------------------------------------------------------------------ |
| `DOMAIN_INVALID`          | `INVALID_RENDER_MODEL`                                                                                       |
| `RESOLUTION_FAILURE`      | `UNKNOWN_TEMPLATE`、`CATEGORY_MISMATCH`、`UNSUPPORTED_VERSION`、`MISSING_RENDERER_BINDING`                   |
| `CAPABILITY_INCOMPATIBLE` | `MISSING_REQUIRED_MODULE`、`UNSUPPORTED_VISIBLE_MODULE`、`DUPLICATE_VISIBLE_MODULE`、`EMPTY_REQUIRED_MODULE` |

只有 `parseRenderModel` 可以决定 domain validity。capability enforcement 不扩大或重定义
M2.1-A semantics。所有失败都不产生 Prepared VM、不进入 child renderer；unknown/mismatch/
missing binding 不 fallback 到 Apple、同 category、旧版本或 generic visual renderer。

## 7. PreparedCardViewModel

最终公共字段严格为：

```ts
interface PreparedCardViewModel {
  readonly identity: RenderIdentity;
  readonly modules: readonly RenderModule[];
}
```

它只表示已通过 resolution、capability、normalization 和 safety preparation 的 common safe
projection。capability 临时状态、persistence/account/resolution state、hero/column/panel
layout、decorative coordinates、tape rotation、CSS-like metadata、image ratio 和
renderer-specific prepared data 均不进入该 contract。

## 8. Renderer Binding

六个 template ID 精确映射到六个 `RendererKey`。TypeScript binding、parent component
declaration 和 WXML static branch 保持一致；ready state 只 mount 一个 child。failure state
显式投影 `rendererKey=''`、`viewModel=null`，覆盖微信 `setData` merge 后的 stale cleanup。

## 9. Fixture Architecture

official matrix 是六模板 × 四场景：

- `NORMAL`
- `LONG_TEXT`
- `MISSING_IMAGE`
- `MINIMAL_OPTIONAL_CONTENT`

共 24 个，每个必须 `parseRenderModel PASS + capability PASS` 后才能 preparation。
`MISSING_IMAGE` 是合法 model 中 optional image absent/display fallback，不使用 parser-invalid
image、网络失败或 URL probing。required missing/hidden、visible unsupported、duplicate
visible semantic modules 和 required empty effective content 属于 test-only negative
capability fixtures，不能进入 Prepared VM 或 child。

## 10. Renderer Lab

Renderer Lab 只存在于 Foundation development harness，template/scenario switching 纯本地且
确定性，不形成 route contract、gallery/product preview、saved selection、product state、
identity refresh、persistence、storage mutation、navigation、remote request 或 CloudBase
side effect。删除 Lab 后 renderer architecture 保持完整。

## 11. Architecture Invariant Tests

本次新增测试明确证明：

- domain/capability separation；
- invalid/resolution/capability failure 不进入 Prepared VM 或 renderer；
- single raw parse boundary；
- no Apple/category/version/generic fallback；
- Prepared VM renderer-neutral；
- exact binding chain、TS/WXML consistency 和 single-child dispatch；
- fixture parser enforcement、24 official fixture success 与 negative fixture isolation；
- ready→failure→ready 和 stale renderer state cleanup；
- Lab zero-side-effect；
- required `PHOTO_GALLERY items=[]` 在 parser boundary 拒绝。

zero-photo negative debt 的 B1 foundation 语义已通过可执行 parser negative test 关闭。
zero-photo/no-image 的最终视觉质量明确 defer 到 B2/B3。

## 12. Automated Checks

最终基线：

- 31 个测试文件；
- 244 项测试；
- `npm.cmd run shared:check`：PASS；
- `npm.cmd run format:check`：PASS；
- `npm.cmd run lint`：PASS；
- `npm.cmd run typecheck`：PASS；
- `npm.cmd test`：PASS；
- `npm.cmd run cloudfunctions:check`：PASS；
- `npm.cmd run cloudfunctions:check:isolated`：PASS；
- `git diff --check`：PASS。

## 13. Independent Architecture Review

Independent Architecture Review：`PASS / NO BLOCKING FINDINGS`。初次 non-blocking concerns
是 exact binding chain hardening 与 stale cleanup；修复后 focused re-review 通过。

由于 B1 在 closeout 时仍是未提交工作区，无法仅凭 Git reconstruct 精确 post-review delta；
reviewer 已直接复审七个 post-review-sensitive files 和最终行为。该事实是 review evidence
说明，不构成 unresolved risk。

## 14. DevTools Manual Gate

真实环境：

- WeChat DevTools Stable `v2.01.2510290`；
- base library `3.17.0`。

实际结果：

- compile：PASS；
- `CardRenderer` mount：PASS；
- six renderer shell dispatch：PASS；
- 24/24 fixture/scenario matrix：PASS；
- ready→failure 与 failure→ready：PASS；
- rendererKey/viewModel stale-state cleanup：PASS；
- Renderer Lab local switching：PASS；
- Lab identity/network/database/storage mutation：0。

没有执行 Preview、Upload 或发布。该 gate 不是 mock/unit-only，也不代表 B2/B3 正式视觉
validation。

## 15. Platform Compatibility Fix

DevTools runtime smoke 发现微信运行时未解析部分 directory-style runtime imports。修复为
explicit file/index imports 后重新通过 manual gate。这是预期的平台兼容修正，没有增加
parser、test/runtime split、shared contract、CloudBase integration 或 scope。

## 16. Post-DevTools Re-Review

平台修复后 Independent Post-DevTools Re-Review 结论：

`PASS / NO BLOCKING FINDINGS / B1_FINAL_CODE_REVIEWED`

exact binding chain 与 stale cleanup 的最终实现均已复核。

## 17. Native Package Evidence

- DevTools native included：98 files，139,796 bytes（约 136.52 KiB）；
- DevTools display：137 KB；
- full miniprogram raw：140,333 bytes（约 137.04 KiB）；
- B1 raw delta：约 33.27 KiB；
- binary media：0；
- no subpackages；
- no oversized or duplicate binary asset。

内部 package 数字仅是 target/review threshold，不是缺少平台依据的机械 DoD blocker。

## 18. CloudBase and Identity Impact

CloudBase Impact：`NONE`。

B1 没有修改 Cloud Function、collection、storage、permission、environment、deployment、
identity contract 或 cold-start identity behavior。Renderer Lab 的 identity/network/
database/storage mutation 均为 0。

CloudBase manual validation：`N/A because impact NONE`，不是“CloudBase validation PASS”。

## 19. Accepted Non-Blocking Notes

- Foundation fixtures 与 Renderer Lab 因当前 development harness 位于 main package；
  release 前应重新评估是否 subpackage/strip，但本 closeout 不做重构。
- DevTools console 出现 `getSystemInfoSync` deprecated warning；未影响 B1 compile、
  renderer dispatch 或 state transition。
- package targets 是观察阈值；不得为追逐人为数字明显降低安全原创视觉质量。

## 20. Deferred and Excluded Scope

未启动并保持 deferred：

- B2：Apple Minimal、Magazine、Scrapbook、Anime Role 四套 Social 正式视觉；
- B3：Professional、Project Portfolio 两套 Resume 正式视觉；
- Gallery、Product Preview、product routes、M2.1-C；
- Editor、Card persistence/draft/publish/upload/share；
- Collection、Greeting、Encounter、Contact、Analytics、AI、NFC。

B1 六个 child renderers 均为 minimal shells，不是 formal visual renderer。

## 21. Final Status

- M2.1：`IN_PROGRESS`
- M2.1-A：`DONE`
- M2.1-B：`IN_PROGRESS`
- M2.1-B1：`DONE`
- M2.1-B2：`NOT_STARTED`
- M2.1-B3：`NOT_STARTED`
- M2.1-C：`NOT_STARTED`

## 22. Next Gate

下一步仅为 M2.1-B1 Final Closeout Review。B1 closeout 通过后，B2 仍必须获得独立、明确的
implementation approval；不得自动开始 B2、B3 或 M2.1-C。

最终 Verdict：`PASS`
