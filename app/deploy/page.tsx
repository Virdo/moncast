"use client";

import { useState } from "react";
import { encodeDeployData, type Abi, type Address, type Hex } from "viem";
import { collateralTokenAbi, collateralTokenAddress, publicClient, verifierAddress, walletClient, type InjectedProvider } from "@/lib/moncast-chain";
import { useMoncastWallet } from "@/lib/use-moncast-wallet";

type Artifact = { abi: Abi; bytecode: Hex };
type ArtifactSet = { AttestedProofVerifier: Artifact; MoncastProtocol: Artifact };

export default function DeployPage() {
  const [attestor, setAttestor] = useState(process.env.NEXT_PUBLIC_INVITE_AUTHORITY_ADDRESS ?? "");
  const [collateral, setCollateral] = useState(collateralTokenAddress ?? "");
  const [verifier, setVerifier] = useState(verifierAddress ?? "");
  const [status, setStatus] = useState("首次部署需要 2 笔交易；已有验证器时可仅更新主协议，需 1 笔交易。");
  const [addresses, setAddresses] = useState<{ usdc?: Address; verifier?: Address; protocol?: Address }>({
    usdc: /^0x[a-fA-F0-9]{40}$/.test(collateral) ? collateral as Address : undefined,
    verifier: verifierAddress,
  });
  const [busy, setBusy] = useState(false);
  const wallet = useMoncastWallet(setStatus);

  async function deployContract(provider: InjectedProvider, owner: Address, artifact: Artifact, args: readonly unknown[] = []) {
    const data = encodeDeployData({ abi: artifact.abi, bytecode: artifact.bytecode, args });
    const estimate = await publicClient.estimateGas({ account: owner, data });
    const hash = await walletClient(provider, owner).sendTransaction({ data, gas: estimate + estimate / 10n });
    const receipt = await publicClient.waitForTransactionReceipt({ hash, confirmations: 4 });
    if (receipt.status !== "success" || !receipt.contractAddress) throw new Error("部署交易失败");
    return receipt.contractAddress;
  }

  async function deployAll() {
    const provider = wallet.provider;
    const owner = wallet.account;
    if (!provider || !owner) throw new Error("请先连接钱包");
    if (!/^0x[a-fA-F0-9]{40}$/.test(attestor)) throw new Error("Attestor 地址无效");
    if (!/^0x[a-fA-F0-9]{40}$/.test(collateral)) throw new Error("测试网 USDC 合约地址无效");
    setBusy(true);
    try {
      const artifacts = await fetch("/deployment-artifacts.json").then((response) => {
        if (!response.ok) throw new Error("请先运行 npm run build:contracts");
        return response.json() as Promise<ArtifactSet>;
      });
      const usdc = collateral as Address;
      const [code, decimals] = await Promise.all([
        publicClient.getBytecode({ address: usdc, blockTag: "safe" }),
        publicClient.readContract({ address: usdc, abi: collateralTokenAbi, functionName: "decimals", blockTag: "safe" }),
      ]);
      if (!code || code === "0x") throw new Error("该 USDC 地址在 Monad 测试网上没有合约代码");
      if (decimals !== 6) throw new Error("抵押币必须使用 6 位小数的测试网 USDC");
      setAddresses({ usdc });
      setStatus("1/2 部署验真适配器…");
      const verifier = await deployContract(provider, owner, artifacts.AttestedProofVerifier, [attestor as Address]);
      setAddresses({ usdc, verifier });
      setStatus("2/2 部署 MoncastProtocol…");
      const protocol = await deployContract(provider, owner, artifacts.MoncastProtocol, [usdc, verifier, owner]);
      setAddresses({ usdc, verifier, protocol });
      setStatus("部署完成。复制下方地址写入 .env.local 后重启开发服务器。");
    } catch (cause) {
      setStatus(cause instanceof Error ? cause.message : "部署失败");
    } finally {
      setBusy(false);
    }
  }

  async function deployProtocolOnly() {
    const provider = wallet.provider;
    const owner = wallet.account;
    if (!provider || !owner) throw new Error("请先连接钱包");
    if (!/^0x[a-fA-F0-9]{40}$/.test(collateral)) throw new Error("测试网 USDC 合约地址无效");
    if (!/^0x[a-fA-F0-9]{40}$/.test(verifier)) throw new Error("Verifier 地址无效");
    setBusy(true);
    try {
      const artifacts = await fetch("/deployment-artifacts.json").then((response) => {
        if (!response.ok) throw new Error("请先运行 npm run build:contracts");
        return response.json() as Promise<ArtifactSet>;
      });
      const usdc = collateral as Address;
      const verifierContract = verifier as Address;
      const [usdcCode, verifierCode, decimals] = await Promise.all([
        publicClient.getBytecode({ address: usdc, blockTag: "safe" }),
        publicClient.getBytecode({ address: verifierContract, blockTag: "safe" }),
        publicClient.readContract({ address: usdc, abi: collateralTokenAbi, functionName: "decimals", blockTag: "safe" }),
      ]);
      if (!usdcCode || usdcCode === "0x" || decimals !== 6) throw new Error("USDC 地址无效或不是 6 位小数");
      if (!verifierCode || verifierCode === "0x") throw new Error("Verifier 地址没有合约代码");
      setStatus("部署新版 MoncastProtocol…");
      const protocol = await deployContract(provider, owner, artifacts.MoncastProtocol, [usdc, verifierContract, owner]);
      setAddresses({ usdc, verifier: verifierContract, protocol });
      setStatus("主协议更新完成。保存新 PROTOCOL 地址并重启开发服务器。");
    } catch (cause) {
      setStatus(cause instanceof Error ? cause.message : "部署失败");
    } finally {
      setBusy(false);
    }
  }

  return <main className="deploy-console">
    <span>MONCAST / TESTNET DEPLOYER</span>
    <h1>Monad Testnet 部署</h1>
    <p>{status}</p>
    <label>Testnet USDC address<input value={collateral} onChange={(event) => setCollateral(event.target.value)} placeholder="0x…（水龙头对应代币）" /></label>
    <label>Attestor address<input value={attestor} onChange={(event) => setAttestor(event.target.value)} /></label>
    <label>Existing verifier address<input value={verifier} onChange={(event) => setVerifier(event.target.value)} /></label>
    <div className="deploy-actions">
      <button className="button outline" onClick={() => { void (wallet.account ? wallet.disconnect() : wallet.connect()); }}>{wallet.account ? `退出 ${wallet.account.slice(0, 7)}…${wallet.account.slice(-5)}` : "连接部署钱包"}</button>
      <button className="button primary" onClick={() => void deployAll()} disabled={!wallet.account || busy}>{busy ? "部署中" : "部署 Moncast"}</button>
      <button className="button primary" onClick={() => void deployProtocolOnly()} disabled={!wallet.account || busy}>{busy ? "部署中" : "仅更新主协议"}</button>
    </div>
    <dl>
      <div><dt>USDC</dt><dd>{addresses.usdc ?? "WAITING"}</dd></div>
      <div><dt>VERIFIER</dt><dd>{addresses.verifier ?? "WAITING"}</dd></div>
      <div><dt>PROTOCOL</dt><dd>{addresses.protocol ?? "WAITING"}</dd></div>
    </dl>
  </main>;
}
