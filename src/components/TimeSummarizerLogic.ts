import moment, { Duration, Moment } from "moment";

export interface ParsedLine {
  input: string;
  from: Moment;
  to: Moment;
  duration: Duration;
}

export interface TotalResult {
  duration: Duration;
  workStart: Moment;
  normalizedWorkEnd: Moment;
}

export interface CalculationResult {
  parsed: ParsedLine[];
  total: TotalResult;
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
  const from = moment(split[0], "HH:mm");
  const to = moment(split[1], "HH:mm");

  if (to.isBefore(from)) {
    to.add(1, "day");
  }

  return {
    input: line,
    from,
    to,
    duration: moment.duration(to.diff(from)),
  };
}

function calculateTotal(parsedLines: ParsedLine[]): TotalResult {
  let duration: Duration | undefined;

  for (const parsed of parsedLines) {
    if (duration) {
      duration.add(parsed.duration);
    } else {
      duration = parsed.duration.clone();
    }
  }

  if (!duration) {
    throw new Error("No lines to calculate total from");
  }

  return {
    duration,
    workStart: parsedLines[0].from,
    normalizedWorkEnd: parsedLines[0].from.clone().add(duration),
  };
}
