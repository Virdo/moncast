"use client";

import { useState } from "react";
import { encodeDeployData, type Abi, type Address, type Hex } from "viem";
import { publicClient, walletClient, switchToMonadTestnet, type InjectedProvider } from "@/lib/moncast-chain";

type Artifact = { abi: Abi; bytecode: Hex };
type ArtifactSet = { MockUSDC: Artifact; AttestedProofVerifier: Artifact; MoncastProtocol: Artifact };

export default function DeployPage() {
  const [account, setAccount] = useState<Address>();
  const [attestor, setAttestor] = useState(process.env.NEXT_PUBLIC_INVITE_AUTHORITY_ADDRESS ?? "");
  const [status, setStatus] = useState("连接钱包后部署 3 个合约。每笔交易都需要钱包确认。");
  const [addresses, setAddresses] = useState<{ usdc?: Address; verifier?: Address; protocol?: Address }>({});
  const [busy, setBusy] = useState(false);

  async function connect() {
    const provider = window.ethereum as InjectedProvider | undefined;
    if (!provider) throw new Error("未检测到浏览器钱包");
    const accounts = await provider.request({ method: "eth_requestAccounts" }) as Address[];
    await switchToMonadTestnet(provider);
    setAccount(accounts[0]);
  }

  async function deployContract(provider: InjectedProvider, owner: Address, artifact: Artifact, args: readonly unknown[] = []) {
    const data = encodeDeployData({ abi: artifact.abi, bytecode: artifact.bytecode, args });
    const estimate = await publicClient.estimateGas({ account: owner, data });
    const hash = await walletClient(provider, owner).sendTransaction({ data, gas: estimate + estimate / 10n });
    const receipt = await publicClient.waitForTransactionReceipt({ hash, confirmations: 4 });
    if (receipt.status !== "success" || !receipt.contractAddress) throw new Error("部署交易失败");
    return receipt.contractAddress;
  }

  async function deployAll() {
    const provider = window.ethereum as InjectedProvider | undefined;
    const owner = account;
    if (!provider || !owner) throw new Error("请先连接钱包");
    if (!/^0x[a-fA-F0-9]{40}$/.test(attestor)) throw new Error("Attestor 地址无效");
    setBusy(true);
    try {
      const artifacts = await fetch("/deployment-artifacts.json").then((response) => {
        if (!response.ok) throw new Error("请先运行 npm run build:contracts");
        return response.json() as Promise<ArtifactSet>;
      });
      setStatus("1/3 部署 Moncast Test USDC…");
      const usdc = await deployContract(provider, owner, artifacts.MockUSDC);
      setAddresses({ usdc });
      setStatus("2/3 部署验真适配器…");
      const verifier = await deployContract(provider, owner, artifacts.AttestedProofVerifier, [attestor as Address]);
      setAddresses({ usdc, verifier });
      setStatus("3/3 部署 MoncastProtocol…");
      const protocol = await deployContract(provider, owner, artifacts.MoncastProtocol, [usdc, verifier, owner]);
      setAddresses({ usdc, verifier, protocol });
      setStatus("部署完成。复制下方地址写入 .env.local 后重启开发服务器。");
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
    <label>Attestor address<input value={attestor} onChange={(event) => setAttestor(event.target.value)} /></label>
    <div className="deploy-actions">
      <button className="button outline" onClick={() => void connect()}>{account ? `${account.slice(0, 7)}…${account.slice(-5)}` : "连接部署钱包"}</button>
      <button className="button primary" onClick={() => void deployAll()} disabled={!account || busy}>{busy ? "部署中" : "部署全部合约"}</button>
    </div>
    <dl>
      <div><dt>USDC</dt><dd>{addresses.usdc ?? "WAITING"}</dd></div>
      <div><dt>VERIFIER</dt><dd>{addresses.verifier ?? "WAITING"}</dd></div>
      <div><dt>PROTOCOL</dt><dd>{addresses.protocol ?? "WAITING"}</dd></div>
    </dl>
  </main>;
}
