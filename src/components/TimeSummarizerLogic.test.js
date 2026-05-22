import { it, expect } from 'vitest';
import moment from "moment";
import TimeSummarizerLogic from "./TimeSummarizerLogic";

it("should parse single line", () => {
  const result = TimeSummarizerLogic.calculate("08:00-10:00");

  expect(result.parsed.length).toBe(1);
  expect(result.parsed[0].input).toBe("08:00-10:00");
  expect(result.parsed[0].duration).toEqual(moment.duration(2, "hours"));
  expect(result.total.duration).toEqual(moment.duration(2, "hours"));
});

it("should parse single line with different dashes", () => {
  const resultEnDash = TimeSummarizerLogic.calculate("08:00–10:00");
  expect(resultEnDash.parsed[0].duration).toEqual(moment.duration(2, "hours"));

  const resultEmDash = TimeSummarizerLogic.calculate("08:00—10:00");
  expect(resultEmDash.parsed[0].duration).toEqual(moment.duration(2, "hours"));
});

it("should parse without colon in time", () => {
  const result = TimeSummarizerLogic.calculate("1300-1400");
  expect(result.parsed[0].duration).toEqual(moment.duration(1, "hours"));
});

it("should parse with spaces around dash", () => {
  const result = TimeSummarizerLogic.calculate("1300 - 1400");
  expect(result.parsed[0].duration).toEqual(moment.duration(1, "hours"));
});

it("should ignore trailing text after the time range", () => {
  const result = TimeSummarizerLogic.calculate("13:00-14:00 Project A");
  expect(result.parsed[0].duration).toEqual(moment.duration(1, "hours"));
  expect(result.parsed[0].input).toBe("13:00-14:00 Project A");
  expect(result.total.duration).toEqual(moment.duration(1, "hours"));
});

it("should parse multiple lines", () => {
  const result = TimeSummarizerLogic.calculate(`
    08:30-09:00
    10:00-11:00
    11:30-15:00`);

  expect(result.parsed[0].input).toBe("08:30-09:00");
  expect(result.parsed[0].duration).toEqual(moment.duration(30, "minutes"));
  expect(result.parsed[1].input).toBe("10:00-11:00");
  expect(result.parsed[1].duration).toEqual(moment.duration(1, "hour"));
  expect(result.parsed[2].input).toBe("11:30-15:00");
  expect(result.parsed[2].duration).toEqual(moment.duration(210, "minutes"));
  expect(result.parsed.length).toBe(3);
  expect(result.total.duration).toEqual(moment.duration(5, "hours"));
});
