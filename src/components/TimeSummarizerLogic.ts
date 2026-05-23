import moment, { Duration, Moment } from "moment";

export type ParsedLine =
  | { input: string; valid: true; from?: Moment; to?: Moment; duration: Duration; scope?: string }
  | { input: string; valid: false };

export interface TotalResult {
  duration: Duration;
  workStart: Moment;
  normalizedWorkEnd: Moment;
}

export interface Day {
  dateInput?: string;
  date?: Moment;
  parsed: ParsedLine[];
  total?: TotalResult;
  scopeTotals?: Map<string, Duration>;
}

export interface CalculationResult {
  days: Day[];
  grandTotal?: Duration;
  grandScopeTotals?: Map<string, Duration>;
}

const DATE_FORMATS_WITH_YEAR = ["DD.MM.YYYY", "YYYY-MM-DD", "YYYY/MM/DD"];
const DATE_FORMATS_WITHOUT_YEAR = ["DD.MM."];

export default {
  calculate(input: string, today?: Moment): CalculationResult {
    const referenceToday = today ? today.clone() : moment();
    const blocks = splitBlocks(input);
    const days: Day[] = blocks.map((block) => parseDay(block, referenceToday));

    let grandTotal: Duration | undefined;
    let grandScopeTotals: Map<string, Duration> | undefined;
    for (const day of days) {
      if (day.total) {
        if (!grandTotal) {
          grandTotal = day.total.duration.clone();
        } else {
          grandTotal.add(day.total.duration);
        }
      }
      if (day.scopeTotals) {
        if (!grandScopeTotals) grandScopeTotals = new Map();
        for (const [scope, dur] of day.scopeTotals) {
          const existing = grandScopeTotals.get(scope);
          if (existing) {
            existing.add(dur);
          } else {
            grandScopeTotals.set(scope, dur.clone());
          }
        }
      }
    }

    return { days, grandTotal, grandScopeTotals };
  },
};

function splitBlocks(input: string): string[][] {
  const lines = input.split("\n");
  const blocks: string[][] = [];
  let current: string[] = [];

  for (const line of lines) {
    if (line.trim() === "") {
      if (current.length > 0) {
        blocks.push(current);
        current = [];
      }
    } else {
      current.push(line);
    }
  }
  if (current.length > 0) blocks.push(current);

  return blocks.length > 0 ? blocks : [[]];
}

function parseDay(blockLines: string[], today: Moment): Day {
  let dateInput: string | undefined;
  let date: Moment | undefined;
  let entryLines = blockLines;

  if (blockLines.length > 0) {
    const first = blockLines[0].trim();
    const parsedDate = parseDate(first, today);
    if (parsedDate) {
      dateInput = first;
      date = parsedDate;
      entryLines = blockLines.slice(1);
    }
  }

  const parsed = entryLines.map(parseLine);
  const total = calculateTotal(parsed, date);
  const scopeTotals = calculateScopeTotals(parsed);

  return { dateInput, date, parsed, total, scopeTotals };
}

function calculateScopeTotals(parsedLines: ParsedLine[]): Map<string, Duration> | undefined {
  const totals = new Map<string, Duration>();
  for (const line of parsedLines) {
    if (!line.valid || !line.scope) continue;
    const existing = totals.get(line.scope);
    if (existing) {
      existing.add(line.duration);
    } else {
      totals.set(line.scope, line.duration.clone());
    }
  }
  return totals.size > 0 ? totals : undefined;
}

function parseDate(line: string, today: Moment): Moment | undefined {
  const withYear = moment(line, DATE_FORMATS_WITH_YEAR, true);
  if (withYear.isValid()) return withYear;

  const withoutYear = moment(line, DATE_FORMATS_WITHOUT_YEAR, true);
  if (!withoutYear.isValid()) return undefined;

  const currentYear = today.year();
  const candidate = withoutYear.clone().year(currentYear);
  const todayStartOfDay = today.clone().startOf("day");
  if (candidate.isAfter(todayStartOfDay)) {
    candidate.year(currentYear - 1);
  }
  return candidate;
}

function parseLine(line: string): ParsedLine {
  const trimmed = line.trim();

  if (trimmed.startsWith("-")) {
    const rest = trimmed.slice(1).trim();
    const negDuration = parseNegativeDuration(rest);
    if (negDuration) {
      return { input: trimmed, valid: true, duration: negDuration };
    }
    return { input: trimmed, valid: false };
  }

  const split = trimmed.split(/[-–—]/);
  const formats = ["HH:mm", "HHmm"];
  const fromStr = (split[0] ?? "").trim();
  const rightSide = (split[1] ?? "").trim();
  const rightParts = rightSide.split(/\s+/);
  const toStr = rightParts[0] ?? "";
  const scope = rightParts.slice(1).join(" ").trim() || undefined;
  const from = moment(fromStr, formats, true);
  const to = moment(toStr, formats, true);

  if (!from.isValid() || !to.isValid()) {
    return { input: trimmed, valid: false };
  }

  if (to.isBefore(from)) {
    to.add(1, "day");
  }

  return {
    input: trimmed,
    valid: true,
    from,
    to,
    duration: moment.duration(to.diff(from)),
    scope,
  };
}

function parseNegativeDuration(text: string): Duration | undefined {
  if (text === "") return undefined;
  const hhmm = text.match(/^(\d{1,2}):(\d{2})$/);
  if (hhmm) {
    const hours = parseInt(hhmm[1], 10);
    const minutes = parseInt(hhmm[2], 10);
    if (minutes >= 60) return undefined;
    return moment.duration(-(hours * 60 + minutes), "minutes");
  }
  const minsOnly = text.match(/^\d+$/);
  if (minsOnly) {
    return moment.duration(-parseInt(text, 10), "minutes");
  }
  return undefined;
}

function calculateTotal(parsedLines: ParsedLine[], date?: Moment): TotalResult | undefined {
  const validLines = parsedLines.filter((p): p is Extract<ParsedLine, { valid: true }> => p.valid);
  if (validLines.length === 0) {
    return undefined;
  }

  const duration = validLines[0].duration.clone();
  for (const parsed of validLines.slice(1)) {
    duration.add(parsed.duration);
  }

  const firstWithFrom = validLines.find((p) => p.from);
  if (!firstWithFrom || !firstWithFrom.from) return undefined;
  const workStart = firstWithFrom.from.clone();
  if (date) {
    workStart.year(date.year()).month(date.month()).date(date.date());
  }

  return {
    duration,
    workStart,
    normalizedWorkEnd: workStart.clone().add(duration),
  };
}
