export type ViewName = "plaza" | "mine" | "formulate" | "manifesto";
export type GoalType = "leetcode" | "duolingo" | "custom";
export type PactState = "verified" | "proving" | "locked" | "private";

export type PactSummary = {
  id: string;
  title: string;
  goalType: GoalType;
  state: PactState;
  isPrivate: boolean;
  durationDays: 7 | 14 | 30;
  remainingDays: number;
  recruiting: boolean;
  recruitmentLabel: string;
  stake: number;
  pool: number;
  slashPool: number;
  slashYield: string;
  members: number;
  maxMembers: number;
  rule: string;
  platformHandleHint: string;
  avatars: string[];
  username?: string;
};

export const pacts: PactSummary[] = [
  {
    id: "1042",
    title: "LeetCode Hard Core",
    goalType: "leetcode",
    state: "verified",
    isPrivate: false,
    durationDays: 14,
    recruiting: true,
    recruitmentLabel: "2 天 08 时",
    remainingDays: 11,
    stake: 100,
    pool: 5000,
    slashPool: 620,
    slashYield: "+12.4%",
    members: 42,
    maxMembers: 50,
    rule: "每日通过 1 道中等或困难题",
    platformHandleHint: "LeetCode 用户名",
    avatars: ["AL", "K7", "MX", "YN"],
  },
  {
    id: "1088",
    title: "Duolingo 30 Days Streak",
    goalType: "duolingo",
    state: "proving",
    isPrivate: false,
    durationDays: 30,
    recruiting: true,
    recruitmentLabel: "18 小时",
    remainingDays: 28,
    stake: 50,
    pool: 1250,
    slashPool: 50,
    slashYield: "+4.1%",
    members: 18,
    maxMembers: 24,
    rule: "每日新增 ≥ 50 XP 且保持连胜",
    platformHandleHint: "Duolingo 用户名",
    avatars: ["DU", "LI", "NG", "O!"],
  },
  {
    id: "0996",
    title: "Marathon Prep Elite",
    goalType: "custom",
    state: "locked",
    isPrivate: true,
    durationDays: 30,
    recruiting: false,
    recruitmentLabel: "已结束",
    remainingDays: 0,
    stake: 100,
    pool: 10000,
    slashPool: 2200,
    slashYield: "清算中",
    members: 102,
    maxMembers: 128,
    rule: "每日跑步 ≥ 5 km，经 HTTPS 训练 API 证明",
    platformHandleHint: "训练平台账户",
    avatars: ["5K", "PB", "42", "KM"],
  },
  {
    id: "1120",
    title: "七日算法晨练",
    goalType: "leetcode",
    state: "private",
    isPrivate: true,
    durationDays: 7,
    recruiting: true,
    recruitmentLabel: "6 天 03 时",
    remainingDays: 6,
    stake: 30,
    pool: 180,
    slashPool: 0,
    slashYield: "待形成",
    members: 6,
    maxMembers: 8,
    rule: "北京时间 09:00 前通过 1 题",
    platformHandleHint: "LeetCode 用户名",
    avatars: ["辰", "行", "知", "止"],
  },
  {
    id: "1156",
    title: "Build in Public Sprint",
    goalType: "custom",
    state: "verified",
    isPrivate: false,
    durationDays: 14,
    recruiting: true,
    recruitmentLabel: "1 天 11 时",
    remainingDays: 9,
    stake: 200,
    pool: 3600,
    slashPool: 400,
    slashYield: "+11.1%",
    members: 18,
    maxMembers: 20,
    rule: "每日提交 1 个带签名的构建日志",
    platformHandleHint: "公开构建档案",
    avatars: ["0X", "PR", "CI", "GM"],
  },
  {
    id: "1189",
    title: "法语 A2 冲刺队",
    goalType: "duolingo",
    state: "proving",
    isPrivate: false,
    durationDays: 30,
    recruiting: false,
    recruitmentLabel: "已结束",
    remainingDays: 21,
    stake: 50,
    pool: 1600,
    slashPool: 150,
    slashYield: "+9.3%",
    members: 32,
    maxMembers: 40,
    rule: "每日新增 ≥ 80 XP",
    platformHandleHint: "Duolingo 用户名",
    avatars: ["FR", "A2", "XP", "30"],
  },
];

export const categoryLabels: Record<"all" | GoalType, string> = {
  all: "全部",
  leetcode: "力扣 LeetCode",
  duolingo: "多邻国 Duolingo",
  custom: "自定义目标",
};

export const goalMeta: Record<GoalType, { label: string; short: string }> = {
  leetcode: { label: "力扣刷题", short: "LC" },
  duolingo: { label: "多邻国", short: "DUO" },
  custom: { label: "自定义验真", short: "API" },
};

export function heatmap(seed = 7, length = 84) {
  return Array.from({ length }, (_, index) => {
    const value = (index * 17 + seed * 13 + Math.floor(index / 7) * 5) % 11;
    return value < 2 ? 0 : value < 5 ? 1 : value < 8 ? 2 : 3;
  });
}
