import { Icon } from "./Icon";

const faq = [
  ["Moncast 如何保证隐私？", "TLS 会话与平台响应在本地或隔离的证明环境中处理。链上只记录规则摘要、公开输入摘要、nullifier 与验证结果，不记录用户名、题目、XP 明细或自定义 API 响应。"],
  ["第三方 API 改版怎么办？", "每个契约锁定 provider schema 版本和 ruleHash。适配器发生不兼容时，新证明会暂停；挑战窗口确认故障后可走无罚退出，而不是把平台故障算作个人违约。"],
  ["48 小时未履约由谁清算？", "任何地址都能调用清算函数。清算不依赖管理员，罚没资金只进入同一契约的分润池；若整队无人达标，才转入预先声明的安全兜底地址。"],
  ["收益是固定的吗？", "不是。本金返还由契约状态决定，质押收益只来自实际注入的 yieldPool，违约分润取决于本队结果。界面会把预计值与已到账值明确区分。"],
  ["为什么邀请码不直接上链校验？", "把邀请码放进 calldata 会永久泄露。Moncast 将深链 code 在链下兑换成绑定成员、nonce 与过期时间的 EIP-712 一次性凭证，链上只验证签名。"],
];

export function ManifestoView() {
  return (
    <div className="view manifesto-view">
      <header className="manifesto-hero">
        <div className="manifesto-kicker"><span>MONCAST / PROTOCOL GUIDE V1.0</span><i /></div>
        <h1>协议说明</h1>
        <p>这里集中说明隐私验真、招募签约、自动履约、资金分配与常见问题。</p>
        <div className="hero-proof-code"><span>PRIVACY</span><b>≠</b><span>UNVERIFIABLE</span><i />zk-tls/1.3 · monad/10143</div>
      </header>

      <section className="manifesto-section">
        <div className="manifesto-section-head"><span>01 / PROTOCOL ARCHITECTURE</span><h2>从一次私密行动，到一个公开事实。</h2></div>
        <div className="protocol-flow">
          <article><b>STEP_01</b><span className="icon-frame"><Icon name="lock" /></span><h3>本地制定</h3><p>目标细节和平台账户先被哈希承诺，原文不会进入公共账本。</p><code>metadata → keccak256</code></article>
          <i className="flow-arrow">→</i>
          <article className="featured"><b>STEP_02</b><span className="icon-frame"><Icon name="spark" /></span><h3>ZK-TLS 证明</h3><p>验证真实 HTTPS 响应满足 ruleHash，同时隐藏不相关字段。</p><code>TLS 1.3 → witness → proof</code></article>
          <i className="flow-arrow">→</i>
          <article><b>STEP_03</b><span className="icon-frame"><Icon name="shield" /></span><h3>Monad 验证</h3><p>nullifier 防止重复打卡，终态结算在约 800ms finality 后呈现。</p><code>verify → state → settlement</code></article>
        </div>
        <div className="privacy-split"><div><span>永不上链</span><strong>用户名 / 题目 / XP 明细 / API URL / 原始响应</strong></div><div><span>可公开验证</span><strong>规则摘要 / 证明摘要 / 日历 epoch / 结算结果</strong></div></div>
      </section>

      <section className="manifesto-section economics-section">
        <div className="manifesto-section-head"><span>02 / ECONOMIC MODEL</span><h2>惩罚留在战队，奖励回到行动者。</h2></div>
        <div className="economics-grid">
          <div className="economics-formula"><span className="eyebrow">SUCCESSFUL MEMBER PAYOUT</span><div><b>本金</b><i>+</i><b>实际质押收益</b><i>+</i><b className="lime">本队违约分润</b></div><p>没有隐藏的协议抽水，也不承诺固定年化。所有可领取金额以合约已到账余额为准。</p></div>
          <article><span className="icon-frame"><Icon name="pool" /></span><h3>动力保证金</h3><p>30 / 50 / 100 / 200 USDC。成员加入时等额锁定，成功后 100% 返还本金。</p><code>LOCK_STATUS: IMMUTABLE</code></article>
          <article><span className="icon-frame error-frame"><Icon name="warning" /></span><h3>48h 无许可清算</h3><p>连续 48 小时无有效证明即可被任何人清算，罚没金只进入本契约战友池。</p><code>KEEPER: PERMISSIONLESS</code></article>
          <article><span className="icon-frame blue-frame"><Icon name="trend" /></span><h3>按成员懒结算</h3><p>不在周期结束时遍历整队；任何人逐个处理，避免大队伍因 Gas 上限无法结算。</p><code>SETTLEMENT: O(1) / MEMBER</code></article>
          <article><span className="icon-frame"><Icon name="shield" /></span><h3>Gas 上限即成本</h3><p>Monad 按提交的 gas limit 计费。界面只加小缓冲，并把上限成本在签名前展示。</p><code>BUFFER: ≤ 10%</code></article>
        </div>
      </section>

      <section className="manifesto-section faq-section">
        <div className="manifesto-section-head"><span>03 / PROTOCOL SPECIFICATIONS</span><h2>Frequently asked, precisely answered.</h2></div>
        <div className="faq-list">
          {faq.map(([question, answer], index) => <details key={question} open={index === 0}><summary><span>{String(index + 1).padStart(2, "0")}</span><strong>{question}</strong><Icon name="chevron" /></summary><p>{answer}</p></details>)}
        </div>
      </section>

      <footer className="manifesto-footer"><span>MONCAST</span><p>Commit privately. Prove minimally. Settle credibly.</p><code>NETWORK: MONAD TESTNET / AUDIT: REQUIRED BEFORE MAINNET</code></footer>
    </div>
  );
}
