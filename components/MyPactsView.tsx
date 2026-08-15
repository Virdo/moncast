"use client";

import { heatmap, pacts, type PactSummary } from "@/lib/pacts";
import { Icon } from "./Icon";

export function MyPactsView({ pacts: registeredPacts = [], checkedIds, rewardClaimed, onCheckIn, onClaim }: {
  pacts?: PactSummary[];
  checkedIds: Set<string>;
  rewardClaimed: boolean;
  onCheckIn: (pact: PactSummary) => void;
  onClaim: () => void;
}) {
  const cells = heatmap(11, 98);
  const completed = checkedIds.size > 0;
  const activePacts = registeredPacts.length ? registeredPacts : [{ ...pacts[0], recruiting: false }, { ...pacts[1], recruiting: false }];

  return (
    <div className="view mine-view">
      <header className="page-heading compact-heading">
        <div><span className="eyebrow">MY PACTS / 个人执行终端</span><h1>我的契约</h1><p>系统会在每日 23:00–24:00 自动核验；原始学习数据不上链。</p></div>
        <button className="button primary" disabled={activePacts[0].recruiting} onClick={() => onCheckIn(activePacts[0])}>{activePacts[0].recruiting ? "等待签约" : completed ? "查看证明" : "完成契约"}<Icon name={completed ? "shield" : "spark"} /></button>
      </header>

      <section className="system-strip">
        <div><span>ACTIVE PACTS</span><strong>{String(activePacts.length).padStart(2, "0")}</strong><small>{registeredPacts.length ? "链上契约" : "界面示例"}</small></div>
        <div><span>STREAK</span><strong>{completed ? "13" : "12"}<i>D</i></strong><small>最佳纪录 31 天</small></div>
        <div><span>BONDED</span><strong>150<i>USDC</i></strong><small>本金安全锁定</small></div>
        <div className="reward-stat"><span>本队分润</span><strong>--<i>USDC</i></strong><small>周期结束后按链上结果计算</small></div>
      </section>

      <div className="dashboard-grid">
        <section className="active-list">
          <div className="section-title-row"><div><span className="eyebrow">ACTIVE COMMITMENTS</span><h2>执行中的契约</h2></div><span>{String(activePacts.length).padStart(2, "0")}</span></div>
          {activePacts.map((pact, index) => {
            const checked = checkedIds.has(pact.id);
            return (
              <article className="commitment-row" key={pact.id}>
                <div className="commitment-index">0{index + 1}</div>
                <div className="commitment-main">
                  <span className="mini-status"><i className={checked ? "ok" : ""} />{pact.recruiting ? `RECRUITING · ${pact.recruitmentLabel}` : checked ? "TODAY VERIFIED" : "AUTO CHECK · 23:00"}</span>
                  <h3>{pact.title}</h3>
                  <p>{pact.rule}</p>
                  <div className="thin-progress"><i style={{ width: index ? "29%" : "71%" }} /></div>
                  <small>DAY {index ? "09" : "10"} / {pact.durationDays} · {pact.stake} USDC BONDED</small>
                </div>
                <div className="commitment-action">
                  <span><Icon name="shield" /> ZK-TLS</span>
                  <button className={checked ? "button ghost" : "button primary"} disabled={pact.recruiting} onClick={() => onCheckIn(pact)}>{pact.recruiting ? "等待签约" : checked ? "查看证明" : "完成契约"}</button>
                </div>
              </article>
            );
          })}
        </section>

        <aside className="settlement-panel">
          <header><span className="eyebrow">SETTLEMENT PREVIEW</span><h2>战利品结算</h2></header>
          <div className="vault-visual"><div className="vault-ring ring-a" /><div className="vault-ring ring-b" /><span><Icon name="pool" /></span><strong>{rewardClaimed ? "CLAIMED" : "PENDING"}</strong><small>SETTLEMENT</small></div>
          <dl>
            <div><dt>本金返还</dt><dd>100 USDC</dd></div>
            <div><dt>战友违约分润</dt><dd className="lime">+8.24 USDC</dd></div>
            <div><dt>赞助收益</dt><dd className="blue">+1.76 USDC</dd></div>
          </dl>
          <button className="button primary full" onClick={onClaim} disabled>{rewardClaimed ? "已领取" : "等待结算"}<Icon name="arrow" /></button>
          <p>分润只来自本契约实际罚没与已注入收益，不承诺固定回报。</p>
        </aside>

        <section className="heatmap-panel">
          <div className="heatmap-head"><div><span className="eyebrow">PROOF HEATMAP</span><h2>连续履约热力图</h2></div><div className="legend"><span>少</span>{[0, 1, 2, 3].map((level) => <i key={level} data-level={level} />)}<span>多</span></div></div>
          <div className="heatmap-grid" aria-label="最近 14 周履约热力图">
            {cells.map((level, index) => <i key={index} data-level={completed && index === cells.length - 1 ? 3 : level} title={`第 ${index + 1} 日 · ${level ? "已证明" : "无记录"}`} />)}
          </div>
          <footer><span>98 DAYS OBSERVED</span><span>92 VERIFIED · 6 REST</span><strong>94% CONSISTENCY</strong></footer>
        </section>
      </div>
    </div>
  );
}
