import moment, { Duration, Moment } from "moment";

export type ParsedLine =
  | { input: string; valid: true; from: Moment; to: Moment; duration: Duration }
  | { input: string; valid: false };

export interface TotalResult {
  duration: Duration;
  workStart: Moment;
  normalizedWorkEnd: Moment;
}

export interface CalculationResult {
  parsed: ParsedLine[];
  total?: TotalResult;
}

export default {
  calculate(input: string): CalculationResult {
    input = input.trim();

    const lines = input.split("\n");
    const parsed: ParsedLine[] = [];

    for (const line of lines) {
      parsed.push(parseLine(line));
    }

    return {
      parsed,
      total: calculateTotal(parsed),
    };
  },
};

function parseLine(line: string): ParsedLine {
  line = line.trim();

  const split = line.split(/[-–—]/);
  const formats = ["HH:mm", "HHmm"];
  const fromStr = (split[0] ?? "").trim();
  const toStr = (split[1] ?? "").trim().split(/\s+/)[0] ?? "";
  const from = moment(fromStr, formats, true);
  const to = moment(toStr, formats, true);

  if (!from.isValid() || !to.isValid()) {
    return { input: line, valid: false };
  }

  if (to.isBefore(from)) {
    to.add(1, "day");
  }

  return {
    input: line,
    valid: true,
    from,
    to,
    duration: moment.duration(to.diff(from)),
  };
}

function calculateTotal(parsedLines: ParsedLine[]): TotalResult | undefined {
  const validLines = parsedLines.filter((p) => p.valid);
  if (validLines.length === 0) {
    return undefined;
  }

  const duration = validLines[0].duration.clone();
  for (const parsed of validLines.slice(1)) {
    duration.add(parsed.duration);
  }

  return {
    duration,
    workStart: validLines[0].from,
    normalizedWorkEnd: validLines[0].from.clone().add(duration),
  };
}
