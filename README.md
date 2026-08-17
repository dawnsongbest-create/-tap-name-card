# 碰卡 —— 碰一下名牌

> **用一张更有设计感的数字名牌，让介绍自己和认识别人变得更轻松。**

「碰一下名牌」是一款我从 0 到 1 设计并持续 Coding 的自我介绍与线下社交破冰微信小程序。
用户可以创建代表自己不同侧面的数字名牌，用更有设计感的卡片通过碰一碰来展示姓名、性格、兴趣、最近状态与个人经历，并在聚会、兴趣活动等线下场景中主动分享给他人，让对方先了解自己、找到共同话题，再决定是否进一步认识。

---

## Preview

> 当前首发版本包含 Apple Minimal 与 Magazine 两套视觉模板。

<img width="1560" height="591" alt="image" src="https://github.com/user-attachments/assets/9afda1a9-28ad-477e-9fab-1c64084894b3" />

---

## 为什么做这个产品？

我观察到，很多人在第一次和别人见面时，很难在几十秒内组织好语言。

真正想介绍的兴趣、经历和生活状态没有机会表达，传统自我介绍最后往往变成：

> 姓名 → 学校 → 职业 → 专业 → 结束

对于比较内向、慢热或者不擅长即时表达的人来说，**“怎么开始第一句话”本身就是一种社交摩擦。**

另一方面，现有电子名片产品大多围绕公司、职位、电话、销售线索和 CRM 设计，对年轻用户的个人表达、兴趣人格和线下破冰支持较弱。

因此我希望把：

> **临场组织语言介绍自己**

变成：

> **提前整理好自己想被别人看到的一面，在合适的时候通过丝滑的方式把它递出去。**

先表达，再互动，让最难的第一句话变得轻松一点。

---

## 产品有什么不同？

「碰卡」没有沿着“电子名片 + 联系方式”或“陌生人匹配”的方向设计，而是把 **个人表达、碰一碰、视觉设计和现实社交**作为核心。

### 01｜设计本身就是功能

名牌不仅要承载信息，也要漂亮到用户愿意主动递出、分享，甚至发布到自己的社交媒体。

目前已经完成：

- **Apple Minimal**：极简、留白、突出个人主体（持续优化中）
- **Magazine**：杂志人物特写式信息呈现（持续优化中）

### 02｜降低社交压力

浏览名牌不等于关注，也不等于建立关系。

公开浏览不会强制登录，也不会展示访客记录或自动暴露联系方式。

### 03｜现实社交优先

产品不计划做：

- 附近的人
- 滑动匹配
- 陌生人推荐流
- 粉丝数和人气榜
- 公开社交关系链

而是围绕真实场景中的认识过程设计：

```text
手机/其他NFC碰一碰
    ↓
递出名牌
    ↓
对方浏览
    ↓
认识请求
    ↓
接受并回赠名牌
    ↓
形成「相遇」
    ↓
双方愿意时再交换联系方式
```

## 产品设计思路

我把产品原则归纳为四点：

**表达优先 / 现实社交优先 / 用户控制 / 低压力互动**

一个人在不同场景中可能希望展示不同的自己，因此用户未来可以拥有多张名牌，例如：

- 朋友认识的我
- 摄影活动里的我
- 工作场景里的我
- 最近正在发生变化的我

在开发过程中，我也主动重新收敛了 MVP。

第一阶段不追求模板和功能数量，而是优先验证：

> **用户是否愿意制作、发布并真正分享一张名牌？**

因此当前核心链路是：

**Gallery → Preview → Select → Editor → Draft → Publish → Share → Anonymous View**

---

## 怎么实现？

### 技术栈

**Frontend**

WeChat Mini Program / TypeScript / WXML / WXSS

**Backend**

Tencent CloudBase / Cloud Functions / Document Database

**Engineering**

Vitest / ESLint / Prettier / TypeScript

---

### 01｜统一模板渲染系统

产品没有为 Gallery、Preview、Editor 分别写不同的名牌页面，而是建立了一套统一的渲染链路：

**RenderModel → CardRenderer → Template Renderer**

Gallery、完整预览以及未来 Editor 都可以复用同一套真实 Renderer，避免出现“预览长一个样，最终页面又是另一个样”的问题。

底层目前保留 6 套模板架构，但首发 MVP 只开放：

- **Apple Minimal**
- **Magazine**

通过独立 Launch Catalog 控制首发范围，既减少 MVP 复杂度，也保留未来增加模板的能力。

---

### 02｜Draft 与展示模型分离

用户正在编辑时，昵称、介绍、图片等内容可能还是空的，因此采用：

**CardDraftContent → Preview Projection → RenderModel → CardRenderer**

用户真实保存的数据与最终展示模型分离。

例如 Preview 中出现的默认名字、占位图片只用于展示，**不会写入用户真实 Draft**。

---

### 03｜Card / Draft 云端持久化

目前已经建立真实 CloudBase 数据链路：

**Mini Program → Cloud Function → Card Service → CloudBase Database**

目前已经实现：

- 用户可以拥有多张 Card
- Card 与模板绑定
- Draft 云端持久化
- 服务端 Ownership 校验
- 客户端不能直接写 `cards` 数据库
- 服务端重新验证模板和 Draft 数据

---

### 04｜考虑真实网络环境下的数据安全

创建 Card 和保存草稿并不只依赖“按钮防重复”。

目前已经设计并实现：

**Idempotent Create**

同一次创建请求即使因为网络问题重复发送，也不会生成两张 Card。

**Revision Control**

草稿使用 Revision 控制版本，旧版本不会静默覆盖云端的新内容。

**Local Draft Recovery**

本地保存最新 Draft、Cloud Revision 和 Pending Mutation，为弱网、退出应用和请求结果未知等情况提供恢复基础。

---

### 05｜匿名浏览与身份边界

Cold Start、Gallery 和 Preview 阶段保持匿名。

只有用户明确点击：

> **使用这个模板**

才进入真实 Owner Flow：

**Template Select → Local Create Intent → Identity → Policy Check → Card Create**

用户的 Owner 身份来自服务端可信微信上下文，而不是由客户端传入 `ownerId` 或 OpenID。

---

## 当前进度

目前已经完成：

- ✅ Template Registry / CardRenderer
- ✅ Apple Minimal
- ✅ Magazine
- ✅ Template Gallery
- ✅ Full Preview / Select
- ✅ Anonymous Browse
- ✅ CloudBase Identity Foundation
- ✅ Card / Draft Data Model
- ✅ `cardCreate`
- ✅ `cardGetMine`
- ✅ `cardUpdateDraft`
- ✅ Server-side Ownership Validation
- ✅ 创建幂等与 Revision 机制
- ✅ 本地 Draft Recovery 基础
- ✅ Development 环境第一张真实 Card 创建

当前正在继续完成：

**Draft Save → Relaunch Recovery → Full Editor → Publish → Share → Anonymous Public Card**

目前项目已经不是单纯 UI Demo，而是开始跑通真实的：

> **Mini Program → Cloud Function → CloudBase Database**

产品链路。

---

## Roadmap

### MVP / Alpha

下一阶段将完成：

- 正式 Editor
- 草稿自动保存与恢复
- 图片上传
- 发布与内容审核
- 匿名公开名牌
- 微信分享 Deep Link

形成完整闭环：

**制作 → 发布 → 分享 → 别人打开**

### Social Loop

之后继续实现：

**认识请求 → 名牌回赠 → 相遇 → 相遇册 → 共同兴趣 → 联系方式交换**

### Future

长期计划包括：

- 更多视觉模板
- 可扩展 Multi-page Card
- AI 表达助手
- 社交媒体视觉图片生成
- NFC 名牌
- NFC 贴片 / 电子吧唧 / 工卡等实体载体

最终希望实现：

> **碰一下，就能认识我。**

---

## AI-assisted Development

这个项目也是我对 **AI Coding / Agentic Development** 的一次长期实践。

我负责：

- 产品定义与 PRD
- 用户流程与 MVP Scope
- 视觉方向
- 架构设计
- Acceptance Criteria
- Runtime 验收
- 产品取舍

AI Agent 参与：

**Planning → Implementation → Automated Tests → Independent Review → Runtime Validation**

我希望验证的是：

> **在产品目标、架构边界和验收标准明确以后，人能不能管理 AI Agent 持续开发一个真正可运行、有实际应用场景的 Vibe Coding 产品。**
