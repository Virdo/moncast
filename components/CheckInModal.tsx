"use client";

import { useMemo, useState } from "react";
import type { Address, Hex } from "viem";
import type { PactSummary } from "@/lib/pacts";
import { moncastAddress, protocolAbi, txUrl, type InjectedProvider, writeWithTightGas } from "@/lib/moncast-chain";
import { Icon } from "./Icon";
import { Modal } from "./Modal";

const proofSteps = [
  ["TLS 1.3 握手", "NEGOTIATING_CIPHER"],
  ["读取官方响应", "RESPONSE_INTERCEPTED"],
  ["校验今日目标", "RULE_EVALUATED"],
  ["生成脱敏凭证", "WITNESS_REDACTED"],
  ["广播 Monad", "NULLIFIER_ACCEPTED"],
] as const;

export function CheckInModal({ pact, account, provider, alreadyCompleted = false, onWallet, onClose, onSuccess }: {
  pact: PactSummary;
  account?: Address;
  provider?: InjectedProvider;
  alreadyCompleted?: boolean;
  onWallet: () => Promise<Address | undefined>;
  onClose: () => void;
  onSuccess: (pact: PactSummary) => void;
}) {
  const [phase, setPhase] = useState<"idle" | "running" | "success" | "failed">(alreadyCompleted ? "success" : "idle");
  const [step, setStep] = useState(-1);
  const [failureReason, setFailureReason] = useState("");
  const [transactionHash, setTransactionHash] = useState<Hex>();
  const [gasLimit, setGasLimit] = useState<bigint>();
  const platformUrl = pact.goalType === "leetcode" ? "https://leetcode.com/problemset/" : "https://www.duolingo.com/learn";
  const confetti = useMemo(() => Array.from({ length: 38 }, (_, index) => ({
    x: (index * 37) % 100, delay: (index % 9) * 0.045, rotate: (index * 53) % 180, color: index % 3,
  })), []);

  async function startProof() {
    if (phase === "running" || alreadyCompleted) return;
    const participant = account ?? await onWallet();
    const injected = provider ?? window.ethereum;
    if (!participant) {
      setFailureReason("个人钱包尚未连接。请先连接钱包并切换到 Monad 测试网。");
      setPhase("failed");
      return;
    }
    if (!injected) {
      setFailureReason("未检测到当前钱包提供方，请刷新页面后重新连接。");
      setPhase("failed");
      return;
    }
    if (!moncastAddress) {
      setFailureReason("Moncast 测试网协议地址未配置。请先完成合约部署并写入 NEXT_PUBLIC_MONCAST_CONTRACT_ADDRESS。");
      setPhase("failed");
      return;
    }
    if (!pact.username || pact.goalType === "custom") {
      setFailureReason("这张示例契约没有已登记的平台账号；真实链上契约会在加入时完成账号绑定。");
      setPhase("failed");
      return;
    }
    setPhase("running");
    setStep(0);
    setFailureReason("");
    try {
      await new Promise((resolve) => window.setTimeout(resolve, 360));
      setStep(1);
      const response = await fetch("/api/proof", {
        method: "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify({ pactId: pact.id, participant, platform: pact.goalType, username: pact.username }),
      });
      const result = await response.json() as { epoch?: string; nullifier?: Hex; publicInputsHash?: Hex; proof?: Hex; error?: string };
      setStep(2);
      await new Promise((resolve) => window.setTimeout(resolve, 360));
      if (!response.ok || !result.proof || !result.nullifier || !result.publicInputsHash) {
        throw new Error(result.error || "验真服务暂时不可用");
      }
      setStep(3);
      await new Promise((resolve) => window.setTimeout(resolve, 360));
      setStep(4);
      const { hash, gas } = await writeWithTightGas(injected, participant, moncastAddress, protocolAbi, "complete", [
        BigInt(pact.id), Number(result.epoch), result.nullifier, result.publicInputsHash, result.proof,
      ]);
      setTransactionHash(hash);
      setGasLimit(gas);
      setPhase("success");
      onSuccess(pact);
    } catch (cause) {
      const code = cause instanceof Error ? cause.message : "PROOF_FAILED";
      const readable: Record<string, string> = {
        TARGET_NOT_COMPLETED: "官方数据尚未检测到今日完成记录。先完成目标，再重新验真。",
        ALREADY_COMPLETED: "今日契约已经完成，无需重复提交。",
        CONTRACT_NOT_CONFIGURED: "Moncast 测试网协议尚未配置，证明没有广播。",
        ATTESTOR_NOT_CONFIGURED: "验真签名服务尚未配置，证明没有广播。",
        AUTOMATION_MEMBER_NOT_REGISTERED: "当前钱包或平台账号未登记在这份真实契约中。",
        COMPLETION_WINDOW_CLOSED: "该契约当前不在执行期，不能提交完成证明。",
        PROFILE_NOT_FOUND: "未找到已绑定的平台公开账号。",
      };
      setFailureReason(readable[code] ?? code);
      setPhase(code === "ALREADY_COMPLETED" ? "success" : "failed");
    }
  }

  return (
    <Modal title={phase === "success" ? "今日契约已完成" : phase === "failed" ? "今日尚未达标" : "ZK-TLS 隐私验真"} eyebrow={`COMPLETE / PACT #${pact.id}`} onClose={onClose} width="regular">
      <div className={`proof-console phase-${phase}`}>
        {phase === "success" && !alreadyCompleted && <div className="confetti" aria-hidden="true">{confetti.map((piece, index) => <i key={index} data-color={piece.color} style={{ left: `${piece.x}%`, animationDelay: `${piece.delay}s`, transform: `rotate(${piece.rotate}deg)` }} />)}</div>}
        <div className="proof-target"><span className="icon-frame"><Icon name={pact.goalType === "leetcode" ? "code" : pact.goalType === "duolingo" ? "owl" : "settings"} /></span><div><strong>{pact.title}</strong><small>{pact.rule}</small></div><span className="status-tag status-proving">AUTO · 23:00</span></div>

        {phase === "idle" && <div className="proof-intro"><div className="privacy-orbit"><span><Icon name="shield" /></span><i /><i /></div><h3>系统将在 23:00–24:00 自动完成</h3><p>此按钮用于立即展示同一验真链路。官方响应只在证明服务中读取，链上只留下当日 epoch、摘要与 nullifier。</p><div className="proof-facts"><span>ACCOUNT<code>{pact.username ?? "NOT BOUND"}</code></span><span>CHAIN<code>MONAD · 10143</code></span><span>PRIVACY<code>SELECTIVE DISCLOSURE</code></span></div></div>}

        {(phase === "running" || phase === "failed") && <div className="terminal-log">
          <header><span><i /> zk-tls-session.log</span><code>PACT 0x{pact.id}</code></header>
          <div className="log-lines">
            {proofSteps.map(([label, state], index) => <div key={state} className={index < step ? "done" : index === step ? "active" : "pending"}><span>{String(index + 1).padStart(2, "0")}</span><i /> <strong>{label}</strong><code>{index < step ? "OK" : index === step ? state : "WAITING"}</code></div>)}
            {phase === "failed" && <div className="failure-log"><span>RULE_RESULT</span><strong>FALSE</strong><code>NOT_BROADCAST</code></div>}
          </div>
          <div className="proof-progress"><i style={{ width: `${Math.max(8, ((step + 1) / proofSteps.length) * 100)}%` }} /></div>
        </div>}

        {phase === "success" && <div className="success-state proof-success"><div className="success-glyph"><Icon name="check" /></div><span className="eyebrow">PROOF ACCEPTED · MONAD TESTNET</span><h3>今日契约已完成</h3><p>{alreadyCompleted ? "系统已检测到本日证明，因此不再重复验真。" : "热力方格已点亮，之后再次打开只会展示证明状态。"}</p><div className="success-receipt"><span>TX</span><code>{transactionHash ? `${transactionHash.slice(0, 10)}…${transactionHash.slice(-6)}` : "ONCHAIN PROOF"}</code><span>STATUS</span><code>FINALIZED</code><span>GAS LIMIT</span><code>{gasLimit?.toString() ?? "RECORDED"}</code></div>{transactionHash && <a className="button outline" href={txUrl(transactionHash)} target="_blank" rel="noreferrer">查看证明交易<Icon name="external" /></a>}</div>}

        {phase === "failed" && <div className="proof-failure"><Icon name="warning" /><div><h3>证明未广播</h3><p>{failureReason}</p></div></div>}

        <footer className="proof-actions">
          {phase === "idle" && <button className="button primary full" onClick={startProof}>完成契约<Icon name="spark" /></button>}
          {phase === "running" && <button className="button primary full" disabled>正在验真<span className="loading-dots">•••</span></button>}
          {phase === "success" && <button className="button primary full" onClick={onClose}>查看完成<Icon name="check" /></button>}
          {phase === "failed" && <a className="button primary full" href={platformUrl} target="_blank" rel="noreferrer">前往完成目标<Icon name="external" /></a>}
          <p><Icon name="lock" />Moncast cannot read your provider password or private TLS keys.</p>
        </footer>
      </div>
    </Modal>
  );
}
