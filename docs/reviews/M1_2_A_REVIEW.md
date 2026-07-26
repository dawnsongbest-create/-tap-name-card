# M1.2-A 本地实现独立代码审查

> 日期：2026-07-25  
> 审查范围：M1.2-A 本地身份实现  
> M1.2-A 审查结论：`PASS`  
> 整体 M1-02 状态：`IN_REVIEW`，等待 M1.2-B development CloudBase 验收

> 历史快照说明：上述整体状态是 2026-07-25 M1.2-A 关门时的结论。M1.2-B 后续已完成，
> 当前最终状态见 [`M1_2_FINAL_CLOSEOUT.md`](./M1_2_FINAL_CLOSEOUT.md)：M1-02 `DONE`。

## 1. 范围与基线

本次只审查和修复 M1.2-A，不包含真实微信身份适配、CloudBase 环境连接、集合创建、
数据库规则、可部署云函数入口或 M1.3 及后续业务。

审查开始时 Git 状态恰好包含 75 个修改文件：

- 24 个已跟踪修改。
- 51 个未跟踪文件。
- 其中 29 个是由根 `shared/` 生成或更新的运行时镜像文件。
- 其余文件是身份契约、服务端本地领域/仓储、三个处理器、客户端状态/探针、自动测试、
  工具链及直接相关文档。

逐项检查后，75 个初始文件均属于 M1.2-A。审查修复新增一个客户端边界测试文件；本审查
记录是另一个新增文件，因此最终工作区文件数会高于初始 75，属于本轮授权范围。

## 2. 审查发现与修复

### 2.1 内存仓储未显式防止内部 userId 碰撞覆盖

- 风险：不同 identityKey 若收到相同的内部 userId，`Map.set` 会覆盖已有用户，不能真实模拟
  数据库 create 冲突。
- 修复：`createIdentityAtomically` 同时检查 identityKey 与 userId；任一冲突都抛出
  `TransactionConflictError`，不写入 mapping 或覆盖 user。
- 回归：新增 userId 碰撞测试，确认原用户保持不变、第二个 mapping 不存在。

### 2.2 客户端三个身份接口缺少直接请求边界测试

- 风险：现有服务端输入测试能拒绝伪造身份，但不能直接证明客户端没有发送 openId、userId
  或 operationId。
- 修复：新增 recording caller 单元测试，逐项断言三个函数名、输入与 requestId；
  `authEnsureUser/accountGetMe` 输入严格为空，政策接口只发送两个版本字段。

### 2.3 开发者工具验证文档仍有旧状态

- 风险：README、ARCHITECTURE 和 ADR-023 仍写“待开发者工具验证”，与 M1.1 及本次
  M1.2-A 人工验证事实冲突。
- 修复：记录两轮人工编译结论，将 ADR-023 更新为 `ACCEPTED`；真实 CloudBase 能力仍保持
  `NEEDS_VALIDATION`。

### 2.4 回归断言补强

- `CurrentUserView` 初建响应使用字段键白名单断言。
- RESTRICTED 用户除 getMe/政策确认外，重复 ensureUser 也必须保持 RESTRICTED。

## 3. 二十项重点检查

|   # | 检查项                      | 结论与证据                                                                                                            |
| --: | --------------------------- | --------------------------------------------------------------------------------------------------------------------- |
|   1 | 初始 75 个修改文件范围      | `PASS`；24 tracked + 51 untracked，逐类均为 M1.2-A；无名牌、社交、AI、NFC                                             |
|   2 | App 启动匿名                | `PASS`；`app.ts` 仅读取环境并记录启动，页面初值 `ANONYMOUS`；自动测试及人工验证均确认不调用 ensureUser                |
|   3 | 三接口职责独立              | `PASS`；三个独立 handler/client method；ensure 创建、getMe 只读、acceptPolicies 只确认政策                            |
|   4 | CurrentUserView 私有字段    | `PASS`；客户端契约只有 userId、状态、当前卡引用、政策版本、needsPolicyAcceptance、createdAt；无 openId/服务端记录     |
|   5 | 客户端身份不能授权          | `PASS`；空输入解析器拒绝任意字段，政策解析器只允许两个版本；新增客户端请求边界测试                                    |
|   6 | identityKey 只在服务端生成  | `PASS`；HMAC 实现仅位于 `cloudfunctions/shared/auth`；客户端树扫描无 openId/HMAC/identityKey 生成代码                 |
|   7 | 无硬编码/default/Git 密钥   | `PASS`；服务必须注入非空 `identityHmacSecret`，没有默认值；仓库只有明确标注的合成测试 secret                          |
|   8 | ACTIVE/RESTRICTED/DELETED   | `PASS`；初建 ACTIVE；RESTRICTED 可读取和确认政策但不解除；DELETED 不进入 CurrentUserView                              |
|   9 | DELETED 统一错误且不重建    | `PASS`；ensure/getMe/acceptPolicies 均返回 `ACCOUNT_DELETED`；用户和 mapping 数量保持 1/1                             |
|  10 | 政策同时确认/版本/幂等      | `PASS`；输入必须同时包含两个版本；两版本及两个时间原子更新；旧/混合版本拒绝；同版本 replay 不改时间                   |
|  11 | getMe 不建号                | `PASS`；只调用 find，缺失返回 `USER_NOT_FOUND`，无 create 路径                                                        |
|  12 | 同身份并发防重              | `PASS`；50 路 `Promise.all` 经过事务队列争用，结果只有同一 userId，最终 1 user/1 mapping                              |
|  13 | 最多三次冲突处理            | `PASS`；两次冲突后按 10/20ms 退避并在第三次成功；三次冲突耗尽返回 `SERVICE_UNAVAILABLE` 且零写入                      |
|  14 | OpenID 泄露面               | `PASS`；响应字段白名单、客户端契约扫描、合成测试快照和既有日志脱敏测试均通过；本阶段没有客户端身份缓存                |
|  15 | shared 与镜像一致           | `PASS`；`shared:check` 验证根 shared 的 21 个 TS 文件与 miniprogram/cloudfunctions 两套镜像一致                       |
|  16 | 未配置 CloudBase 降级       | `PASS`；使用明确的 unconfigured caller 返回 `SERVICE_UNAVAILABLE`；无 wx.cloud/SDK 调用；人工验证无白屏/崩溃          |
|  17 | 文档一致性                  | `PASS`；README、ARCHITECTURE、DATA_MODEL、API_SPEC、TEST_PLAN、TASKS、ADR 已与实现及人工验证同步                      |
|  18 | 范围外/未使用/重复/过度设计 | `PASS`；无业务功能；内存仓储和 static identity provider 仅为本地测试边界；运行时镜像由单一根源生成                    |
|  19 | 敏感与依赖文件跟踪          | `PASS`；project.private.config.json、node_modules、miniprogram_npm、.env、密钥文件均未被 Git 跟踪并受 ignore 规则保护 |
|  20 | M1-02 状态                  | `PASS`；`docs/TASKS.md` 继续为 `IN_REVIEW`，明确只有 M1.2-B development 验收后才能 DONE                               |

## 4. 自动化检查

修复后最终执行：

| 命令                       | 结果                                                |
| -------------------------- | --------------------------------------------------- |
| `npm.cmd run shared:check` | PASS；两套镜像各 21 个 TypeScript 文件一致          |
| `npm.cmd run format:check` | PASS                                                |
| `npm.cmd run lint`         | PASS                                                |
| `npm.cmd run typecheck`    | PASS                                                |
| `npm.cmd test`             | PASS；12 个测试文件、47 项测试                      |
| `git diff --check`         | PASS                                                |
| `git status --short`       | 已执行；只包含 M1.2-A、审查修复和本审查记录，未提交 |

## 5. 微信开发者工具人工验证

人工验证已确认：

- foundation 页面和 Loading、Empty、Error、Retry 正常。
- Retry 计数正常增加。
- M1.2-A 手动身份探针正常显示。
- App 启动保持 ANONYMOUS，未自动调用 authEnsureUser。
- 未配置 CloudBase 时页面正常运行，ensureUser/getMe 安全降级。
- Console 无红色代码错误；仅有基础库和资源预加载提示。

## 6. M1.2-B 保留项

以下不影响 M1.2-A `PASS`，但整体 M1-02 在完成前必须验证：

- development CloudBase 环境、可信微信 OpenID 上下文和服务端环境变量。
- 四环境 HMAC 密钥隔离、真实 `users/identity_mappings` 集合及权限规则。
- CloudBase 真实事务、冲突错误识别、最多三次退避和并发建号。
- 三个可部署云函数入口、开发者工具联调及 iPhone/Android 双账号冒烟。

## 7. 最终结论

**M1.2-A 本地实现：`PASS`。**

未发现未修复的 M1.2-A 阻断问题，没有连接或伪装真实 CloudBase 能力，没有进入 M1.2-B、
M1.3 或任何名牌、社交、AI、NFC 范围。

**整体 M1-02：继续 `IN_REVIEW`。只有 M1.2-B 真实 development CloudBase 验收通过后，
才允许更新为 `DONE`。**
