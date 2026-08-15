"use client";

import type { PactLifecycle, PactSummary } from "@/lib/pacts";
import { Icon } from "./Icon";

const lifecycleText: Record<PactLifecycle, string> = {
  recruiting: "RECRUITING",
  activating: "SIGNING",
  active: "EXECUTING",
  cancelled: "CANCELLED",
  finalized: "FINALIZED",
  unknown: "SYNCING",
};

export function MyPactsView({ pacts = [], checkedIds, startingPactId, onCheckIn, onStartNow, onBindAccount, onFormulate }: {
  pacts?: PactSummary[];
  checkedIds: Set<string>;
  startingPactId?: string;
  onCheckIn: (pact: PactSummary) => void;
  onStartNow: (pact: PactSummary) => Promise<void>;
  onBindAccount: (pact: PactSummary) => Promise<void>;
  onFormulate: () => void;
}) {
  const activePacts = pacts.filter((pact) => pact.lifecycle === "active");
  const bonded = activePacts.reduce((total, pact) => total + pact.stake, 0);
  const completedToday = activePacts.filter((pact) => checkedIds.has(pact.id)).length;

  return (
    <div className="view mine-view">
      <header className="page-heading compact-heading">
        <div><span className="eyebrow">MY PACTS / 个人执行终端</span><h1>我的契约</h1><p>这里只展示当前钱包真实发起或加入的契约；完成入口仅在契约进入执行期后出现。</p></div>
      </header>

      <section className="system-strip">
        <div><span>MY PACTS</span><strong>{String(pacts.length).padStart(2, "0")}</strong><small>当前钱包真实契约</small></div>
        <div><span>EXECUTING</span><strong>{String(activePacts.length).padStart(2, "0")}</strong><small>可提交今日证明</small></div>
        <div><span>BONDED</span><strong>{bonded}<i>USDC</i></strong><small>执行中保证金</small></div>
        <div className="reward-stat"><span>TODAY VERIFIED</span><strong>{completedToday}<i>PACT</i></strong><small>本日链上证明</small></div>
      </section>

      {!pacts.length ? (
        <section className="mine-empty empty-state">
          <Icon name="anchor" />
          <h3>还没有真实契约</h3>
          <p>广场内容仅作展示。发起或加入一份链上契约后，它会出现在这里。</p>
          <button className="button primary" onClick={onFormulate}>发起契约<Icon name="arrow" /></button>
        </section>
      ) : (
        <div className="dashboard-grid">
          <section className="active-list">
            <div className="section-title-row"><div><span className="eyebrow">ONCHAIN COMMITMENTS</span><h2>我的链上契约</h2></div><span>{String(pacts.length).padStart(2, "0")}</span></div>
            {pacts.map((pact, index) => {
              const checked = checkedIds.has(pact.id);
              const executable = pact.lifecycle === "active";
              const canStartNow = pact.lifecycle === "recruiting" && pact.isCreator;
              const needsAccount = pact.goalType !== "custom" && !pact.username;
              const starting = startingPactId === pact.id;
              return (
                <article className="commitment-row" key={pact.id}>
                  <div className="commitment-index">{String(index + 1).padStart(2, "0")}</div>
                  <div className="commitment-main">
                    <span className="mini-status"><i className={checked ? "ok" : ""} />{checked ? "TODAY VERIFIED" : lifecycleText[pact.lifecycle]}{pact.recruiting ? ` · ${pact.recruitmentLabel}` : ""}</span>
                    <h3>{pact.title}</h3>
                    <p>{pact.rule}</p>
                    <div className="thin-progress"><i style={{ width: checked ? "100%" : executable ? "45%" : "12%" }} /></div>
                    <small>PACT #{pact.id} · {pact.durationDays} DAYS · {pact.stake} USDC</small>
                  </div>
                  <div className="commitment-action">
                    <span><Icon name="shield" /> {lifecycleText[pact.lifecycle]}</span>
                    {canStartNow && <button className="button primary" title={pact.members < 2 ? "至少需要 2 名成员" : undefined} disabled={Boolean(startingPactId) || pact.members < 2} onClick={() => void onStartNow(pact)}>{starting ? "开始中" : "立即开始"}</button>}
                    {needsAccount && <button className="button outline" onClick={() => void onBindAccount(pact)}>恢复验真账号</button>}
                    {executable && <button className={checked ? "button ghost" : "button primary"} onClick={() => onCheckIn(pact)}>{checked ? "查看证明" : "完成契约"}</button>}
                  </div>
                </article>
              );
            })}
          </section>

          <aside className="settlement-panel">
            <header><span className="eyebrow">SETTLEMENT STATUS</span><h2>链上结算</h2></header>
            <div className="vault-visual"><div className="vault-ring ring-a" /><div className="vault-ring ring-b" /><span><Icon name="pool" /></span><strong>PENDING</strong><small>NO ESTIMATED RETURNS</small></div>
            <dl>
              <div><dt>执行中本金</dt><dd>{bonded} USDC</dd></div>
              <div><dt>战友违约分润</dt><dd className="lime">链上待定</dd></div>
              <div><dt>可领取</dt><dd className="blue">0 USDC</dd></div>
            </dl>
            <button className="button primary full" disabled>等待结算<Icon name="arrow" /></button>
            <p>不展示模拟收益；周期结束后按同契约实际罚没与验证结果计算。</p>
          </aside>

          <section className="heatmap-panel">
            <div className="heatmap-head"><div><span className="eyebrow">TODAY&apos;S PROOFS</span><h2>今日履约状态</h2></div></div>
            <div className="proof-day-list">
              {activePacts.length ? activePacts.map((pact) => <span key={pact.id} className={checkedIds.has(pact.id) ? "verified" : "pending"}><i />PACT #{pact.id}<strong>{checkedIds.has(pact.id) ? "已证明" : "待自动验真"}</strong></span>) : <p>当前没有执行中的契约。</p>}
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
