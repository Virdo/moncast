"use client";

import { useState } from "react";
import type { Address, Hex } from "viem";
import { goalMeta, type PactSummary } from "@/lib/pacts";
import {
  moncastAddress,
  protocolAbi,
  collateralTokenAbi,
  collateralTokenAddress,
  txUrl,
  type InjectedProvider,
  writeWithTightGas,
} from "@/lib/moncast-chain";
import { Icon } from "./Icon";
import { Modal } from "./Modal";

export function JoinModal({ pact, inviteCode, account, provider, onWallet, onClose, onJoined }: {
  pact: PactSummary;
  inviteCode: string;
  account?: Address;
  provider?: InjectedProvider;
  onWallet: () => Promise<Address | undefined>;
  onClose: () => void;
  onJoined: (pact: PactSummary) => void | Promise<void>;
}) {
  const [handle, setHandle] = useState("");
  const [profileReady, setProfileReady] = useState(false);
  const [profileSummary, setProfileSummary] = useState("");
  const [busy, setBusy] = useState(false);
  const [stage, setStage] = useState<"review" | "joined">("review");
  const [error, setError] = useState("");
  const [transactionHash, setTransactionHash] = useState<Hex>();

  async function verifyProfile() {
    if (handle.trim().length < 2) {
      setError(`请输入${pact.platformHandleHint}。`);
      return;
    }
    if (pact.goalType === "custom") {
      setError("自定义目标需通过契约声明的 HTTPS 适配器核验，当前邀请未包含公开适配器信息。");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const response = await fetch(`/api/verify/${pact.goalType}`, {
        method: "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify({ username: handle.trim(), utcOffsetMinutes: -new Date().getTimezoneOffset() }),
      });
      const result = await response.json() as { profile?: { username?: string; total?: number; streak?: number; hasCompletedToday?: boolean }; error?: string };
      if (!response.ok || !result.profile?.username) throw new Error(result.error || "PROFILE_NOT_FOUND");
      setProfileReady(true);
      setProfileSummary(`${result.profile.total ?? 0} 累计 · ${result.profile.streak ?? 0} 连续`);
    } catch (cause) {
      setProfileReady(false);
      setError(cause instanceof Error ? `查验失败：${cause.message}` : "平台暂时不可用");
    } finally {
      setBusy(false);
    }
  }

  async function join() {
    const participant = account ?? await onWallet();
    const injected = provider ?? window.ethereum;
    if (!participant || !injected) return;
    if (!profileReady) {
      setError("请先查验目标平台账户。");
      return;
    }
    if (!moncastAddress || !collateralTokenAddress) {
      setError("Moncast 测试网合约尚未写入配置。");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const amount = BigInt(pact.stake) * 1_000_000n;
      await writeWithTightGas(injected, participant, collateralTokenAddress, collateralTokenAbi, "approve", [moncastAddress, amount]);

      let nonce = 0n;
      let deadline = 0n;
      let signature: Hex = "0x";
      if (pact.isPrivate) {
        if (!inviteCode) throw new Error("请通过完整的私密招募链接加入。");
        const response = await fetch("/api/invites/redeem", {
          method: "POST", headers: { "content-type": "application/json" },
          body: JSON.stringify({ pactId: pact.id, code: inviteCode, participant }),
        });
        const invite = await response.json() as { nonce?: string; deadline?: string; signature?: Hex; error?: string };
        if (!response.ok || !invite.signature) throw new Error(invite.error || "邀请码兑换失败");
        nonce = BigInt(invite.nonce!);
        deadline = BigInt(invite.deadline!);
        signature = invite.signature;
      }

      const { hash } = await writeWithTightGas(injected, participant, moncastAddress, protocolAbi, "joinPact", [BigInt(pact.id), nonce, deadline, signature]);
      const registration = await fetch("/api/registry", {
        method: "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify({ action: "member", transactionHash: hash, pactId: pact.id, address: participant, username: handle.trim() }),
      });
      if (!registration.ok) throw new Error("已加入链上招募，但自动验真登记失败，请保存交易哈希。");
      setTransactionHash(hash);
      setStage("joined");
      await onJoined(pact);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "加入失败，请检查钱包余额与授权。");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal title={stage === "joined" ? "已加入招募" : pact.title} eyebrow={`JOIN PACT #${pact.id}`} onClose={onClose}>
      {stage === "joined" ? (
        <div className="success-state join-success">
          <div className="success-glyph"><Icon name="check" /></div>
          <span className="eyebrow">ENROLLMENT RECORDED</span>
          <h3>已授权 {pact.stake} USDC，当前尚未扣款</h3>
          <p>招募结束后，自动执行器会统一签订契约并从仍具备余额和授权的成员钱包划转保证金；授权失效的成员会被自动排除。</p>
          <div className="success-receipt"><span>PACT</span><code>#{pact.id}</code><span>RECRUITMENT</span><code>{pact.recruitmentLabel}</code><span>AUTO PROOF</span><code>23:00–24:00</code></div>
          {transactionHash && <a className="button outline" href={txUrl(transactionHash)} target="_blank" rel="noreferrer">查看链上交易<Icon name="external" /></a>}
          <button className="button primary" onClick={onClose}>完成<Icon name="check" /></button>
        </div>
      ) : (
        <div className="join-layout">
          <div className="join-terms">
            <div className="modal-pact-meta"><span className="status-tag status-verified">RECRUITING</span><span>{goalMeta[pact.goalType].label}</span><span>{pact.durationDays} DAYS</span></div>
            <p className="legal-copy">我自愿加入招募，并授权合约在招募结束后尝试划转保证金。只有成功划转的成员才正式签订契约并开始每日自动验真。</p>
            <dl className="term-table">
              <div><dt>目标规则</dt><dd>{pact.rule}</dd></div>
              <div><dt>招募剩余</dt><dd>{pact.recruitmentLabel}</dd></div>
              <div><dt>单人保证金</dt><dd>{pact.stake} USDC</dd></div>
              <div><dt>当前意向池</dt><dd>{pact.pool.toLocaleString()} USDC</dd></div>
              <div><dt>自动验真</dt><dd>每日 23:00–24:00</dd></div>
            </dl>
            <div className="member-wall"><header><span>招募成员</span><strong>{pact.members}/{pact.maxMembers}</strong></header><div>{pact.avatars.concat(["KX", "Z3", "TA", "0G"]).map((avatar, index) => <span key={`${avatar}-${index}`}>{avatar}</span>)}<b>+{Math.max(0, pact.members - 8)}</b></div></div>
          </div>
          <div className="join-action-panel">
            <span className="eyebrow">IDENTITY BINDING</span>
            <h3>查验你的平台账户</h3>
            <p>只读取公开进度生成证明。用户名不会写入 Moncast 合约。</p>
            <label className="field"><span>{pact.platformHandleHint}</span><input value={handle} onChange={(event) => { setHandle(event.target.value); setProfileReady(false); setProfileSummary(""); }} placeholder="输入公开用户名" disabled={busy} /></label>
            {profileReady ? <div className="verified-profile"><span>{handle.slice(0, 2).toUpperCase()}</span><div><strong>{handle}</strong><small><i /> {profileSummary} · VERIFIED</small></div><Icon name="check" /></div> : <button className="button outline full" onClick={verifyProfile} disabled={busy}>{busy ? "正在查验" : "查验账户"}</button>}
            <div className="deposit-summary"><span>招募结束后划转</span><strong>{pact.stake}<i>USDC</i></strong><small>现在只写入加入意向与代币授权<br />成功签约后才开始每日履约</small></div>
            {error && <p className="form-error" role="alert"><Icon name="warning" />{error}</p>}
            <button className="button primary full" onClick={join} disabled={busy}>{busy ? "等待钱包确认" : "加入战队"}<Icon name="arrow" /></button>
            <p className="microcopy"><Icon name="shield" />真实 Monad Testnet 交易；Monad 按 gas limit 计费，客户端估算后仅加 10% 缓冲。</p>
          </div>
        </div>
      )}
    </Modal>
  );
}
