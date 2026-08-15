# Moncast contracts

- `MoncastProtocol.sol`：1 小时至 7 天招募、延迟划转、每日证明、48 小时清算与契约内结算。
- `AttestedProofVerifier.sol`：Monad 测试网签名验证适配器；不是生产级 SNARK。
- `ICommitmentVerifier.sol`：生产验证器替换边界。

参与者在招募期只登记意向并授权。截止后任何 keeper 都可调用 `activateMembers`，合约分批尝试 `transferFrom`；失败成员被排除，成功成员才进入正式履约。`completeFor` 允许自动执行器代提交，但 proof 永远绑定具体成员、契约、epoch、nullifier 与公开输入摘要。

抵押币由部署时传入，测试网使用用户从水龙头领取的 6 位小数 USDC；本仓库不发行或自动铸造测试币。
