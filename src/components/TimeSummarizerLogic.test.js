import moment from "moment";
import TimeSummarizerLogic from "./TimeSummarizerLogic";

it("should parse single line", () => {
  const result = TimeSummarizerLogic.calculate("08:00-10:00");

  expect(result.parsed.length).toBe(1);
  expect(result.parsed[0].input).toBe("08:00-10:00");
  expect(result.parsed[0].duration).toEqual(moment.duration(2, "hours"));
  expect(result.total.duration).toEqual(moment.duration(2, "hours"));
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
