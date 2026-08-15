const PRIVATE_HOST_PATTERNS = [
  /^localhost$/i,
  /^127\./,
  /^10\./,
  /^192\.168\./,
  /^169\.254\./,
  /^172\.(1[6-9]|2\d|3[01])\./,
  /^\[?::1\]?$/,
  /^0\.0\.0\.0$/,
];

export function validProviderHandle(value: unknown): value is string {
  return typeof value === "string" && /^[\p{L}\p{N}_.-]{2,32}$/u.test(value);
}

export function approvedCustomUrl(value: unknown, allowlist: string[]) {
  if (typeof value !== "string" || value.length > 500) return null;
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return null;
  }
  if (url.protocol !== "https:" || url.username || url.password || url.port) return null;
  if (PRIVATE_HOST_PATTERNS.some((pattern) => pattern.test(url.hostname))) return null;
  if (!allowlist.includes(url.origin)) return null;
  return url;
}

export function readJsonPath(payload: unknown, path: string): unknown {
  if (!/^data(?:\.[A-Za-z_][A-Za-z0-9_]*){1,6}$/.test(path)) return undefined;
  return path.split(".").slice(1).reduce<unknown>((value, key) => {
    if (!value || typeof value !== "object" || Array.isArray(value)) return undefined;
    return (value as Record<string, unknown>)[key];
  }, payload);
}

export function evaluateNumericRule(payload: unknown, expression: string) {
  const match = expression.trim().match(/^(data(?:\.[A-Za-z_][A-Za-z0-9_]*){1,6})\s*(>=|<=|==|>|<)\s*(-?\d+(?:\.\d+)?)$/);
  if (!match) return { valid: false, passed: false, actual: undefined };
  const [, path, operator, expectedRaw] = match;
  const actual = readJsonPath(payload, path);
  const expected = Number(expectedRaw);
  if (typeof actual !== "number" || !Number.isFinite(actual)) return { valid: true, passed: false, actual };
  const passed = operator === ">=" ? actual >= expected
    : operator === "<=" ? actual <= expected
      : operator === ">" ? actual > expected
        : operator === "<" ? actual < expected
          : actual === expected;
  return { valid: true, passed, actual };
}

export function deriveDailyStreak(calendar: string | null | undefined) {
  if (!calendar) return 0;
  let values: Record<string, number>;
  try {
    values = JSON.parse(calendar) as Record<string, number>;
  } catch {
    return 0;
  }
  const activeDays = new Set(Object.entries(values).filter(([, count]) => count > 0).map(([timestamp]) => {
    const date = new Date(Number(timestamp) * 1000);
    return Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()) / 86400000;
  }));
  let cursor = Math.floor(Date.now() / 86400000);
  if (!activeDays.has(cursor)) cursor -= 1;
  let streak = 0;
  while (activeDays.has(cursor)) { streak += 1; cursor -= 1; }
  return streak;
}
