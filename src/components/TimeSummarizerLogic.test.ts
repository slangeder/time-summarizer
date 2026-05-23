import { it, expect, describe } from 'vitest';
import moment from "moment";
import TimeSummarizerLogic, { type ParsedLine, type Day } from "./TimeSummarizerLogic";

function assertValid(line: ParsedLine): asserts line is Extract<ParsedLine, { valid: true }> {
  if (!line.valid) throw new Error(`expected valid line, got: ${line.input}`);
}

function firstDay(input: string): Day {
  return TimeSummarizerLogic.calculate(input).days[0];
}

describe("single day parsing", () => {
  it("should parse single line", () => {
    const result = TimeSummarizerLogic.calculate("08:00-10:00");
    const day = result.days[0];

    expect(day.parsed.length).toBe(1);
    expect(day.parsed[0].input).toBe("08:00-10:00");
    assertValid(day.parsed[0]);
    expect(day.parsed[0].duration).toEqual(moment.duration(2, "hours"));
    expect(day.total!.duration).toEqual(moment.duration(2, "hours"));
    expect(result.grandTotal).toEqual(moment.duration(2, "hours"));
  });

  it("should parse single line with different dashes", () => {
    const resultEnDash = firstDay("08:00–10:00");
    assertValid(resultEnDash.parsed[0]);
    expect(resultEnDash.parsed[0].duration).toEqual(moment.duration(2, "hours"));

    const resultEmDash = firstDay("08:00—10:00");
    assertValid(resultEmDash.parsed[0]);
    expect(resultEmDash.parsed[0].duration).toEqual(moment.duration(2, "hours"));
  });

  it("should parse without colon in time", () => {
    const day = firstDay("1300-1400");
    assertValid(day.parsed[0]);
    expect(day.parsed[0].duration).toEqual(moment.duration(1, "hours"));
  });

  it("should parse with spaces around dash", () => {
    const day = firstDay("1300 - 1400");
    assertValid(day.parsed[0]);
    expect(day.parsed[0].duration).toEqual(moment.duration(1, "hours"));
  });

  it("should ignore trailing text after the time range", () => {
    const day = firstDay("13:00-14:00 Project A");
    assertValid(day.parsed[0]);
    expect(day.parsed[0].duration).toEqual(moment.duration(1, "hours"));
    expect(day.parsed[0].input).toBe("13:00-14:00 Project A");
    expect(day.total!.duration).toEqual(moment.duration(1, "hours"));
  });

  it("should handle times crossing midnight", () => {
    const day = firstDay("23:00-01:00");
    assertValid(day.parsed[0]);
    expect(day.parsed[0].duration).toEqual(moment.duration(2, "hours"));
    expect(day.total!.duration).toEqual(moment.duration(2, "hours"));
  });

  it("should mark invalid entries", () => {
    const day = firstDay("13-");
    expect(day.parsed[0].valid).toBe(false);
    expect(day.parsed[0].input).toBe("13-");
  });

  it("should mark gibberish as invalid", () => {
    const day = firstDay("asdf");
    expect(day.parsed[0].valid).toBe(false);
  });

  it("should mark empty single line as invalid", () => {
    const result = TimeSummarizerLogic.calculate("   ");
    expect(result.days[0].parsed.length).toBe(0);
    expect(result.grandTotal).toBeUndefined();
  });

  it("should exclude invalid lines from total", () => {
    const day = firstDay(`08:00-10:00
asdf
10:00-11:00`);

    expect(day.parsed.length).toBe(3);
    expect(day.parsed[0].valid).toBe(true);
    expect(day.parsed[1].valid).toBe(false);
    expect(day.parsed[2].valid).toBe(true);
    expect(day.total!.duration).toEqual(moment.duration(3, "hours"));
  });

  it("should return undefined total when all lines invalid", () => {
    const day = firstDay("asdf\n13-");
    expect(day.total).toBeUndefined();
  });

  it("should parse multiple lines", () => {
    const day = firstDay(`08:30-09:00
10:00-11:00
11:30-15:00`);

    assertValid(day.parsed[0]);
    assertValid(day.parsed[1]);
    assertValid(day.parsed[2]);
    expect(day.parsed[0].duration).toEqual(moment.duration(30, "minutes"));
    expect(day.parsed[1].duration).toEqual(moment.duration(1, "hour"));
    expect(day.parsed[2].duration).toEqual(moment.duration(210, "minutes"));
    expect(day.total!.duration).toEqual(moment.duration(5, "hours"));
  });
});

describe("scope parsing", () => {
  it("should capture scope as trailing token", () => {
    const day = firstDay("08:15-10:05 ORTHO");
    assertValid(day.parsed[0]);
    expect(day.parsed[0].scope).toBe("ORTHO");
  });

  it("should leave scope undefined when no trailing token", () => {
    const day = firstDay("08:15-10:05");
    assertValid(day.parsed[0]);
    expect(day.parsed[0].scope).toBeUndefined();
  });

  it("should treat multi-word trailing text as scope", () => {
    const day = firstDay("08:00-09:00 Project A");
    assertValid(day.parsed[0]);
    expect(day.parsed[0].scope).toBe("Project A");
  });

  it("should sum durations per scope in scopeTotals", () => {
    const input = `0745-0815
0815-1005 ORTHO
1050-1225 ORTHO
1300-1555 ORTHO
1710-1735 ORTHO
1845-1915 ORTHO
2005-2205 ORTHO`;
    const day = firstDay(input);
    expect(day.scopeTotals).toBeDefined();
    expect(day.scopeTotals!.get("ORTHO")).toEqual(
      moment.duration(1, "hour").add(50, "minutes")
        .add(1, "hour").add(35, "minutes")
        .add(2, "hours").add(55, "minutes")
        .add(25, "minutes")
        .add(30, "minutes")
        .add(2, "hours")
    );
    expect(day.scopeTotals!.has("")).toBe(false);
  });

  it("should not include unscoped entries in scopeTotals", () => {
    const day = firstDay(`08:00-09:00
10:00-11:00 ORTHO`);
    expect(day.scopeTotals!.size).toBe(1);
    expect(day.scopeTotals!.get("ORTHO")).toEqual(moment.duration(1, "hour"));
  });

  it("should leave scopeTotals undefined when no scoped entries", () => {
    const day = firstDay("08:00-09:00");
    expect(day.scopeTotals).toBeUndefined();
  });
});

describe("multi-day parsing", () => {
  const today = moment({ year: 2026, month: 4, day: 23 }); // 2026-05-23

  it("should split days by blank line", () => {
    const result = TimeSummarizerLogic.calculate(
      `08:00-09:00

10:00-12:00`,
      today,
    );
    expect(result.days.length).toBe(2);
    expect(result.days[0].total!.duration).toEqual(moment.duration(1, "hour"));
    expect(result.days[1].total!.duration).toEqual(moment.duration(2, "hours"));
    expect(result.grandTotal).toEqual(moment.duration(3, "hours"));
  });

  it("should parse date header with year", () => {
    const result = TimeSummarizerLogic.calculate(
      `08.05.2026
0705-1120`,
      today,
    );
    const day = result.days[0];
    expect(day.dateInput).toBe("08.05.2026");
    expect(day.date!.format("YYYY-MM-DD")).toBe("2026-05-08");
    expect(day.parsed.length).toBe(1);
    expect(day.total!.duration).toEqual(moment.duration(4, "hours").add(15, "minutes"));
  });

  it("should infer current year when date already passed this year", () => {
    const result = TimeSummarizerLogic.calculate(
      `07.05.
08:00-09:00`,
      today,
    );
    expect(result.days[0].date!.format("YYYY-MM-DD")).toBe("2026-05-07");
  });

  it("should infer last year when date is in the future this year", () => {
    const result = TimeSummarizerLogic.calculate(
      `30.12.
08:00-09:00`,
      today,
    );
    expect(result.days[0].date!.format("YYYY-MM-DD")).toBe("2025-12-30");
  });

  it("should treat today as current year (not future)", () => {
    const result = TimeSummarizerLogic.calculate(
      `23.05.
08:00-09:00`,
      today,
    );
    expect(result.days[0].date!.format("YYYY-MM-DD")).toBe("2026-05-23");
  });

  it("should parse multi-day example from spec", () => {
    const input = `07.05.
0720-0755
0820-0905
1005-1245
1315-1620
2020-2145

08.05.2026
0705-1120
1145-1205
1245-1355

0705-1120
1145-1205`;
    const result = TimeSummarizerLogic.calculate(input, today);
    expect(result.days.length).toBe(3);
    expect(result.days[0].date!.format("YYYY-MM-DD")).toBe("2026-05-07");
    expect(result.days[0].parsed.length).toBe(5);
    expect(result.days[1].date!.format("YYYY-MM-DD")).toBe("2026-05-08");
    expect(result.days[1].parsed.length).toBe(3);
    expect(result.days[2].date).toBeUndefined();
    expect(result.days[2].parsed.length).toBe(2);
    expect(result.grandTotal).toBeDefined();
  });

  it("should allow day without date header", () => {
    const result = TimeSummarizerLogic.calculate(
      `08:00-09:00

09:00-10:00`,
      today,
    );
    expect(result.days[0].date).toBeUndefined();
    expect(result.days[1].date).toBeUndefined();
  });

  it("should collapse multiple blank lines between days", () => {
    const result = TimeSummarizerLogic.calculate(
      `08:00-09:00


10:00-11:00`,
      today,
    );
    expect(result.days.length).toBe(2);
  });

  it("should ignore leading and trailing blank lines", () => {
    const result = TimeSummarizerLogic.calculate(
      `

08:00-09:00

`,
      today,
    );
    expect(result.days.length).toBe(1);
    expect(result.days[0].total!.duration).toEqual(moment.duration(1, "hour"));
  });

  it("should treat date-only block as day with empty entries", () => {
    const result = TimeSummarizerLogic.calculate(`07.05.`, today);
    expect(result.days.length).toBe(1);
    expect(result.days[0].date!.format("YYYY-MM-DD")).toBe("2026-05-07");
    expect(result.days[0].parsed.length).toBe(0);
    expect(result.days[0].total).toBeUndefined();
  });

  it("should anchor workStart to date when provided", () => {
    const result = TimeSummarizerLogic.calculate(
      `07.05.
08:00-09:00`,
      today,
    );
    expect(result.days[0].total!.workStart.format("YYYY-MM-DD HH:mm")).toBe("2026-05-07 08:00");
  });

  it("should compute grand total across days", () => {
    const result = TimeSummarizerLogic.calculate(
      `08:00-09:00

10:00-12:30`,
      today,
    );
    expect(result.grandTotal).toEqual(moment.duration(3, "hours").add(30, "minutes"));
  });

  it("should parse ISO date YYYY-MM-DD", () => {
    const result = TimeSummarizerLogic.calculate(
      `2025-12-30
08:00-09:00`,
      today,
    );
    expect(result.days[0].date!.format("YYYY-MM-DD")).toBe("2025-12-30");
  });

  it("should parse ISO date YYYY/MM/DD", () => {
    const result = TimeSummarizerLogic.calculate(
      `2025/12/30
08:00-09:00`,
      today,
    );
    expect(result.days[0].date!.format("YYYY-MM-DD")).toBe("2025-12-30");
  });

  it("should reject ambiguous slash-separated date without year", () => {
    const result = TimeSummarizerLogic.calculate(
      `07/05
08:00-09:00`,
      today,
    );
    expect(result.days[0].date).toBeUndefined();
    expect(result.days[0].parsed.length).toBe(2);
    expect(result.days[0].parsed[0].valid).toBe(false);
  });

  it("should aggregate grand scope totals across days", () => {
    const input = `08:00-09:00 ORTHO

10:00-12:00 ORTHO
12:00-13:00 ADMIN`;
    const result = TimeSummarizerLogic.calculate(input, today);
    expect(result.grandScopeTotals!.get("ORTHO")).toEqual(moment.duration(3, "hours"));
    expect(result.grandScopeTotals!.get("ADMIN")).toEqual(moment.duration(1, "hour"));
  });

  it("should return empty days array for empty input", () => {
    const result = TimeSummarizerLogic.calculate("");
    expect(result.days.length).toBe(1);
    expect(result.days[0].parsed.length).toBe(0);
    expect(result.grandTotal).toBeUndefined();
  });
});
