# Moncast ⚡

> **抛锚立约，一诺上链，坚持自动发生。**  
> *Commit privately. Prove minimally. Settle credibly.*

[![Monad Testnet](https://img.shields.io/badge/Network-Monad%20Testnet%20(10143)-836EF9?style=flat-square)](https://testnet.monadscan.com)
[![Solidity](https://img.shields.io/badge/Solidity-^0.8.28-363636?style=flat-square&logo=solidity)](https://soliditylang.org/)
[![React 19](https://img.shields.io/badge/React-19.2-61DAFB?style=flat-square&logo=react)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9-3178C6?style=flat-square&logo=typescript)](https://www.typescriptlang.org/)
[![Viem](https://img.shields.io/badge/Viem-2.55-black?style=flat-square)](https://viem.sh)

Moncast 是运行于 **Monad 高性能区块链** 之上的**可验证自律承诺协议（Verifiable Commitment Protocol）**。通过结合密码学证明、自动化 Keeper 与博弈论激励机制，帮助个人与战队在不泄露隐私的前提下，将 LeetCode 刷题、Duolingo 语言学习等日常习惯锚定在链上智能合约中，达成可信的契约式履约与激励分配。

---

## 🌟 核心特性

- 🎯 **招募先行与延迟划转（Recruit-first, Delayed-transfer）**  
  加入契约时仅登记意向并进行 ERC-20 授权，不立刻扣款。招募截止或发起人提前开局时，自动化执行器才批量划转保证金。资金不足者自动排除或转为演示模式，绝不阻碍整队正常启航。
- 🛡️ **极简证明与隐私零泄露（ZK-TLS / Verifiable Attestation Ready）**  
  用户账号、做题记录、XP 明细及原始 HTTPS 响应等隐私信息**永不上链**。通过链下验真生成绑定 `member`、`epoch`、`nullifier` 与 `ruleHash` 的证明，智能合约仅校验密码学凭证。
- 🏆 **闭环博弈与无许可清算（Incentive Economics & Liquidation）**  
  - 成功履约者获得：`100% 本金` + `实际注入的质押收益 (Yield Pool)` + `同队违约者分润 (Slash Pool)`。
  - **48 小时无许可清算**：连续 48 小时未提交有效证明的成员，任何地址均可发起清算，罚没资金 100% 留存同一契约。
  - **$O(1)$ 懒结算（Lazy Settlement）**：按成员逐个结算，杜绝全员遍历带来的 Gas 溢出风险。
- 🔑 **EIP-712 一次性私密邀请通道**  
  私密契约邀请码不在链上暴露，链下兑换为绑定 `pactId`、`participant`、`nonce` 及 `deadline` 的 EIP-712 签名，防抢跑、防嗅探。
- ⚡ **针对 Monad 的极致 Gas 优化**  
  针对 Monad 的按提交 `gas limit` 计费机制，协议所有交易均采用即时精确估算（缓冲 $\le 10\%$），单批次激活上限严格控制在 24 人以内。

---

## 📐 架构与工作流程

### 1. 契约全生命周期

```mermaid
flowchart TD
    A[发起契约 / 设定目标与招募期 1-7天] --> B[成员加入 / 登记意向 + 授权 USDC]
    B --> C{招募截止 or 发起人立即开局}
    C -->|批量 transferFrom| D[正式签约 / 激活有效质押成员]
    D --> E[日常履约期]
    E --> F[每日 23:00-24:00 本地时区自动验真]
    F -->|提交证明| G[状态标记 Completed]
    E -->|超时 48h 未履约| H[任何人无许可清算 Slashed]
    G --> I[周期结束]
    H --> I
    I --> J[O(1) 懒结算: 返还本金 + 质押收益 + 违约分润]
```

### 2. 信任与隐私安全边界

```mermaid
flowchart LR
    subgraph 链下私密环境
        L[LeetCode / Duolingo / HTTPS API] -->|公开数据获取| V[Moncast Verifier]
        V -->|提取最小事实 + 计算摘要| P[Attested Proof 生成]
    end
    subgraph 链上智能合约 (Monad Testnet)
        P -->|提交证明 member + epoch + nullifier| C[AttestedProofVerifier / MoncastProtocol]
        C --> S[更新完成状态 / 触发清算与分润结算]
    end
```

| 维度 | 链下隔离环境 | 链上智能合约 |
| :--- | :--- | :--- |
| **数据内容** | 用户名、做题记录、XP 明细、API URL、原始 JSON | 规则哈希 `ruleHash`、元数据哈希 `metadataHash`、Epoch 状态 |
| **隐私保障** | TLS 会话本地/安全沙箱验真，敏感数据不出域 | Nullifier 机制防止双花/重复打卡，交易可溯但身份隔离 |
| **验证体系** | 测试网签名中继 $\to$ 主网无缝升级为 ZK-TLS (SNARK) | `ICommitmentVerifier` 标准化可替换接口 |

---

## 🚀 Monad Testnet 部署信息

当前已部署于 **Monad Testnet**（Chain ID: `10143`）：

| 模块 / 合约 | 地址 | 浏览器链接 |
| :--- | :--- | :--- |
| **测试网 USDC (6 Decimals)** | `0x534b2f3A21130d7a60830c2Df862319e593943A3` | [Monadscan](https://testnet.monadscan.com/address/0x534b2f3A21130d7a60830c2Df862319e593943A3) |
| **AttestedProofVerifier** | `0x32867799f03d56aac4D2A900e4b9B4404A056ed1` | [Monadscan](https://testnet.monadscan.com/address/0x32867799f03d56aac4D2A900e4b9B4404A056ed1) |
| **MoncastProtocol (v5)** | `0xc877e04102e5e931700cd7629f47fca1d4c279f9` | [Monadscan](https://testnet.monadscan.com/address/0xc877e04102e5e931700cd7629f47fca1d4c279f9) |
| **部署交易哈希** | `0xed87d1266979aa92373575b469caa1fa7da1a146f01f3b30e2f74fb308075d0d` | [查看交易](https://testnet.monadscan.com/tx/0xed87d1266979aa92373575b469caa1fa7da1a146f01f3b30e2f74fb308075d0d) |

> 完整部署记录详见 [`deployments/monad-testnet.json`](deployments/monad-testnet.json)。

---

## 🛠️ 本地开发与快速上手

### 环境要求
- **Node.js**: `>= 22.13.0`
- **包管理器**: `npm`

### 1. 克隆与安装依赖

```bash
git clone https://github.com/Virdo/moncast.git
cd moncast
npm install
```

### 2. 配置环境变量

生成测试网所需的签名密钥与配置模板：

```bash
npm run keys:testnet
```

该命令将在根目录创建或更新 `.env.local`。核心环境变量说明：

```ini
# Monad RPC
NEXT_PUBLIC_MONAD_RPC_URL="https://testnet-rpc.monad.xyz"
NEXT_PUBLIC_CHAIN_ID="10143"

# 合约地址
NEXT_PUBLIC_USDC_ADDRESS="0x534b2f3A21130d7a60830c2Df862319e593943A3"
NEXT_PUBLIC_VERIFIER_ADDRESS="0x32867799f03d56aac4D2A900e4b9B4404A056ed1"
NEXT_PUBLIC_MONCAST_ADDRESS="0xc877e04102e5e931700cd7629f47fca1d4c279f9"

# 证明与 Relayer 账户私钥
ATTESTOR_PRIVATE_KEY="0x..."
RELAYER_PRIVATE_KEY="0x..."
CRON_SECRET="your-secure-cron-secret"
```

> 💡 **提示**：请为 `RELAYER_PRIVATE_KEY` 对应的地址充值少量测试网 MON，以支持招募激活与自动打卡代付交易。

### 3. 获取测试币

1. 访问 [Circle Faucet](https://faucet.circle.com/) 领取 Monad Testnet USDC（`0x534b2f3A21130d7a60830c2Df862319e593943A3`）。
2. 单人保证金支持 `1–1,000,000 USDC` 自定义整数金额，测试时可直接选择水龙头单次发放的 `20 USDC`。

### 4. 启动本地开发服务

```bash
npm run dev
```

浏览器打开 `http://localhost:3003` 即可体验。

---

## 🧪 测试与质量验证

项目内置了完备的自动化测试套件与静态类型检查：

```bash
# 运行全套单元测试（包含链下验证、规则计算、注册表与合约集成测试）
npm test

# 运行 Solidity 智能合约独立编译测试
npm run test:contract

# 运行 TypeScript 类型检查
npx tsc --noEmit

# 运行代码规范检查
npm run lint

# 生产环境编译测试
npm run build
```

---

## 📦 部署与生产运维

### 重新部署合约

如需在测试网重新部署最新合约：

```bash
# 1. 编译合约并生成 ABI 与 Bytecode
npm run build:contracts

# 2. 启动服务并访问部署控制台
npm run dev -- --port 3003
```

1. 打开浏览器访问 `http://localhost:3003/deploy`。
2. 填入 USDC 合约地址，连接钱包确认部署交易。
3. 运行保存脚本更新部署地址：
   ```bash
   node scripts/save-deployment-addresses.mjs <USDC_ADDR> <VERIFIER_ADDR> <PROTOCOL_ADDR>
   ```

### Vercel 生产部署

生产构建采用 Vinext + Nitro 适配：

```bash
npm run build:vercel
```

- 定时任务自动化调度：配置外部 Cron 服务每 5 分钟请求 `/api/cron/complete`，并携带 Header `Authorization: Bearer <CRON_SECRET>`。
- 更多生产上线考量请参阅：
  - 📖 [系统架构详细设计文档](docs/ARCHITECTURE.md)
  - 📋 [主网上线检查清单](docs/PRODUCTION-CHECKLIST.md)

---

## 📂 项目结构

```
moncast/
├── app/                    # Web 全栈应用与 API Routes (Vinext / Nitro)
│   ├── api/
│   │   ├── cron/complete/  # 定时 Keeper：自动招募签约与每日验真代提交
│   │   ├── invites/        # EIP-712 私密邀请码签发
│   │   ├── proof/          # 证明生成与中继
│   │   └── verify/         # LeetCode / Duolingo 平台数据验真
│   ├── deploy/             # 链上合约可视化部署调试工具
│   └── page.tsx            # 主应用单页视图（广场、制定、契约、协议）
├── components/             # React 19 UI 组件库
├── contracts/              # Solidity 智能合约
│   ├── src/
│   │   ├── MoncastProtocol.sol       # 核心协议合约 (招募/划转/打卡/清算/结算)
│   │   ├── AttestedProofVerifier.sol # 证明验证器适配器
│   │   └── ICommitmentVerifier.sol   # 验证器标准化接口
│   └── foundry.toml
├── data/                   # 自动化任务与注册表（本地缓存）
├── deployments/            # 各网络部署记录与 ABI
├── docs/                   # 架构与生产设计文档
├── lib/                    # 链交互、平台验证适配器与状态计算
├── scripts/                # 编译、部署与密钥生成工具
└── tests/                  # 单元与集成测试套件
```

---

## 📜 许可证

本项目基于 [MIT License](LICENSE) 开源。
