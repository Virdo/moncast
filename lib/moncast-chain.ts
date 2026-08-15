import {
  createPublicClient,
  createWalletClient,
  custom,
  defineChain,
  encodeFunctionData,
  formatUnits,
  http,
  keccak256,
  parseAbi,
  stringToHex,
  type Abi,
  type Address,
  type EIP1193Provider,
  type Hash,
} from "viem";

export const monadTestnet = defineChain({
  id: 10_143,
  name: "Monad Testnet",
  nativeCurrency: { name: "MON", symbol: "MON", decimals: 18 },
  rpcUrls: { default: { http: [process.env.NEXT_PUBLIC_MONAD_RPC_URL || "https://testnet-rpc.monad.xyz"] } },
  blockExplorers: { default: { name: "Monadscan", url: "https://testnet.monadscan.com" } },
  testnet: true,
});

export const protocolAbi = parseAbi([
  "function PROTOCOL_VERSION() view returns (uint16)",
  "function createPact((bytes32 metadataHash,bytes32 ruleHash,address inviteAuthority,uint8 durationDays,uint40 recruitmentDuration,uint128 stakeAmount,uint16 maxMembers,int16 utcOffsetMinutes,bool isPrivate) config) returns (uint256 pactId)",
  "function joinPact(uint256 pactId,uint256 inviteNonce,uint256 inviteDeadline,bytes inviteSignature)",
  "function activateMembers(uint256 pactId,uint16 limit)",
  "function startPactNow(uint256 pactId)",
  "function complete(uint256 pactId,uint32 epoch,bytes32 nullifier,bytes32 publicInputsHash,bytes proof)",
  "function completeFor(uint256 pactId,address participant,uint32 epoch,bytes32 nullifier,bytes32 publicInputsHash,bytes proof)",
  "function currentEpoch(uint256 pactId) view returns (uint32 epoch,bool completionOpen)",
  "function pacts(uint256 pactId) view returns (address creator,address inviteAuthority,bytes32 metadataHash,bytes32 ruleHash,uint40 recruitmentEndsAt,uint32 startLocalDay,uint32 endLocalDay,uint128 stakeAmount,uint128 slashPool,uint128 yieldPool,uint128 claimedBonus,uint16 maxMembers,uint16 memberCount,uint16 activationCursor,uint16 fundedCount,uint16 processedCount,uint16 successfulCount,uint16 claimedSuccesses,uint8 durationDays,int16 utcOffsetMinutes,bool isPrivate,uint8 status)",
  "function completedEpoch(uint256 pactId,address participant,uint32 epoch) view returns (bool)",
  "function claim(uint256 pactId) returns (uint256 payout)",
  "function pactCount() view returns (uint256)",
  "event PactCreated(uint256 indexed pactId,address indexed creator,bytes32 indexed metadataHash,bytes32 ruleHash,uint40 recruitmentEndsAt,uint128 stakeAmount,uint16 maxMembers,bool isPrivate)",
  "event MemberEnrolled(uint256 indexed pactId,address indexed participant)",
  "event RecruitmentClosedEarly(uint256 indexed pactId,address indexed creator,uint40 scheduledEndsAt)",
  "event PactActivated(uint256 indexed pactId,uint32 startLocalDay,uint32 endLocalDay,uint16 fundedCount)",
  "event PactCancelled(uint256 indexed pactId,uint16 fundedCount)",
  "event Completed(uint256 indexed pactId,address indexed participant,uint32 indexed epoch,address relayer,bytes32 nullifier,bytes32 publicInputsHash)",
]);

export const collateralTokenAbi = parseAbi([
  "function balanceOf(address account) view returns (uint256)",
  "function allowance(address owner,address spender) view returns (uint256)",
  "function approve(address spender,uint256 amount) returns (bool)",
  "function decimals() view returns (uint8)",
]);

function configuredAddress(value: string | undefined) {
  return /^0x[a-fA-F0-9]{40}$/.test(value ?? "") ? value as Address : undefined;
}

export const moncastAddress = configuredAddress(process.env.NEXT_PUBLIC_MONCAST_CONTRACT_ADDRESS);
export const collateralTokenAddress = configuredAddress(process.env.NEXT_PUBLIC_USDC_ADDRESS);
export const verifierAddress = configuredAddress(process.env.NEXT_PUBLIC_VERIFIER_ADDRESS);
export const inviteAuthorityAddress = configuredAddress(process.env.NEXT_PUBLIC_INVITE_AUTHORITY_ADDRESS);

export const publicClient = createPublicClient({ chain: monadTestnet, transport: http(monadTestnet.rpcUrls.default.http[0]) });

export async function assertEarlyStartSupport() {
  if (!moncastAddress) throw new Error("Moncast 测试网协议地址未配置。");
  let version: number;
  try {
    version = Number(await publicClient.readContract({
      address: moncastAddress,
      abi: protocolAbi,
      functionName: "PROTOCOL_VERSION",
      blockTag: "latest",
    }));
  } catch (cause) {
    const detail = cause instanceof Error
      ? ("shortMessage" in cause && typeof cause.shortMessage === "string" ? cause.shortMessage : cause.message)
      : "未知 RPC 错误";
    throw new Error(`无法读取当前 Moncast 协议版本（${moncastAddress}）。请检查 RPC 与本地环境配置：${detail}`);
  }
  if (version < 2) {
    throw new Error("当前契约属于旧版主协议，不支持立即开始。请部署新版主协议后重新发起契约；旧契约仍可等待招募结束后自动签订。");
  }
  return version;
}

export type InjectedProvider = EIP1193Provider & {
  on?: (event: string, listener: (...args: unknown[]) => void) => void;
  removeListener?: (event: string, listener: (...args: unknown[]) => void) => void;
};

export function walletClient(provider: InjectedProvider, account: Address) {
  return createWalletClient({ account, chain: monadTestnet, transport: custom(provider) });
}

export async function switchToMonadTestnet(provider: InjectedProvider) {
  try {
    await provider.request({ method: "wallet_switchEthereumChain", params: [{ chainId: "0x279f" }] });
  } catch (error) {
    const code = typeof error === "object" && error && "code" in error ? Number(error.code) : 0;
    if (code !== 4902) throw error;
    await provider.request({
      method: "wallet_addEthereumChain",
      params: [{
        chainId: "0x279f",
        chainName: monadTestnet.name,
        nativeCurrency: monadTestnet.nativeCurrency,
        rpcUrls: monadTestnet.rpcUrls.default.http,
        blockExplorerUrls: [monadTestnet.blockExplorers.default.url],
      }],
    });
  }
}

export async function writeWithTightGas(
  provider: InjectedProvider,
  account: Address,
  address: Address,
  abi: Abi,
  functionName: string,
  args: readonly unknown[] = [],
) {
  const data = encodeFunctionData({ abi, functionName, args });
  const estimate = await publicClient.estimateGas({ account, to: address, data });
  const gas = estimate + estimate / 10n;
  const hash = await walletClient(provider, account).sendTransaction({ to: address, data, gas });
  const receipt = await publicClient.waitForTransactionReceipt({ hash, confirmations: 4 });
  if (receipt.status !== "success") throw new Error("链上交易执行失败");
  return { hash, receipt, gas };
}

export async function readWalletBalances(account: Address) {
  const [mon, usdc] = await Promise.all([
    publicClient.getBalance({ address: account, blockTag: "safe" }),
    collateralTokenAddress
      ? publicClient.readContract({ address: collateralTokenAddress, abi: collateralTokenAbi, functionName: "balanceOf", args: [account], blockTag: "safe" })
      : Promise.resolve(0n),
  ]);
  return { mon: formatUnits(mon, 18), usdc: formatUnits(usdc, 6) };
}

export function commitmentHash(value: unknown) {
  return keccak256(stringToHex(JSON.stringify(value)));
}

export function txUrl(hash: Hash) {
  return `${monadTestnet.blockExplorers.default.url}/tx/${hash}`;
}

export function pactUrl(id: bigint | number | string, code: string) {
  if (typeof window === "undefined") return `?join=${id}&code=${encodeURIComponent(code)}`;
  return `${window.location.origin}${window.location.pathname}?join=${id}&code=${encodeURIComponent(code)}`;
}
