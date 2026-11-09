import { describe, it, expect } from "vitest";
import moment from "moment";
import {
  DEFAULT_SETTINGS,
  buildSchedule,
  lookupBreakMinutes,
  resolveSettings,
} from "./NormalizationSettings";

const start = (hhmm: string) => moment(`2025-01-01 ${hhmm}`, "YYYY-MM-DD HH:mm");

describe("lookupBreakMinutes", () => {
  it("returns 0 below first threshold", () => {
    expect(lookupBreakMinutes(5 * 60, DEFAULT_SETTINGS.breakRules)).toBe(0);
  });
  it("returns 30 at 6h", () => {
    expect(lookupBreakMinutes(6 * 60, DEFAULT_SETTINGS.breakRules)).toBe(30);
  });
  it("returns 30 between 6h and 9h", () => {
    expect(lookupBreakMinutes(8 * 60, DEFAULT_SETTINGS.breakRules)).toBe(30);
  });
  it("returns 60 at 9h", () => {
    expect(lookupBreakMinutes(9 * 60, DEFAULT_SETTINGS.breakRules)).toBe(60);
  });
  it("returns 60 above 9h", () => {
    expect(lookupBreakMinutes(10 * 60, DEFAULT_SETTINGS.breakRules)).toBe(60);
  });
});

describe("buildSchedule", () => {
  it("no break for short work", () => {
    const s = buildSchedule(start("09:00"), moment.duration(4, "hours"), DEFAULT_SETTINGS);
    expect(s.rows.length).toBe(1);
    expect(s.breakMinutes).toBe(0);
    expect(s.end.format("HH:mm")).toBe("13:00");
  });

  it("inserts 30min break at default 12:00 for 8h work", () => {
    const s = buildSchedule(start("08:00"), moment.duration(8, "hours"), DEFAULT_SETTINGS);
    expect(s.rows.length).toBe(3);
    expect(s.breakMinutes).toBe(30);
    expect(s.rows[0].from.format("HH:mm")).toBe("08:00");
    expect(s.rows[0].to.format("HH:mm")).toBe("12:00");
    expect(s.rows[1].from.format("HH:mm")).toBe("12:00");
    expect(s.rows[1].to.format("HH:mm")).toBe("12:30");
    expect(s.rows[2].from.format("HH:mm")).toBe("12:30");
    expect(s.rows[2].to.format("HH:mm")).toBe("16:30");
    expect(s.capViolated).toBe(false);
  });

  it("inserts 60min break for 9h work", () => {
    const s = buildSchedule(start("08:00"), moment.duration(9, "hours"), DEFAULT_SETTINGS);
    expect(s.breakMinutes).toBe(60);
    expect(s.end.format("HH:mm")).toBe("18:00");
  });

  it("shifts break later when start late violates cap on seg1", () => {
    // workStart 05:00, defaultBreakStart 12:00 → seg1=7h > 6h cap → shift to 11:00
    const s = buildSchedule(start("05:00"), moment.duration(8, "hours"), DEFAULT_SETTINGS);
    expect(s.rows[0].to.format("HH:mm")).toBe("11:00");
    expect(s.capViolated).toBe(false);
  });

  it("shifts break earlier when default would violate cap on seg2", () => {
    // workStart 10:00, 8h work, break at 12:00 → seg2 = end(18:30) - 12:30 = 6h. OK.
    // workStart 10:00, 9h work, default 12:00 → break 12-13, seg2 = 19-13 = 6h. OK.
    // workStart 11:00, 9h work, 60min break → end=21:00. Default 12:00 → seg2=21-13=8h>cap.
    // Shift: breakStart = end - B - cap = 21 - 1 - 6 = 14:00.
    const s = buildSchedule(start("11:00"), moment.duration(9, "hours"), DEFAULT_SETTINGS);
    expect(s.rows[0].to.format("HH:mm")).toBe("14:00");
    expect(s.rows[1].to.format("HH:mm")).toBe("15:00");
    expect(s.rows[2].to.format("HH:mm")).toBe("21:00");
    expect(s.capViolated).toBe(false);
  });

  it("marks capViolated when work too long to fit single break", () => {
    // 13h work, cap 6h, 60min break → max coverable 12h+60min. 13h violates.
    const s = buildSchedule(start("06:00"), moment.duration(13, "hours"), DEFAULT_SETTINGS);
    expect(s.capViolated).toBe(true);
  });

  it("respects custom rules and break start", () => {
    const settings = resolveSettings({
      breakRules: [{ minWorkHours: 4, pauseMinutes: 15 }],
      maxConsecutiveHours: 8,
      defaultBreakStart: "10:00",
    });
    const s = buildSchedule(start("08:00"), moment.duration(5, "hours"), settings);
    expect(s.breakMinutes).toBe(15);
    expect(s.rows[1].from.format("HH:mm")).toBe("10:00");
  });
});

describe("resolveSettings", () => {
  it("empty input gives defaults", () => {
    expect(resolveSettings({})).toEqual(DEFAULT_SETTINGS);
  });
  it("partial input fills missing fields", () => {
    const r = resolveSettings({ defaultBreakStart: "13:00" });
    expect(r.defaultBreakStart).toBe("13:00");
    expect(r.maxConsecutiveHours).toBe(DEFAULT_SETTINGS.maxConsecutiveHours);
    expect(r.breakRules).toEqual(DEFAULT_SETTINGS.breakRules);
  });
});
