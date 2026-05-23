import { it, expect } from 'vitest';
import moment from "moment";
import TimeSummarizerLogic, { type ParsedLine } from "./TimeSummarizerLogic";

function assertValid(line: ParsedLine): asserts line is Extract<ParsedLine, { valid: true }> {
  if (!line.valid) throw new Error(`expected valid line, got: ${line.input}`);
}

it("should parse single line", () => {
  const result = TimeSummarizerLogic.calculate("08:00-10:00");

  expect(result.parsed.length).toBe(1);
  expect(result.parsed[0].input).toBe("08:00-10:00");
  assertValid(result.parsed[0]);
  expect(result.parsed[0].duration).toEqual(moment.duration(2, "hours"));
  expect(result.total!.duration).toEqual(moment.duration(2, "hours"));
});

it("should parse single line with different dashes", () => {
  const resultEnDash = TimeSummarizerLogic.calculate("08:00–10:00");
  assertValid(resultEnDash.parsed[0]);
  expect(resultEnDash.parsed[0].duration).toEqual(moment.duration(2, "hours"));

  const resultEmDash = TimeSummarizerLogic.calculate("08:00—10:00");
  assertValid(resultEmDash.parsed[0]);
  expect(resultEmDash.parsed[0].duration).toEqual(moment.duration(2, "hours"));
});

it("should parse without colon in time", () => {
  const result = TimeSummarizerLogic.calculate("1300-1400");
  assertValid(result.parsed[0]);
  expect(result.parsed[0].duration).toEqual(moment.duration(1, "hours"));
});

it("should parse with spaces around dash", () => {
  const result = TimeSummarizerLogic.calculate("1300 - 1400");
  assertValid(result.parsed[0]);
  expect(result.parsed[0].duration).toEqual(moment.duration(1, "hours"));
});

it("should ignore trailing text after the time range", () => {
  const result = TimeSummarizerLogic.calculate("13:00-14:00 Project A");
  assertValid(result.parsed[0]);
  expect(result.parsed[0].duration).toEqual(moment.duration(1, "hours"));
  expect(result.parsed[0].input).toBe("13:00-14:00 Project A");
  expect(result.total!.duration).toEqual(moment.duration(1, "hours"));
});

it("should handle times crossing midnight", () => {
  const result = TimeSummarizerLogic.calculate("23:00-01:00");
  assertValid(result.parsed[0]);
  expect(result.parsed[0].duration).toEqual(moment.duration(2, "hours"));
  expect(result.total!.duration).toEqual(moment.duration(2, "hours"));
});

it("should mark invalid entries", () => {
  const result = TimeSummarizerLogic.calculate("13-");
  expect(result.parsed[0].valid).toBe(false);
  expect(result.parsed[0].input).toBe("13-");
});

it("should mark gibberish as invalid", () => {
  const result = TimeSummarizerLogic.calculate("asdf");
  expect(result.parsed[0].valid).toBe(false);
});

it("should mark empty single line as invalid", () => {
  const result = TimeSummarizerLogic.calculate("   ");
  expect(result.parsed[0].valid).toBe(false);
});

it("should exclude invalid lines from total", () => {
  const result = TimeSummarizerLogic.calculate(`
    08:00-10:00
    asdf
    10:00-11:00`);

  expect(result.parsed.length).toBe(3);
  expect(result.parsed[0].valid).toBe(true);
  expect(result.parsed[1].valid).toBe(false);
  expect(result.parsed[2].valid).toBe(true);
  expect(result.total!.duration).toEqual(moment.duration(3, "hours"));
});

it("should return undefined total when all lines invalid", () => {
  const result = TimeSummarizerLogic.calculate("asdf\n13-");
  expect(result.total).toBeUndefined();
});

it("valid lines should have valid=true", () => {
  const result = TimeSummarizerLogic.calculate("08:00-10:00");
  expect(result.parsed[0].valid).toBe(true);
});

it("should parse multiple lines", () => {
  const result = TimeSummarizerLogic.calculate(`
    08:30-09:00
    10:00-11:00
    11:30-15:00`);

  assertValid(result.parsed[0]);
  assertValid(result.parsed[1]);
  assertValid(result.parsed[2]);
  expect(result.parsed[0].input).toBe("08:30-09:00");
  expect(result.parsed[0].duration).toEqual(moment.duration(30, "minutes"));
  expect(result.parsed[1].input).toBe("10:00-11:00");
  expect(result.parsed[1].duration).toEqual(moment.duration(1, "hour"));
  expect(result.parsed[2].input).toBe("11:30-15:00");
  expect(result.parsed[2].duration).toEqual(moment.duration(210, "minutes"));
  expect(result.parsed.length).toBe(3);
  expect(result.total!.duration).toEqual(moment.duration(5, "hours"));
});
