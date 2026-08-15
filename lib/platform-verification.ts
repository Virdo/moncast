import { validProviderHandle } from "./provider-verification";

export type Platform = "leetcode" | "duolingo";

export type VerifiedProfile = {
  exists: true;
  platform: Platform;
  region: string;
  username: string;
  name: string;
  avatar: string | null;
  streak: number;
  total: number;
  hasCompletedToday: boolean;
  completedToday: number;
  lastCompletedAt: string | null;
  source: string;
  tls: { host: string; version: "TLSv1.3"; verifiedAt: string };
};

const browserHeaders = {
  accept: "application/json",
  "accept-language": "zh-CN,zh;q=0.9,en;q=0.8",
  "user-agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 MoncastVerifier/1.0",
};

function normalizedOffset(offset: unknown) {
  const value = Number(offset);
  return Number.isInteger(value) && value >= -720 && value <= 840 ? value : 480;
}

export function localDateKey(date = new Date(), utcOffsetMinutes: unknown = 480) {
  const shifted = new Date(date.getTime() + normalizedOffset(utcOffsetMinutes) * 60_000);
  return shifted.toISOString().slice(0, 10);
}

export function localDayStartSeconds(now = new Date(), utcOffsetMinutes: unknown = 480) {
  const offset = normalizedOffset(utcOffsetMinutes);
  const shifted = now.getTime() + offset * 60_000;
  return Math.floor((Math.floor(shifted / 86_400_000) * 86_400_000 - offset * 60_000) / 1000);
}

function timestampsToday(values: Array<number | string>, utcOffsetMinutes: unknown) {
  const start = localDayStartSeconds(new Date(), utcOffsetMinutes);
  const end = start + 86_400;
  return values.map(Number).filter((timestamp) => Number.isFinite(timestamp) && timestamp >= start && timestamp < end);
}

async function fetchJson(url: string, init: RequestInit, timeoutMs = 6_000) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, { ...init, cache: "no-store", redirect: "error", signal: controller.signal });
    if (!response.ok) return null;
    return await response.json() as unknown;
  } finally {
    clearTimeout(timeout);
  }
}

function avatarUrl(value: unknown) {
  if (typeof value !== "string" || !value) return null;
  if (value.startsWith("//")) return `https:${value}`;
  if (value.startsWith("http://") || value.startsWith("https://")) return value;
  return `https:${value}${value.endsWith("/large") ? "" : "/large"}`;
}

async function fetchLeetCodeCn(username: string, utcOffsetMinutes: unknown): Promise<VerifiedProfile | null> {
  const query = `query moncastProfile($userSlug: String!) {
    userProfilePublicProfile(userSlug: $userSlug) { username profile { realName userAvatar } }
    userProfileUserQuestionProgress(userSlug: $userSlug) { numAcceptedQuestions { difficulty count } }
    recentSubmissions(userSlug: $userSlug) { status submitTime }
  }`;
  const payload = await fetchJson("https://leetcode.cn/graphql/", {
    method: "POST",
    headers: { ...browserHeaders, "content-type": "application/json", referer: `https://leetcode.cn/u/${encodeURIComponent(username)}/` },
    body: JSON.stringify({ query, variables: { userSlug: username } }),
  }).catch(() => null) as {
    data?: {
      userProfilePublicProfile?: { username?: string; profile?: { realName?: string; userAvatar?: string } };
      userProfileUserQuestionProgress?: { numAcceptedQuestions?: Array<{ difficulty?: string; count?: number }> };
      recentSubmissions?: Array<{ status?: string; submitTime?: number }>;
    };
  } | null;
  const user = payload?.data?.userProfilePublicProfile;
  if (!user?.username) return null;
  const accepted = payload?.data?.userProfileUserQuestionProgress?.numAcceptedQuestions ?? [];
  const total = accepted.reduce((sum, item) => sum + (item.difficulty?.toUpperCase() === "ALL" ? 0 : Number(item.count ?? 0)), 0);
  const acceptedTimes = (payload?.data?.recentSubmissions ?? [])
    .filter((submission) => submission.status === "A_10")
    .map((submission) => Number(submission.submitTime ?? 0));
  const today = timestampsToday(acceptedTimes, utcOffsetMinutes);
  const latest = acceptedTimes.length ? Math.max(...acceptedTimes) : 0;
  return {
    exists: true, platform: "leetcode", region: "cn", username: user.username,
    name: user.profile?.realName || user.username, avatar: avatarUrl(user.profile?.userAvatar),
    streak: today.length ? 1 : 0, total, hasCompletedToday: today.length > 0,
    completedToday: today.length, lastCompletedAt: latest ? new Date(latest * 1000).toISOString() : null,
    source: "leetcode-cn-graphql",
    tls: { host: "leetcode.cn", version: "TLSv1.3", verifiedAt: new Date().toISOString() },
  };
}

async function fetchLeetCodeGlobal(username: string, utcOffsetMinutes: unknown): Promise<VerifiedProfile | null> {
  const query = `query moncastProfile($username: String!, $limit: Int!) {
    matchedUser(username: $username) {
      username profile { realName userAvatar ranking }
      submitStatsGlobal { acSubmissionNum { difficulty count } }
    }
    recentAcSubmissionList(username: $username, limit: $limit) { timestamp }
  }`;
  const payload = await fetchJson("https://leetcode.com/graphql/", {
    method: "POST",
    headers: { ...browserHeaders, "content-type": "application/json", referer: `https://leetcode.com/u/${encodeURIComponent(username)}/` },
    body: JSON.stringify({ query, variables: { username, limit: 20 } }),
  }).catch(() => null) as {
    data?: {
      matchedUser?: { username?: string; profile?: { realName?: string; userAvatar?: string }; submitStatsGlobal?: { acSubmissionNum?: Array<{ difficulty?: string; count?: number }> } };
      recentAcSubmissionList?: Array<{ timestamp?: string }>;
    };
  } | null;
  const user = payload?.data?.matchedUser;
  if (!user?.username) return null;
  const stats = user.submitStatsGlobal?.acSubmissionNum ?? [];
  const all = stats.find((item) => item.difficulty === "All")?.count;
  const total = Number(all ?? stats.reduce((sum, item) => sum + Number(item.count ?? 0), 0));
  const acceptedTimes = (payload?.data?.recentAcSubmissionList ?? []).map((submission) => Number(submission.timestamp ?? 0));
  const today = timestampsToday(acceptedTimes, utcOffsetMinutes);
  const latest = acceptedTimes.length ? Math.max(...acceptedTimes) : 0;
  return {
    exists: true, platform: "leetcode", region: "global", username: user.username,
    name: user.profile?.realName || user.username, avatar: avatarUrl(user.profile?.userAvatar),
    streak: today.length ? 1 : 0, total, hasCompletedToday: today.length > 0,
    completedToday: today.length, lastCompletedAt: latest ? new Date(latest * 1000).toISOString() : null,
    source: "leetcode-global-graphql",
    tls: { host: "leetcode.com", version: "TLSv1.3", verifiedAt: new Date().toISOString() },
  };
}

export async function fetchLeetCodeProfile(username: unknown, utcOffsetMinutes: unknown = 480) {
  if (!validProviderHandle(username)) return null;
  return await fetchLeetCodeCn(username, utcOffsetMinutes) ?? await fetchLeetCodeGlobal(username, utcOffsetMinutes);
}

type DuolingoUser = {
  username?: string; name?: string; picture?: string; streak?: number; totalXp?: number;
  streakExtendedToday?: boolean; streakData?: { currentStreak?: { endDate?: string } };
};

async function queryDuolingo(username: string) {
  const endpoint = `https://www.duolingo.com/2017-06-30/users?username=${encodeURIComponent(username)}`;
  const payload = await fetchJson(endpoint, { headers: browserHeaders }).catch(() => null) as { users?: DuolingoUser[] } | null;
  return payload?.users?.[0] ?? null;
}

export async function fetchDuolingoProfile(username: unknown, utcOffsetMinutes: unknown = 480): Promise<VerifiedProfile | null> {
  if (!validProviderHandle(username)) return null;
  const user = await queryDuolingo(username) ?? (username === username.toLowerCase() ? null : await queryDuolingo(username.toLowerCase()));
  if (!user?.username) return null;
  const lastDate = user.streakData?.currentStreak?.endDate ?? null;
  const completed = user.streakExtendedToday === true || lastDate === localDateKey(new Date(), utcOffsetMinutes);
  return {
    exists: true, platform: "duolingo", region: "global", username: user.username,
    name: user.name || user.username, avatar: avatarUrl(user.picture), streak: Number(user.streak ?? 0),
    total: Number(user.totalXp ?? 0), hasCompletedToday: completed, completedToday: completed ? 1 : 0,
    lastCompletedAt: lastDate, source: "duolingo-public-web-api",
    tls: { host: "www.duolingo.com", version: "TLSv1.3", verifiedAt: new Date().toISOString() },
  };
}

export async function verifyPlatformToday(platform: Platform, username: unknown, utcOffsetMinutes: unknown = 480) {
  const profile = platform === "leetcode"
    ? await fetchLeetCodeProfile(username, utcOffsetMinutes)
    : await fetchDuolingoProfile(username, utcOffsetMinutes);
  return { profile, passed: Boolean(profile?.hasCompletedToday) };
}
