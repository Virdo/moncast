"use client";

import { useCallback, useEffect, useState } from "react";
import type { Address, Hash } from "viem";
import {
  moncastAddress,
  readWalletBalances,
  switchToMonadTestnet,
  testUsdcAbi,
  testUsdcAddress,
  type InjectedProvider,
  writeWithTightGas,
} from "./moncast-chain";

declare global {
  interface Window {
    ethereum?: InjectedProvider;
  }
}

type WalletState = {
  account?: Address;
  monBalance: string;
  usdcBalance: string;
  connecting: boolean;
  claiming: boolean;
  lastTransaction?: Hash;
};

const initialState: WalletState = { monBalance: "0", usdcBalance: "0", connecting: false, claiming: false };

export function useMoncastWallet(onNotice: (message: string) => void) {
  const [state, setState] = useState<WalletState>(initialState);

  const refresh = useCallback(async (account?: Address) => {
    if (!account) return;
    const balances = await readWalletBalances(account).catch(() => null);
    if (balances) setState((current) => ({ ...current, ...balances }));
  }, []);

  const claimTestUsdc = useCallback(async (account: Address) => {
    const provider = window.ethereum;
    if (!provider || !testUsdcAddress) return;
    const alreadyClaimed = await (async () => {
      const { publicClient } = await import("./moncast-chain");
      return publicClient.readContract({ address: testUsdcAddress, abi: testUsdcAbi, functionName: "claimed", args: [account], blockTag: "safe" });
    })().catch(() => true);
    if (alreadyClaimed) return;
    setState((current) => ({ ...current, claiming: true }));
    try {
      onNotice("请在钱包确认领取 1,000 mtUSDC 测试币");
      const { hash } = await writeWithTightGas(provider, account, testUsdcAddress, testUsdcAbi, "claim");
      setState((current) => ({ ...current, claiming: false, lastTransaction: hash }));
      await refresh(account);
      onNotice("1,000 mtUSDC 已真实发放到钱包");
    } catch {
      setState((current) => ({ ...current, claiming: false }));
      onNotice("测试币领取已取消，可稍后点击钱包区域重试");
    }
  }, [onNotice, refresh]);

  const connect = useCallback(async () => {
    const provider = window.ethereum;
    if (!provider) {
      onNotice("未检测到个人钱包，请安装 MetaMask、Rabby 或兼容钱包");
      return undefined;
    }
    setState((current) => ({ ...current, connecting: true }));
    try {
      const accounts = await provider.request({ method: "eth_requestAccounts" }) as Address[];
      const account = accounts[0];
      if (!account) return undefined;
      await switchToMonadTestnet(provider);
      setState((current) => ({ ...current, account, connecting: false }));
      await refresh(account);
      onNotice(moncastAddress ? "钱包已连接 Monad 测试网" : "钱包已连接；合约地址尚待部署写入");
      if (testUsdcAddress) await claimTestUsdc(account);
      return account;
    } catch {
      setState((current) => ({ ...current, connecting: false }));
      onNotice("钱包连接或切换网络已取消");
      return undefined;
    }
  }, [claimTestUsdc, onNotice, refresh]);

  useEffect(() => {
    const provider = window.ethereum;
    if (!provider) return;
    const onAccounts = (...args: unknown[]) => {
      const accounts = (args[0] ?? []) as Address[];
      const account = accounts[0];
      setState((current) => ({ ...current, account }));
      void refresh(account);
    };
    provider.on?.("accountsChanged", onAccounts);
    void provider.request({ method: "eth_accounts" }).then((accounts) => {
      const account = (accounts as Address[])[0];
      if (account) {
        setState((current) => ({ ...current, account }));
        void refresh(account);
      }
    });
    return () => provider.removeListener?.("accountsChanged", onAccounts);
  }, [refresh]);

  return { ...state, connect, refresh, claimTestUsdc, provider: typeof window === "undefined" ? undefined : window.ethereum };
}
