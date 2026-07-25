# accountGetMe（M1.2-B local）

`index.ts` 导出真实只读 `main`。它在每次调用中通过
`wx-server-sdk.getWXContext()` 取得可信微信身份，只读取 mapping 和 user，
绝不隐式创建账号。

运行 `npm.cmd run cloudfunctions:build` 后，本目录包含可部署的 `index.js`；本轮没有
上传或部署，真实读取和权限行为仍为 `NEEDS_VALIDATION`。
