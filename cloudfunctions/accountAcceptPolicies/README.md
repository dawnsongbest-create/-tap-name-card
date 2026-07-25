# accountAcceptPolicies（M1.2-B local）

`index.ts` 导出真实 `main`。它在每次调用中通过
`wx-server-sdk.getWXContext()` 取得可信微信身份，要求协议和隐私政策版本一次同时确认，
并在 CloudBase 事务中同时写两项版本和时间；相同版本重复确认保持幂等。

运行 `npm.cmd run cloudfunctions:build` 后，本目录包含可部署的 `index.js`；本轮没有
上传或部署，真实事务和权限行为仍为 `NEEDS_VALIDATION`。
