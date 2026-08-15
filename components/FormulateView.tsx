"use client";

import { useMemo, useState } from "react";
import type { GoalType } from "@/lib/pacts";
import { Icon } from "./Icon";

export type LaunchPactInput = {
  mode: "public" | "private";
  target: GoalType;
  title: string;
  handle: string;
  apiUrl: string;
  rule: string;
  duration: 7 | 14 | 30;
  recruitmentDays: number;
  stake: 30 | 50 | 100 | 200;
  maxMembers: number;
};

const targets: Array<{ id: GoalType; label: string; description: string; icon: "code" | "owl" | "settings" }> = [
  { id: "leetcode", label: "力扣刷题", description: "AC 题数 · 难度 · 连胜", icon: "code" },
  { id: "duolingo", label: "多邻国", description: "XP 增量 · 连胜", icon: "owl" },
  { id: "custom", label: "自定义目标", description: "HTTPS API · JSON 规则", icon: "settings" },
];

export function FormulateView({ onLaunch }: { onLaunch: (input: LaunchPactInput) => Promise<{ shareUrl: string }> }) {
  const [mode, setMode] = useState<"public" | "private">("public");
  const [target, setTarget] = useState<GoalType>("leetcode");
  const [title, setTitle] = useState("每日一道中等题");
  const [handle, setHandle] = useState("");
  const [verifiedHandle, setVerifiedHandle] = useState("");
  const [apiUrl, setApiUrl] = useState("");
  const [rule, setRule] = useState("daily_ac >= 1");
  const [duration, setDuration] = useState<7 | 14 | 30>(14);
  const [recruitmentDays, setRecruitmentDays] = useState(3);
  const [stake, setStake] = useState<30 | 50 | 100 | 200>(100);
  const [maxMembers, setMaxMembers] = useState(24);
  const [shareUrl, setShareUrl] = useState("");
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  const [busy, setBusy] = useState(false);
  const [profileSummary, setProfileSummary] = useState("");

  const fee = useMemo(() => (stake * maxMembers * 0.001).toFixed(2), [stake, maxMembers]);

  async function verifyAccount() {
    if (handle.trim().length < 2) {
      setError("请输入有效的平台用户名。");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const response = await fetch(`/api/verify/${target}`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ username: handle.trim(), utcOffsetMinutes: -new Date().getTimezoneOffset() }),
      });
      const result = await response.json() as { profile?: { username?: string; total?: number; streak?: number; hasCompletedToday?: boolean }; error?: string };
      if (!response.ok || !result.profile?.username) throw new Error(result.error || "账户不存在");
      setVerifiedHandle(handle.trim());
      setProfileSummary(`${result.profile.total ?? 0} 累计 · ${result.profile.streak ?? 0} 连续 · ${result.profile.hasCompletedToday ? "今日已完成" : "今日待完成"}`);
    } catch (cause) {
      setVerifiedHandle("");
      setError(cause instanceof Error ? `查验失败：${cause.message}` : "平台暂时不可用");
    } finally {
      setBusy(false);
    }
  }

  async function formulate() {
    if (title.trim().length < 4) {
      setError("契约名称至少需要 4 个字符。");
      return;
    }
    if (target !== "custom" && verifiedHandle !== handle.trim()) {
      setError("请先查验平台账户。");
      return;
    }
    if (target === "custom") {
      try {
        const url = new URL(apiUrl);
        if (url.protocol !== "https:") throw new Error("HTTPS only");
      } catch {
        setError("自定义验真地址必须是有效的 HTTPS URL，且生产环境需加入域名白名单。");
        return;
      }
      if (!rule.trim()) {
        setError("请填写可判定的达标规则。");
        return;
      }
    }
    setError("");
    setBusy(true);
    try {
      const result = await onLaunch({ mode, target, title: title.trim(), handle: handle.trim(), apiUrl, rule, duration, recruitmentDays, stake, maxMembers });
      setShareUrl(result.shareUrl);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "发起失败，请重试。");
    } finally {
      setBusy(false);
    }
  }

  async function copyShare() {
    if (!shareUrl) return;
    await navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  }

  return (
    <div className="view formulate-view">
      <header className="page-heading compact-heading"><div><span className="eyebrow">LAUNCH / 发起契约</span><h1>发起契约</h1><p>设定招募期与履约规则。招募结束后才正式签约，并从有效参与者钱包划转等额保证金。</p></div><div className="form-step-indicator"><span className="active">01 规则</span><span>02 招募</span><span>03 授权</span></div></header>

      <div className="form-layout">
        <form className="pact-form" onSubmit={(event) => { event.preventDefault(); formulate(); }}>
          <fieldset>
            <legend><b>01</b><span>可见范围<small>VISIBILITY MODE</small></span></legend>
            <div className="choice-grid mode-grid">
              <button type="button" className={mode === "public" ? "choice active" : "choice"} onClick={() => setMode("public")}><Icon name="globe" /><span><strong>公开契约</strong><small>可在广场发现并加入</small></span><i /></button>
              <button type="button" className={mode === "private" ? "choice active" : "choice"} onClick={() => setMode("private")}><Icon name="lock" /><span><strong>私密邀请小队</strong><small>凭一次性签名加入</small></span><i /></button>
            </div>
          </fieldset>

          <fieldset>
            <legend><b>02</b><span>验真目标<small>VERIFICATION TARGET</small></span></legend>
            <div className="choice-grid target-grid">
              {targets.map((item) => <button type="button" key={item.id} className={target === item.id ? "target-choice active" : "target-choice"} onClick={() => { setTarget(item.id); setVerifiedHandle(""); setProfileSummary(""); }}><span className="icon-frame"><Icon name={item.icon} /></span><strong>{item.label}</strong><small>{item.description}</small></button>)}
            </div>
            <label className="field"><span>契约名称</span><input value={title} onChange={(event) => setTitle(event.target.value)} maxLength={48} placeholder="例如：每日一道中等题" /><small>{title.length}/48</small></label>
            {target !== "custom" ? (
              <div className="inline-fields">
                <label className="field grow"><span>{target === "leetcode" ? "LeetCode" : "Duolingo"} 用户名</span><input value={handle} onChange={(event) => { setHandle(event.target.value); setVerifiedHandle(""); }} placeholder="公开资料用户名" /></label>
                <button type="button" className="button outline verify-button" onClick={verifyAccount} disabled={busy}>{busy ? "查验中" : verifiedHandle ? "已查验" : "查验账户"}</button>
                {verifiedHandle && <div className="profile-proof"><span>{verifiedHandle.slice(0, 2).toUpperCase()}</span><div><strong>{verifiedHandle}</strong><small><i /> {profileSummary} · 原始数据不上链</small></div></div>}
              </div>
            ) : (
              <div className="custom-fields">
                <label className="field"><span>HTTPS 验真 API URL</span><input type="url" value={apiUrl} onChange={(event) => setApiUrl(event.target.value)} placeholder="https://api.example.com/progress" /></label>
                <label className="field"><span>达标规则</span><input value={rule} onChange={(event) => setRule(event.target.value)} placeholder="data.distance_km >= 5" /></label>
                <p><Icon name="shield" />生产环境会阻止内网地址、重定向与未批准域名，避免 SSRF 和规则漂移。</p>
              </div>
            )}
          </fieldset>

          <fieldset>
            <legend><b>03</b><span>动力参数<small>STAKING PARAMETERS</small></span></legend>
            <label className="range-field"><span>招募时间 <strong>{recruitmentDays} 天</strong><small>最长 7 天；结束后统一签约扣款</small></span><input type="range" min="1" max="7" value={recruitmentDays} onChange={(event) => setRecruitmentDays(Number(event.target.value))} /></label>
            <div className="parameter-row">
              <div><span>周期</span><div className="segment-control">{([7, 14, 30] as const).map((days) => <button type="button" key={days} className={duration === days ? "active" : ""} onClick={() => setDuration(days)}>{days} 天</button>)}</div></div>
              <div><span>单人保证金</span><div className="segment-control">{([30, 50, 100, 200] as const).map((amount) => <button type="button" key={amount} className={stake === amount ? "active" : ""} onClick={() => setStake(amount)}>{amount}</button>)}</div></div>
            </div>
            <label className="range-field"><span>战队人数上限 <strong>{maxMembers}</strong></span><input type="range" min="2" max="128" value={maxMembers} onChange={(event) => setMaxMembers(Number(event.target.value))} /></label>
          </fieldset>

          {error && <p className="form-error" role="alert"><Icon name="warning" />{error}</p>}
          <button className="button primary submit-pact" type="submit" disabled={busy}>{busy ? "等待钱包确认" : "发起契约"}<Icon name="arrow" /></button>
        </form>

        <aside className="pact-preview">
          <span className="preview-label">LIVE CONTRACT PREVIEW</span>
          <div className="preview-sheet">
            <header><span className="brand-mini">MONCAST</span><span className="status-tag status-verified">RECRUITING.DRAFT</span></header>
            <h2>{title || "未命名契约"}</h2>
            <p>我自愿以可验证方式履行下列目标，并接受契约内闭环结算。</p>
            <dl>
              <div><dt>MODE</dt><dd>{mode === "public" ? "PUBLIC" : "PRIVATE"}</dd></div>
              <div><dt>TARGET</dt><dd>{targets.find((item) => item.id === target)?.label}</dd></div>
              <div><dt>CONDITION</dt><dd>{target === "custom" ? rule : target === "leetcode" ? "DAILY_AC ≥ 1" : "DAILY_XP ≥ 50"}</dd></div>
              <div><dt>DURATION</dt><dd>{duration} DAYS</dd></div>
              <div><dt>RECRUIT</dt><dd>{recruitmentDays} DAYS</dd></div>
              <div><dt>BOND</dt><dd>{stake} USDC</dd></div>
              <div><dt>SLASH</dt><dd>48H NO PROOF</dd></div>
            </dl>
            <div className="preview-note"><Icon name="shield" /><span>链上存储 metadataHash / ruleHash / nullifier。用户名、URL 与原始数据保持链下。</span></div>
            <footer><span>EST. MAX GAS LIMIT COST</span><strong>≈ {fee} MON-GWEI*</strong><small>*按 gas limit 展示，避免高估上限让 Monad 用户多付费</small></footer>
          </div>
          {shareUrl && <div className="share-result"><span className="eyebrow">PACT LAUNCHED</span><strong>招募链接已生成</strong><code>{shareUrl}</code><button className="button primary full" type="button" onClick={copyShare}>{copied ? "已复制" : "复制链接"}<Icon name="copy" /></button></div>}
        </aside>
      </div>
    </div>
  );
}
