import moment, { Duration, Moment } from "moment";

export interface BreakRule {
  minWorkHours: number;
  pauseMinutes: number;
}

export interface NormalizationSettings {
  breakRules?: BreakRule[];
  maxConsecutiveHours?: number;
  defaultBreakStart?: string; // "HH:mm"
}

export interface ResolvedSettings {
  breakRules: BreakRule[];
  maxConsecutiveHours: number;
  defaultBreakStart: string;
}

export const DEFAULT_SETTINGS: ResolvedSettings = {
  breakRules: [
    { minWorkHours: 6, pauseMinutes: 30 },
    { minWorkHours: 9, pauseMinutes: 60 },
  ],
  maxConsecutiveHours: 6,
  defaultBreakStart: "12:00",
};

const STORAGE_KEY = "normalization-settings";

export function loadSettings(): NormalizationSettings {
  if (typeof localStorage === "undefined") return {};
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    return JSON.parse(raw) as NormalizationSettings;
  } catch {
    return {};
  }
}

export function saveSettings(settings: NormalizationSettings): void {
  if (typeof localStorage === "undefined") return;
  // Strip empty/undefined fields so empty object = defaults.
  const clean: NormalizationSettings = {};
  if (settings.breakRules && settings.breakRules.length > 0) clean.breakRules = settings.breakRules;
  if (typeof settings.maxConsecutiveHours === "number") clean.maxConsecutiveHours = settings.maxConsecutiveHours;
  if (settings.defaultBreakStart) clean.defaultBreakStart = settings.defaultBreakStart;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(clean));
}

export function resolveSettings(s: NormalizationSettings): ResolvedSettings {
  return {
    breakRules:
      s.breakRules && s.breakRules.length > 0
        ? [...s.breakRules].sort((a, b) => a.minWorkHours - b.minWorkHours)
        : DEFAULT_SETTINGS.breakRules,
    maxConsecutiveHours:
      typeof s.maxConsecutiveHours === "number" ? s.maxConsecutiveHours : DEFAULT_SETTINGS.maxConsecutiveHours,
    defaultBreakStart: s.defaultBreakStart || DEFAULT_SETTINGS.defaultBreakStart,
  };
}

export type ScheduleRow =
  | { kind: "work"; from: Moment; to: Moment; duration: Duration }
  | { kind: "break"; from: Moment; to: Moment; duration: Duration };

export interface NormalizedSchedule {
  rows: ScheduleRow[];
  end: Moment;
  breakMinutes: number;
  capViolated: boolean;
}

/**
 * Pick the highest break rule whose threshold is met by workedMinutes.
 * Returns 0 if no rule matches.
 */
export function lookupBreakMinutes(workedMinutes: number, rules: BreakRule[]): number {
  let chosen = 0;
  for (const rule of rules) {
    if (workedMinutes >= rule.minWorkHours * 60) {
      chosen = rule.pauseMinutes;
    }
  }
  return chosen;
}

/**
 * Build normalized schedule rows from workStart and total work duration.
 * Inserts single break (if rules apply), placed at defaultBreakStart, shifted
 * to satisfy maxConsecutiveHours on both segments if possible.
 */
export function buildSchedule(
  workStart: Moment,
  workDuration: Duration,
  settings: ResolvedSettings,
): NormalizedSchedule {
  const W = Math.round(workDuration.asMinutes());
  const B = lookupBreakMinutes(W, settings.breakRules);

  if (B === 0 || W <= 0) {
    const end = workStart.clone().add(W, "minutes");
    return {
      rows: [{ kind: "work", from: workStart.clone(), to: end.clone(), duration: moment.duration(W, "minutes") }],
      end,
      breakMinutes: 0,
      capViolated: false,
    };
  }

  const end = workStart.clone().add(W + B, "minutes");
  const cap = settings.maxConsecutiveHours * 60;

  // Parse defaultBreakStart on workStart's date.
  const [hh, mm] = settings.defaultBreakStart.split(":").map((v) => parseInt(v, 10));
  let breakStart = workStart.clone().hour(hh || 0).minute(mm || 0).second(0).millisecond(0);

  // Clamp into [workStart, end - B].
  const latestBreakStart = end.clone().subtract(B, "minutes");
  if (breakStart.isBefore(workStart)) breakStart = workStart.clone();
  if (breakStart.isAfter(latestBreakStart)) breakStart = latestBreakStart.clone();

  // Enforce cap on first segment: seg1 = breakStart - workStart
  let seg1 = breakStart.diff(workStart, "minutes");
  if (seg1 > cap) {
    breakStart = workStart.clone().add(cap, "minutes");
    seg1 = cap;
  }

  // Enforce cap on second segment: seg2 = end - (breakStart + B)
  const breakEnd = () => breakStart.clone().add(B, "minutes");
  let seg2 = end.diff(breakEnd(), "minutes");
  if (seg2 > cap) {
    breakStart = end.clone().subtract(B + cap, "minutes");
    seg1 = breakStart.diff(workStart, "minutes");
    seg2 = cap;
  }

  const capViolated = seg1 > cap || seg2 > cap || seg1 < 0 || seg2 < 0;
  const bEnd = breakEnd();

  return {
    rows: [
      { kind: "work", from: workStart.clone(), to: breakStart.clone(), duration: moment.duration(seg1, "minutes") },
      { kind: "break", from: breakStart.clone(), to: bEnd.clone(), duration: moment.duration(B, "minutes") },
      { kind: "work", from: bEnd.clone(), to: end.clone(), duration: moment.duration(seg2, "minutes") },
    ],
    end,
    breakMinutes: B,
    capViolated,
  };
}
