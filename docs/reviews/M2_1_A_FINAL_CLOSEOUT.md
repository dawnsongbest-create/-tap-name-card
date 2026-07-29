# M2.1-A Final Closeout

> 日期：2026-07-29
>
> Final Verdict：`PASS`
>
> Independent Re-Review：`PASS / NO BLOCKING FINDINGS`
>
> 状态：M2.1 `IN_PROGRESS`；M2.1-A `DONE`；M2.1-B/C `NOT_STARTED`

## 1. Purpose

本记录关闭 M2.1-A Template Domain / Schema / Registry，固化已实现边界、Review 证据、
自动门禁、deferred scope 和进入下一批次前的治理条件。本记录不关闭 M2.1 整体，也不授予
M2.1-B Implementation 权限。

## 2. Approved scope

批准范围仅包括本地模板领域契约、六模板定义、纯展示 RenderModel、最小 module contract、
runtime domain validation、本地同步 registry、v1 版本语义、category-safe fallback 和
对应自动测试。

## 3. Implemented scope

- `TemplateDefinition v1`
- `TemplateRegistryEntry`
- `RenderModel v1`
- 六模板所需最小 module contract
- runtime domain validation
- 六个稳定模板定义
- local synchronous registry
- generic registry / production catalog separation
- exact v1 version semantics
- category-safe fallback support

## 4. Files / architecture boundary

模板契约位置为 `LOCAL_DOMAIN`，只存在于 `miniprogram/templates/`。没有 root shared
contract change，也没有修改 `miniprogram/shared/` 或
`cloudfunctions/shared/contracts/` 生成镜像。

架构关系为：

- `TemplateDefinition != TemplateRegistryEntry != Preview implementation metadata`
- `RenderModel != Persistence Model`

只有出现真实第二 runtime consumer 时，才重新评估 extract to shared。M2.1-A 没有
Card、Draft、Snapshot、Persistence、Cloud DTO、Renderer、Preview fixture 或 asset
binding。

## 5. Template definitions

| Category | Stable ID | Name |
| --- | --- | --- |
| SOCIAL | `T-SOCIAL-01` | Apple Minimal |
| SOCIAL | `T-SOCIAL-02` | 杂志人物页 / Magazine |
| SOCIAL | `T-SOCIAL-03` | 手账拼贴 / Scrapbook |
| SOCIAL | `T-SOCIAL-04` | 动漫角色卡 / Anime Role |
| RESUME | `T-RESUME-01` | 极简职业卡 / Professional |
| RESUME | `T-RESUME-02` | 项目作品卡 / Project Portfolio |

## 6. RenderModel / module contract

`RenderModel v1` 是纯展示输入，不是 Card、Draft、Snapshot 或其他 persistence model。
它只承载模板/类别/身份展示信息和六模板需要的受控模块联合；未知 persistence、identity、
repository、Cloud DTO 或 renderer metadata 在 runtime parsing 时不会进入安全模型。

## 7. Registry behavior

`createTemplateRegistry` 负责 generic registry validity：

- parsing
- duplicate rejection
- fallback validity
- deterministic list/filter/get/resolve

`createProductionTemplateRegistry` 额外保证当前产品 catalog：

- exactly six templates
- stable approved IDs
- approved ordering
- 4 SOCIAL + 2 RESUME
- approved category fallbacks

因此“当前 production catalog 必须六个”不等于“registry architecture 永远只能六个”。

## 8. Validation behavior

运行时校验覆盖模板定义、registry entry、RenderModel、module discriminated content、
PRD 数量/长度约束、required/optional capability 一致性、安全 HTTPS public links、
图片布局/数量、项目和作品链接约束，以及唯一 module ID/order。Professional 的
`CURRENT_GOAL` 为 required。

## 9. Version behavior

M2.1-A 只支持精确的 `templateSchemaVersion=1`、`templateVersion=1` 和
`renderModelVersion=1`。registry 对未知模板、不支持版本和 category mismatch 返回对应
reason，并选择请求类别的安全 fallback；不会跨 SOCIAL/RESUME 回退。

## 10. Automated tests

最终基线为 27 个测试文件、217 项测试。覆盖：

- template definitions / validation
- RenderModel / module validation
- generic registry / production catalog
- category-safe fallback
- architecture boundary

最终 closeout 门禁：

- `npm.cmd run shared:check`
- `npm.cmd run format:check`
- `npm.cmd run lint`
- `npm.cmd run typecheck`
- `npm.cmd test`
- `npm.cmd run cloudfunctions:check`
- `npm.cmd run cloudfunctions:check:isolated`
- `git diff --check`

## 11. Initial Independent Review

首次 verdict：`CHANGES_REQUIRED`。

- MEDIUM：runtime domain validation incomplete
- MEDIUM：Professional `CURRENT_GOAL` incorrectly optional
- LOW：generic registry tied to six-template production catalog
- LOW：architecture boundary test robustness

## 12. Fix Round 1

已完成：

- PRD domain constraints
- Professional `CURRENT_GOAL` required
- generic / production registry split
- stronger architecture guardrail
- 21 additional tests

## 13. Independent Re-Review

Verdict：`PASS`。

Blocking findings：`NONE`。

最终 finding 状态：

- MEDIUM 1：`CLOSED`
- MEDIUM 2：`CLOSED`
- LOW 1：`CLOSED`
- LOW 2：`ACCEPTED_NON_BLOCKING`

manual domain boundary inspection：`PASS`。

## 14. CloudBase Impact

CloudBase Impact：`NONE`。没有 Cloud Function、collection、permission、environment、
Secret、Runtime、config 或 deployment mutation。

当前模板事实来源是 app-bundled local versioned production registry。
`templateList`/`templateGet` Cloud Functions 为 `DEFERRED`。只有出现 dynamic templates、
无需 app release 的模板运营、remote disable/update 或其他真实需求时才重新评估；
不得同时维护 Cloud catalog + local catalog 两个当前事实来源。

## 15. Human validation applicability

Human UI validation：`N/A for M2.1-A`。本批次没有 Anonymous Gallery、Template Preview、
CardRenderer、六个视觉 renderer、WXML/WXSS、product routing 或 visual acceptance。

CloudBase validation：`N/A because Impact NONE`。

## 16. Accepted non-blocking debt

1. `ACCEPTED_NON_BLOCKING_GUARDRAIL_DEBT`：architecture boundary automated guardrail
   可能未识别某些直接 relative import 逃逸路径；Independent Review 已确认当前实际 diff
   boundary clean。
2. `ACCEPTED_NON_BLOCKING_TEST_COVERAGE_DEBT`：PHOTO_GALLERY runtime 正确拒绝 zero
   images，但当前测试矩阵没有显式 zero-photo negative case。

两项均不在 closeout 修改代码或测试。应在 M2.1 overall closeout 前，或 M2.1-B/C
renderer/fallback tests 扩充时补齐或重新评估。

## 17. Explicitly deferred

M2.1-B：

- CardRenderer
- six visual renderers
- WXML/WXSS
- fixtures
- local preview assets
- Product/Design visual acceptance

M2.1-C：

- Anonymous Gallery
- Template Preview
- routing
- browse/select/back/switch UX

继续排除：Card persistence、Draft、Snapshot、Editor、Upload、Publish、Share、
Collection、Greeting、Encounter、Contact exchange、Analytics、AI、NFC 和 Dynamic
template platform。

## 18. Final status

- M2.1：`IN_PROGRESS`
- M2.1-A：`DONE`
- M2.1-B：`NOT_STARTED`
- M2.1-C：`NOT_STARTED`
- Final Verdict：`PASS`

M2.1-A 完成仅代表 Template Domain / Schema / Registry 完成，不代表 M2.1 整体完成。

## 19. Next gate

下一步是 M2.1-A Closeout Final Review。通过后才可 Commit、Push，并确认 working tree
clean、`main == origin/main`；随后才能独立进入 M2.1-B Preflight / Batch Gate。
M2.1-B Implementation 仍需明确批准，本 closeout 不授予该权限。
