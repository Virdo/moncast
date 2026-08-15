# Production checklist

当前目标网络固定为 Monad Testnet（chain ID `10143`）。mtUSDC、attestor 与 relayer 均仅用于测试，不得迁移到主网。

## 测试网上线

1. 用个人钱包从 `/deploy` 部署 `MockUSDC`、`AttestedProofVerifier`、`MoncastProtocol`。
2. 通过 `eth_getCode` 核验三个地址，并在 Monadscan 验证源码。
3. 给 relayer 地址充值少量测试 MON；新充值账户等待至少约 1.2 秒后再发交易。
4. 写入 `.env.local`，重启服务后实测领取 1,000 mtUSDC、授权、发起、加入、招募激活和完成证明。
5. 为 Cron 配置不可预测的 `CRON_SECRET`，并监控 relayer MON 余额、失败率和平台适配器延迟。

## 主网前硬门槛

- 将签名式 `AttestedProofVerifier` 替换为经审计的 ZK-TLS / SNARK 验证器。
- 完成合约审计、模糊测试、状态机不变量、代币兼容性和批量激活 Gas 上限测试。
- 把本地登记文件换成加密持久数据库；增加用户会话、交易所有权校验、速率限制和审计日志。
- 为平台 API 改版提供挑战期、暂停与无罚退出机制。
- 使用正式稳定币前逐链核对官方地址和字节码，禁止复用测试币地址。
- 部署后通过官方验证 API 验证源码，再初始化 Envio 等索引器。

## Monad Gas 策略

Monad 按提交的 `gas limit` 计费。所有前端与 relayer 交易必须即时估算，并只加最多 10% 缓冲；估算失败时不使用宽松兜底值。激活批次上限为 24，结算保持逐成员执行，以减少冷存储访问和过高 Gas 上限。
