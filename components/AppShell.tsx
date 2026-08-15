"use client";

import type { ReactNode } from "react";
import Image from "next/image";
import type { ViewName } from "@/lib/pacts";
import { Icon, type IconName } from "./Icon";

const navigation: Array<{ id: ViewName; label: string; en: string; icon: IconName }> = [
  { id: "plaza", label: "契约广场", en: "Pact Plaza", icon: "plaza" },
  { id: "mine", label: "我的契约", en: "My Pacts", icon: "check" },
  { id: "manifesto", label: "协议说明", en: "How it works", icon: "terminal" },
];

export function AppShell({ view, onNavigate, wallet, contractsReady, onWallet, children }: {
  view: ViewName;
  onNavigate: (view: ViewName) => void;
  wallet: string;
  contractsReady: boolean;
  onWallet: () => void;
  children: ReactNode;
}) {
  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand-block">
          <div className="brand-lockup">
            <Image className="brand-logo" src="/moncast-mark.svg" alt="" width={44} height={44} priority />
            <div><strong>MONCAST</strong><small>ONCHAIN COMMITMENT PROTOCOL</small></div>
          </div>
          <button className="button primary full launch-pact" onClick={() => onNavigate("formulate")}><Icon name="plus" />发起契约</button>
        </div>
        <nav className="side-nav" aria-label="主导航">
          {navigation.map((item) => (
            <button key={item.id} className={view === item.id ? "active" : ""} onClick={() => onNavigate(item.id)}>
              <Icon name={item.icon} /><span>{item.label}<small>{item.en}</small></span>
            </button>
          ))}
        </nav>
        <div className="sidebar-foot">
          <span className="network-pulse"><i /> MONAD TESTNET · 10143</span>
          <button className="wallet-control" onClick={onWallet}>
            <Icon name="wallet" />
            <span>{wallet || "连接个人钱包"}<small>{wallet ? contractsReady ? "已连接 · Monad 测试网" : "已连接 · 合约待配置" : "测试币请从官方水龙头领取"}</small></span>
          </button>
        </div>
      </aside>
      <header className="mobile-header">
        <button className="mobile-brand" onClick={() => onNavigate("plaza")} aria-label="返回契约广场"><Image className="brand-logo" src="/moncast-mark.svg" alt="" width={32} height={32} priority />MONCAST</button>
        <button className="icon-button" onClick={onWallet} aria-label="连接钱包"><Icon name="wallet" /></button>
      </header>
      <main className="main-canvas">{children}</main>
      <nav className="mobile-nav" aria-label="移动端主导航">
        {navigation.map((item) => (
          <button key={item.id} className={view === item.id ? "active" : ""} onClick={() => onNavigate(item.id)} aria-label={item.label}>
            <Icon name={item.icon} /><small>{item.label.slice(0, 2)}</small>
          </button>
        ))}
      </nav>
      <button className="mobile-launch" onClick={() => onNavigate("formulate")} aria-label="发起契约"><Icon name="plus" /></button>
    </div>
  );
}
