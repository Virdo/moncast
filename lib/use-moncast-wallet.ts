"use client";

import { useCallback, useEffect, useState } from "react";
import type { Address } from "viem";
import {
  moncastAddress,
  readWalletBalances,
  switchToMonadTestnet,
  type InjectedProvider,
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
};

const initialState: WalletState = { monBalance: "0", usdcBalance: "0", connecting: false };
const manualDisconnectKey = "moncast.wallet.manually-disconnected";

function setManualDisconnect(value: boolean) {
  try {
    if (value) window.localStorage.setItem(manualDisconnectKey, "1");
    else window.localStorage.removeItem(manualDisconnectKey);
  } catch {
    // Wallet state still works when browser storage is unavailable.
  }
}

function isManuallyDisconnected() {
  try {
    return window.localStorage.getItem(manualDisconnectKey) === "1";
  } catch {
    return false;
  }
}

function providerErrorCode(error: unknown) {
  return typeof error === "object" && error && "code" in error ? Number(error.code) : undefined;
}

export function useMoncastWallet(onNotice: (message: string) => void) {
  const [state, setState] = useState<WalletState>(initialState);

  const refresh = useCallback(async (account?: Address) => {
    if (!account) return;
    const balances = await readWalletBalances(account).catch(() => null);
    if (balances) setState((current) => current.account?.toLowerCase() === account.toLowerCase()
      ? { ...current, ...balances }
      : current);
  }, []);

  const connect = useCallback(async () => {
    const provider = window.ethereum;
    if (!provider) {
      onNotice("未检测到个人钱包，请安装 MetaMask、Rabby 或兼容钱包");
      return undefined;
    }
    setState((current) => ({ ...current, connecting: true }));
    try {
      try {
        await provider.request({ method: "wallet_requestPermissions", params: [{ eth_accounts: {} }] });
      } catch (error) {
        const code = providerErrorCode(error);
        if (code !== 4200 && code !== -32601) throw error;
      }
      const accounts = await provider.request({ method: "eth_requestAccounts" }) as Address[];
      const account = accounts[0];
      if (!account) return undefined;
      await switchToMonadTestnet(provider);
      setManualDisconnect(false);
      setState((current) => ({ ...current, account, connecting: false }));
      await refresh(account);
      onNotice(moncastAddress ? "钱包已连接 Monad 测试网" : "钱包已连接；合约地址尚待部署写入");
      return account;
    } catch {
      setState((current) => ({ ...current, connecting: false }));
      onNotice("钱包连接或切换网络已取消");
      return undefined;
    }
  }, [onNotice, refresh]);

  const disconnect = useCallback(async () => {
    const provider = window.ethereum;
    setManualDisconnect(true);
    setState(initialState);
    if (provider) {
      try {
        await provider.request({ method: "wallet_revokePermissions", params: [{ eth_accounts: {} }] });
      } catch {
        // Some injected wallets only support an app-local disconnect.
      }
    }
    onNotice("钱包已退出；再次连接时可重新选择授权账户");
  }, [onNotice]);

  useEffect(() => {
    const provider = window.ethereum;
    if (!provider) return;
    const onAccounts = (...args: unknown[]) => {
      const accounts = (args[0] ?? []) as Address[];
      const account = accounts[0];
      if (!account) {
        setState(initialState);
        return;
      }
      if (isManuallyDisconnected()) return;
      setState((current) => ({ ...current, account }));
      void refresh(account);
    };
    provider.on?.("accountsChanged", onAccounts);
    void provider.request({ method: "eth_accounts" }).then((accounts) => {
      const account = (accounts as Address[])[0];
      if (account && !isManuallyDisconnected()) {
        setState((current) => ({ ...current, account }));
        void refresh(account);
      }
    });
    return () => provider.removeListener?.("accountsChanged", onAccounts);
  }, [refresh]);

  return { ...state, connect, disconnect, refresh, provider: typeof window === "undefined" ? undefined : window.ethereum };
}
