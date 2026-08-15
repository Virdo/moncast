"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { parseEventLogs, type Address, type Hash } from "viem";
import { AppShell } from "@/components/AppShell";
import { CheckInModal } from "@/components/CheckInModal";
import { FormulateView, type LaunchPactInput } from "@/components/FormulateView";
import { JoinModal } from "@/components/JoinModal";
import { ManifestoView } from "@/components/ManifestoView";
import { MyPactsView } from "@/components/MyPactsView";
import { PlazaView } from "@/components/PlazaView";
import { Icon } from "@/components/Icon";
import { pacts, type GoalType, type PactLifecycle, type PactSummary, type ViewName } from "@/lib/pacts";
import {
  collateralTokenAbi,
  collateralTokenAddress,
  assertEarlyStartSupport,
  commitmentHash,
  inviteAuthorityAddress,
  moncastAddress,
  pactUrl,
  protocolAbi,
  publicClient,
  writeWithTightGas,
} from "@/lib/moncast-chain";
import { useMoncastWallet } from "@/lib/use-moncast-wallet";

type RegistryPact = {
  id: string;
  creator: Address;
  title: string;
  platform: GoalType;
  rule: string;
  durationDays: 7 | 14 | 30;
  recruitmentDays: number;
  recruitmentEndsAt: number;
  stake: 30 | 50 | 100 | 200;
  maxMembers: number;
  isPrivate: boolean;
  members: Array<{ address: Address; username: string }>;
};

function shortAddress(value?: string) {
  return value ? `${value.slice(0, 6)}…${value.slice(-4)}` : "";
}

function recruitmentLabel(endsAt: number) {
  const seconds = Math.max(0, Math.floor(endsAt - Date.now() / 1000));
  if (seconds === 0) return "待签约";
  const days = Math.floor(seconds / 86_400);
  const hours = Math.floor((seconds % 86_400) / 3_600);
  return days ? `${days} 天 ${hours} 时` : `${Math.max(1, hours)} 小时`;
}

const lifecycleByStatus: Record<number, PactLifecycle> = {
  1: "recruiting",
  2: "activating",
  3: "active",
  4: "cancelled",
  5: "finalized",
};

function toSummary(pact: RegistryPact, account?: Address, chainLifecycle?: PactLifecycle): PactSummary {
  const member = pact.members.find((item) => item.address.toLowerCase() === account?.toLowerCase());
  const lifecycle = chainLifecycle ?? (pact.recruitmentEndsAt > Date.now() / 1000 ? "recruiting" : "unknown");
  const recruiting = lifecycle === "recruiting";
  return {
    id: pact.id,
    title: pact.title,
    goalType: pact.platform,
    state: pact.isPrivate ? "private" : recruiting ? "proving" : "verified",
    isPrivate: pact.isPrivate,
    isCreator: pact.creator.toLowerCase() === account?.toLowerCase(),
    durationDays: pact.durationDays,
    remainingDays: pact.durationDays,
    recruiting,
    lifecycle,
    recruitmentLabel: recruitmentLabel(pact.recruitmentEndsAt),
    stake: pact.stake,
    pool: pact.members.length * pact.stake,
    slashPool: 0,
    slashYield: recruiting ? "待签订" : "自动验真中",
    members: pact.members.length,
    maxMembers: pact.maxMembers,
    rule: pact.rule,
    platformHandleHint: pact.platform === "leetcode" ? "LeetCode 用户名" : pact.platform === "duolingo" ? "Duolingo 用户名" : "验真账户",
    avatars: pact.members.slice(0, 4).map((item) => item.username.slice(0, 2).toUpperCase()),
    username: member?.username,
  };
}

export default function Home() {
  const [view, setView] = useState<ViewName>("plaza");
  const [joinPact, setJoinPact] = useState<PactSummary | null>(null);
  const [joinCode, setJoinCode] = useState("");
  const [checkInPact, setCheckInPact] = useState<PactSummary | null>(null);
  const [checkedIds, setCheckedIds] = useState<Set<string>>(new Set());
  const [startingPactId, setStartingPactId] = useState<string>();
  const [toast, setToast] = useState("");
  const [registry, setRegistry] = useState<RegistryPact[]>([]);
  const [chainLifecycles, setChainLifecycles] = useState<Record<string, PactLifecycle>>({});
  const wallet = useMoncastWallet(setToast);

  const refreshRegistry = useCallback(async () => {
    const response = await fetch("/api/registry", { cache: "no-store" }).catch(() => null);
    if (!response?.ok) return;
    const data = await response.json() as { pacts?: RegistryPact[] };
    setRegistry(data.pacts ?? []);
  }, []);

  const livePacts = useMemo(() => registry.map((item) => toSummary(item, wallet.account, chainLifecycles[item.id])), [chainLifecycles, registry, wallet.account]);
  const myPacts = useMemo(() => registry
    .filter((item) => item.creator.toLowerCase() === wallet.account?.toLowerCase()
      || item.members.some((member) => member.address.toLowerCase() === wallet.account?.toLowerCase()))
    .map((item) => toSummary(item, wallet.account, chainLifecycles[item.id])), [chainLifecycles, registry, wallet.account]);

  useEffect(() => {
    const configuredProtocol = moncastAddress;
    if (!configuredProtocol || !registry.length) return;
    let cancelled = false;
    void Promise.all(registry.map(async (pact) => {
      try {
        const state = await publicClient.readContract({ address: configuredProtocol, abi: protocolAbi, functionName: "pacts", args: [BigInt(pact.id)], blockTag: "safe" });
        return [pact.id, lifecycleByStatus[Number(state[21])] ?? "unknown"] as const;
      } catch {
        return [pact.id, "unknown"] as const;
      }
    })).then((entries) => {
      if (!cancelled) setChainLifecycles(Object.fromEntries(entries));
    });
    return () => { cancelled = true; };
  }, [registry]);

  useEffect(() => {
    const configuredProtocol = moncastAddress;
    if (!wallet.account || !configuredProtocol || !myPacts.length) return;
    let cancelled = false;
    void Promise.all(myPacts.filter((pact) => pact.lifecycle === "active").map(async (pact) => {
      try {
        const [epoch, open] = await publicClient.readContract({ address: configuredProtocol, abi: protocolAbi, functionName: "currentEpoch", args: [BigInt(pact.id)], blockTag: "safe" });
        if (!open) return null;
        const completed = await publicClient.readContract({ address: configuredProtocol, abi: protocolAbi, functionName: "completedEpoch", args: [BigInt(pact.id), wallet.account!, epoch], blockTag: "safe" });
        return completed ? pact.id : null;
      } catch { return null; }
    })).then((ids) => {
      if (!cancelled) setCheckedIds(new Set(ids.filter((id): id is string => Boolean(id))));
    });
    return () => { cancelled = true; };
  }, [myPacts, wallet.account]);

  useEffect(() => {
    const timer = window.setTimeout(() => { void refreshRegistry(); }, 0);
    return () => window.clearTimeout(timer);
  }, [refreshRegistry]);

  useEffect(() => {
    const timer = window.setTimeout(async () => {
      const params = new URLSearchParams(window.location.search);
      const requestedView = params.get("view") as ViewName | null;
      if (requestedView && ["plaza", "mine", "formulate", "manifesto"].includes(requestedView)) setView(requestedView);
      const joinId = params.get("join");
      const code = params.get("code");
      if (joinId && code) {
        setJoinCode(code);
        const response = await fetch("/api/registry", { cache: "no-store" }).catch(() => null);
        const records = response?.ok ? ((await response.json()) as { pacts?: RegistryPact[] }).pacts ?? [] : [];
        const record = records.find((item) => item.id === joinId);
        setJoinPact(record ? toSummary(record, wallet.account) : pacts.find((pact) => pact.id === joinId) ?? { ...pacts[3], id: joinId, title: "专属邀请契约" });
      }
    }, 0);
    return () => window.clearTimeout(timer);
  }, [wallet.account]);

  const navigate = useCallback((next: ViewName) => {
    setView(next);
    const url = new URL(window.location.href);
    url.search = next === "plaza" ? "" : `?view=${next}`;
    window.history.replaceState({}, "", url);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  const launchPact = useCallback(async (input: LaunchPactInput) => {
    const account = wallet.account ?? await wallet.connect();
    if (!account || !wallet.provider) throw new Error("请先连接个人钱包。");
    if (!moncastAddress) throw new Error("Moncast 测试网协议地址未配置，请先完成部署并重启服务。");
    if (!collateralTokenAddress) throw new Error("测试网 USDC 地址未配置，请填写水龙头对应的代币合约地址。");
    const stakeAmount = BigInt(input.stake) * 1_000_000n;
    setToast(`请授权 ${input.stake} USDC，招募结束后才会划转`);
    await writeWithTightGas(wallet.provider, account, collateralTokenAddress, collateralTokenAbi, "approve", [moncastAddress, stakeAmount]);

    const rule = input.target === "leetcode" ? "每日 AC ≥ 1" : input.target === "duolingo" ? "每日完成 ≥ 1 次学习并延续连胜" : input.rule;
    const metadataHash = commitmentHash({ title: input.title, target: input.target, schema: "moncast/1" });
    const ruleHash = commitmentHash({ rule, apiOrigin: input.target === "custom" ? new URL(input.apiUrl).origin : input.target });
    const inviteCode = input.mode === "private"
      ? `MONCAST-${crypto.getRandomValues(new Uint32Array(1))[0].toString(36).toUpperCase().slice(0, 7)}`
      : "OPEN";
    setToast("请确认发起契约交易；此时不会扣除保证金");
    const { hash, receipt } = await writeWithTightGas(wallet.provider, account, moncastAddress, protocolAbi, "createPact", [[
      metadataHash, ruleHash, inviteAuthorityAddress ?? account, input.duration,
      BigInt(input.recruitmentDays * 86_400), stakeAmount, input.maxMembers,
      -new Date().getTimezoneOffset(), input.mode === "private",
    ]]);
    const [created] = parseEventLogs({ abi: protocolAbi, logs: receipt.logs, eventName: "PactCreated", strict: true });
    if (!created) throw new Error("未找到 PactCreated 链上事件。");
    const pactId = created.args.pactId;
    const registration = await fetch("/api/registry", {
      method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify({
        action: "pact", transactionHash: hash, pactId: pactId.toString(), address: account,
        title: input.title, platform: input.target, username: input.handle, rule,
        durationDays: input.duration, recruitmentDays: input.recruitmentDays,
        recruitmentEndsAt: Number(created.args.recruitmentEndsAt), stake: input.stake,
        maxMembers: input.maxMembers, utcOffsetMinutes: -new Date().getTimezoneOffset(),
        isPrivate: input.mode === "private", inviteCode,
      }),
    });
    if (!registration.ok) throw new Error("链上契约已创建，但自动验真登记失败，请保存交易哈希。 ");
    await refreshRegistry();
    setToast(`契约 #${pactId} 已上链并开始招募`);
    return { shareUrl: pactUrl(pactId, inviteCode), transactionHash: hash as Hash };
  }, [refreshRegistry, wallet]);

  const startPactNow = useCallback(async (pact: PactSummary) => {
    const account = wallet.account ?? await wallet.connect();
    if (!account || !wallet.provider) throw new Error("请先连接个人钱包。");
    if (!moncastAddress) throw new Error("Moncast 测试网协议地址未配置。");
    if (!pact.isCreator) throw new Error("只有契约发起人可以立即开始。");
    await assertEarlyStartSupport();
    setStartingPactId(pact.id);
    setToast("请确认立即开始交易；确认后停止招募并划转当前成员保证金");
    try {
      const { receipt } = await writeWithTightGas(wallet.provider, account, moncastAddress, protocolAbi, "startPactNow", [BigInt(pact.id)]);
      const activated = parseEventLogs({ abi: protocolAbi, logs: receipt.logs, eventName: "PactActivated", strict: true })
        .some((event) => event.args.pactId === BigInt(pact.id));
      const cancelled = parseEventLogs({ abi: protocolAbi, logs: receipt.logs, eventName: "PactCancelled", strict: true })
        .some((event) => event.args.pactId === BigInt(pact.id));
      await refreshRegistry();
      if (activated) setToast(`契约 #${pact.id} 已停止招募并开始执行`);
      else if (cancelled) setToast("有效授权成员不足 2 人，契约已取消；已扣款成员可取回保证金");
      else setToast("交易已确认，正在同步契约状态");
    } catch (cause) {
      setToast(cause instanceof Error ? cause.message : "立即开始失败");
    } finally {
      setStartingPactId(undefined);
    }
  }, [refreshRegistry, wallet]);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(""), 3600);
    return () => window.clearTimeout(timer);
  }, [toast]);

  return (
    <AppShell view={view} onNavigate={navigate} wallet={shortAddress(wallet.account)} contractsReady={Boolean(moncastAddress && collateralTokenAddress)} onWallet={() => { void wallet.connect(); }} onDisconnect={() => { void wallet.disconnect(); }}>
      {view === "plaza" && <PlazaView livePacts={livePacts} onJoin={(pact) => { setJoinCode(pact.isPrivate ? "" : "OPEN"); setJoinPact(pact); }} onFormulate={() => navigate("formulate")} />}
      {view === "mine" && <MyPactsView pacts={myPacts} checkedIds={checkedIds} startingPactId={startingPactId} onCheckIn={setCheckInPact} onStartNow={startPactNow} onFormulate={() => navigate("formulate")} />}
      {view === "formulate" && <FormulateView onLaunch={launchPact} />}
      {view === "manifesto" && <ManifestoView />}

      {joinPact && <JoinModal pact={joinPact} inviteCode={joinCode} account={wallet.account} provider={wallet.provider} onWallet={wallet.connect} onClose={() => { setJoinPact(null); const url = new URL(window.location.href); url.search = ""; window.history.replaceState({}, "", url); }} onJoined={async () => { await refreshRegistry(); setToast("已加入招募；保证金将在招募结束后划转"); }} />}
      {checkInPact && <CheckInModal pact={checkInPact} account={wallet.account} provider={wallet.provider} alreadyCompleted={checkedIds.has(checkInPact.id)} onWallet={wallet.connect} onClose={() => setCheckInPact(null)} onSuccess={(pact) => { setCheckedIds((current) => new Set(current).add(pact.id)); setToast("证明已接受 · 今日契约已完成"); }} />}
      {toast && <div className="toast" role="status"><Icon name="check" />{toast}</div>}
    </AppShell>
  );
}
