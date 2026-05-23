import moment, { Duration, Moment } from "moment";

export type ParsedLine =
  | { input: string; valid: true; from: Moment; to: Moment; duration: Duration }
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
}

export interface CalculationResult {
  days: Day[];
  grandTotal?: Duration;
}

const DATE_FORMATS_WITH_YEAR = ["DD.MM.YYYY", "YYYY-MM-DD", "YYYY/MM/DD"];
const DATE_FORMATS_WITHOUT_YEAR = ["DD.MM."];

export default {
  calculate(input: string, today?: Moment): CalculationResult {
    const referenceToday = today ? today.clone() : moment();
    const blocks = splitBlocks(input);
    const days: Day[] = blocks.map((block) => parseDay(block, referenceToday));

    let grandTotal: Duration | undefined;
    for (const day of days) {
      if (!day.total) continue;
      if (!grandTotal) {
        grandTotal = day.total.duration.clone();
      } else {
        grandTotal.add(day.total.duration);
      }
    }

    return { days, grandTotal };
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

  return { dateInput, date, parsed, total };
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

  const split = trimmed.split(/[-–—]/);
  const formats = ["HH:mm", "HHmm"];
  const fromStr = (split[0] ?? "").trim();
  const toStr = (split[1] ?? "").trim().split(/\s+/)[0] ?? "";
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
  };
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

  const workStart = validLines[0].from.clone();
  if (date) {
    workStart.year(date.year()).month(date.month()).date(date.date());
  }

  return {
    duration,
    workStart,
    normalizedWorkEnd: workStart.clone().add(duration),
  };
}
