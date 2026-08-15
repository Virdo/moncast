"use client";

import { useMemo, useState } from "react";
import { categoryLabels, goalMeta, pacts, type GoalType, type PactSummary } from "@/lib/pacts";
import { Icon } from "./Icon";

const goalIcon = { leetcode: "code", duolingo: "owl", custom: "settings" } as const;

export function PlazaView({ livePacts = [], onJoin, onFormulate }: {
  livePacts?: PactSummary[];
  onJoin: (pact: PactSummary) => void;
  onFormulate: () => void;
}) {
  const [category, setCategory] = useState<"all" | GoalType>("all");
  const [query, setQuery] = useState("");
  const [inviteCode, setInviteCode] = useState("");
  const [inviteError, setInviteError] = useState("");

  const visiblePacts = useMemo(() => [...livePacts, ...pacts.filter((sample) => !livePacts.some((live) => live.id === sample.id))].filter((pact) => {
    const categoryMatch = category === "all" || pact.goalType === category;
    const needle = query.trim().toLocaleLowerCase();
    const searchMatch = !needle || `${pact.title} ${pact.rule} ${goalMeta[pact.goalType].label}`.toLocaleLowerCase().includes(needle);
    return categoryMatch && searchMatch;
  }), [category, livePacts, query]);

  function joinByCode() {
    const normalized = inviteCode.trim().toUpperCase().replace(/^MONCAST-/, "");
    const pact = [...livePacts, ...pacts].find((item) => item.id === normalized && item.isPrivate);
    if (!pact) {
      setInviteError("邀请码无效或已过期，请向发起人确认。示例：MONCAST-1120");
      return;
    }
    setInviteError("");
    onJoin(pact);
  }

  return (
    <div className="view plaza-view">
      <header className="page-heading plaza-heading">
        <div>
          <span className="eyebrow">MONCAST / ONCHAIN COMMITMENT PROTOCOL</span>
          <h1><span>抛锚立约，</span><span>一诺上链，</span><br /><em>坚持自动发生。</em></h1>
          <p>招募结束才正式签约并划转保证金；每日 23:00–24:00 自动验真，违约金只奖励同一战队的守约者。</p>
        </div>
        <div className="hero-signal" aria-label="协议实时状态">
          <span>LIVE PACTS</span><strong>2,481</strong><small><i /> Monad finality ~800ms</small>
        </div>
      </header>

      <section className="invite-rail" aria-label="邀请码加入">
        <div className="invite-title"><span className="icon-frame"><Icon name="key" /></span><div><strong>收到私密邀请？</strong><small>邀请码仅换取一次性签名，不会明文上链</small></div></div>
        <div className="invite-input">
          <label className="sr-only" htmlFor="invite-code">邀请码</label>
          <input id="invite-code" value={inviteCode} onChange={(event) => setInviteCode(event.target.value)} onKeyDown={(event) => event.key === "Enter" && joinByCode()} placeholder="输入 MONCAST-XXXX" />
          <button className="button primary" onClick={joinByCode}>加入战队<Icon name="arrow" /></button>
        </div>
        {inviteError && <p className="field-error" role="alert">{inviteError}</p>}
      </section>

      <section className="market-section">
        <div className="market-toolbar">
          <div className="filter-tabs" aria-label="目标分类">
            {(Object.keys(categoryLabels) as Array<"all" | GoalType>).map((key) => (
              <button key={key} className={category === key ? "active" : ""} onClick={() => setCategory(key)}>{categoryLabels[key]}</button>
            ))}
          </div>
          <label className="search-box"><Icon name="search" /><span className="sr-only">搜索契约</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="搜索目标 / 规则 / 战队" /><kbd>⌘ K</kbd></label>
        </div>

        <div className="section-title-row"><div><span className="eyebrow">VERIFIED COMMITMENT POOLS</span><h2>正在招募的契约</h2></div><span>{String(visiblePacts.length).padStart(2, "0")} / 06</span></div>
        {visiblePacts.length ? (
          <div className="pact-grid">
            {visiblePacts.map((pact) => (
              <article className="pact-card" key={pact.id}>
                <div className="card-scan" />
                <header>
                  <span className="goal-badge"><Icon name={goalIcon[pact.goalType]} />{goalMeta[pact.goalType].short}</span>
                  <span className={`status-tag status-${pact.recruiting ? "proving" : pact.state}`}>{pact.isPrivate && <Icon name="lock" />}{pact.recruiting ? "RECRUITING" : pact.state.toUpperCase()}</span>
                </header>
                <div className="card-title"><small>PACT #{pact.id}</small><h3>{pact.title}</h3><p><Icon name="clock" />{pact.recruiting ? `招募剩余 ${pact.recruitmentLabel} · ${pact.maxMembers - pact.members} 席` : pact.remainingDays ? `履约周期 ${pact.durationDays} 天 · 自动验真中` : "周期已结束 · 正在结算"}</p></div>
                <div className="rule-line"><span>契约条文</span><strong>{pact.rule}</strong></div>
                <div className="money-grid">
                  <div><span>战队总池</span><strong>{pact.pool.toLocaleString()} <i>USDC</i></strong></div>
                  <div className="slash-metric"><span>战友违约分润池</span><strong>{pact.slashPool.toLocaleString()} <i>USDC</i></strong><small>{pact.slashYield}</small></div>
                </div>
                <footer>
                  <div className="avatar-stack" aria-label={`${pact.members} 名成员`}>
                    {pact.avatars.map((avatar, index) => <span key={avatar} style={{ "--avatar-index": index } as React.CSSProperties}>{avatar}</span>)}
                    <b>+{pact.members - pact.avatars.length}</b>
                  </div>
                  <span className="capacity">{pact.members}/{pact.maxMembers}</span>
                  <button className="button outline" onClick={() => onJoin(pact)} disabled={!pact.recruiting}>加入战队</button>
                </footer>
              </article>
            ))}
          </div>
        ) : (
          <div className="empty-state"><Icon name="search" /><h3>没有匹配的契约</h3><p>换个关键词，或发起一支新的战队。</p><button className="button primary" onClick={onFormulate}>发起契约</button></div>
        )}
      </section>
    </div>
  );
}
