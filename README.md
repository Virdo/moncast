# Moncast

> 抛锚立约，一诺上链，坚持自动发生。

Moncast 是运行于 Monad 的可验证自律承诺协议。成员先加入招募并授权测试网 USDC；招募截止后，自动执行器才批量划转保证金、正式签订契约并开始履约。LeetCode 与 Duolingo 的每日完成状态会在用户本地时区 23:00–24:00 自动核验，用户也可通过“完成契约”按钮展示同一条证明链路。

## 本地运行

```bash
npm install
npm run dev
```

打开 `http://localhost:3003`。合约部署工具位于 `/deploy`。

## Monad Testnet 部署

当前部署（Chain ID `10143`）：

- USDC：[`0x534b…943A3`](https://testnet.monadscan.com/address/0x534b2f3A21130d7a60830c2Df862319e593943A3)
- AttestedProofVerifier：[`0x3286…56ed1`](https://testnet.monadscan.com/address/0x32867799f03d56aac4D2A900e4b9B4404A056ed1)
- MoncastProtocol：[`0xaf65…34f1c`](https://testnet.monadscan.com/address/0xaf65b9d11d45547852d4355726d6b061b1c34f1c)

完整部署记录见 [`deployments/monad-testnet.json`](deployments/monad-testnet.json)。

```bash
npm run keys:testnet
npm run build:contracts
npm run dev -- --port 3003
```

1. 从 [Circle Faucet](https://faucet.circle.com/) 获取测试网 USDC。官方 Monad Testnet USDC 为 `0x534b2f3A21130d7a60830c2Df862319e593943A3`（6 位小数）。
2. 在 `/deploy` 填写该 USDC 地址，连接个人钱包并确认 2 笔部署交易。
3. 使用 `node scripts/save-deployment-addresses.mjs <USDC> <VERIFIER> <PROTOCOL>` 保存地址。
4. 重启开发服务器。
5. 给 `.env.local` 中的 relayer 地址少量测试网 MON，供招募激活和 23:00 自动完成交易使用。

Moncast 不内置测试币或自动领币逻辑；测试资产由用户自行从水龙头获取。

## 验证

```bash
npm run lint
npm test
npx tsc --noEmit
npm run build
```

## 关键边界

- 链上：招募期、延迟扣款、证明 nullifier、每日完成状态、48 小时清算、契约内违约分润和结算。
- 链下：平台用户名、公开资料适配器、邀请码兑换、搜索与定时任务登记。
- 测试网验真：`AttestedProofVerifier` 验证服务签名，不冒充生产级 SNARK；主网上线前必须替换为经审计的 ZK-TLS 验证器。
- 自动任务：`/api/cron/complete` 每 5 分钟运行；只有目标所在时区的 23 点小时才执行平台验真，其余时间仅处理已截止招募的签约激活。

详见 [架构说明](docs/ARCHITECTURE.md) 与 [生产检查清单](docs/PRODUCTION-CHECKLIST.md)。
