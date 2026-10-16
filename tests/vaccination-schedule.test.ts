import { describe, expect, it } from "vitest";
import {
  actionableDoses,
  dueDateFor,
  flockAgeDays,
  formatAge,
  scheduleStatus,
  type ScheduleFlock,
  type ScheduleItem,
} from "@/lib/domain/vaccination-schedule";
import { vaccinationDueAlert } from "@/lib/domain/alerts";

const chicks: ScheduleFlock = {
  id: "f1",
  name: "Batch A",
  placementDate: "2026-01-01",
  ageAtPlacementDays: 0,
};

// Ready-to-lay pullets bought at 16 weeks.
const pullets: ScheduleFlock = {
  id: "f2",
  name: "Pullets",
  placementDate: "2026-03-01",
  ageAtPlacementDays: 112,
};

const programme: ScheduleItem[] = [
  { id: "i3", vaccineName: "Dose C", ageDays: 120 },
  { id: "i1", vaccineName: "Dose A", ageDays: 7 },
  { id: "i2", vaccineName: "Dose B", ageDays: 21 },
];

describe("flockAgeDays", () => {
  it("counts from placement for day-old chicks", () => {
    expect(flockAgeDays(chicks, "2026-01-11")).toBe(10);
  });

  it("adds the age at placement for bought-in pullets", () => {
    expect(flockAgeDays(pullets, "2026-03-11")).toBe(122);
  });

  it("is never negative before placement", () => {
    expect(flockAgeDays(chicks, "2025-12-25")).toBe(0);
  });
});

describe("dueDateFor", () => {
  it("places a dose at placement + age for chicks", () => {
    expect(dueDateFor(chicks, 21)).toBe("2026-01-22");
  });

  it("subtracts the age at placement for pullets", () => {
    // 120 days old = 8 days after arriving at 112 days.
    expect(dueDateFor(pullets, 120)).toBe("2026-03-09");
  });
});

describe("scheduleStatus", () => {
  it("sorts doses by age and classifies them by due date", () => {
    const statuses = scheduleStatus(chicks, programme, [], "2026-01-10");
    expect(statuses.map((s) => s.item.id)).toEqual(["i1", "i2", "i3"]);
    expect(statuses.map((s) => s.state)).toEqual(["overdue", "upcoming", "upcoming"]);
    expect(statuses[0].daysUntilDue).toBe(-2);
  });

  it("calls a dose within a week due soon, including today", () => {
    expect(scheduleStatus(chicks, programme, [], "2026-01-15")[1].state).toBe("due_soon");
    expect(scheduleStatus(chicks, programme, [], "2026-01-22")[1].state).toBe("due_soon");
  });

  it("marks a dose done only when a vaccination for this flock links to it", () => {
    const statuses = scheduleStatus(
      chicks,
      programme,
      [
        { flockId: "f1", scheduleItemId: "i1", vaccinationDate: "2026-01-09" },
        // Another flock's dose, and an unlinked one, change nothing.
        { flockId: "other", scheduleItemId: "i2", vaccinationDate: "2026-01-09" },
        { flockId: "f1", scheduleItemId: null, vaccinationDate: "2026-01-09" },
      ],
      "2026-01-30"
    );
    expect(statuses[0]).toMatchObject({ state: "done", doneDate: "2026-01-09" });
    expect(statuses[1].state).toBe("overdue");
  });

  it("skips doses the birds were already past when they arrived", () => {
    const statuses = scheduleStatus(pullets, programme, [], "2026-03-01");
    expect(statuses.map((s) => s.state)).toEqual(["skipped", "skipped", "upcoming"]);
    expect(actionableDoses(statuses).map((s) => s.item.id)).toEqual(["i3"]);
  });
});

describe("vaccinationDueAlert", () => {
  it("is silent with nothing due", () => {
    expect(vaccinationDueAlert([])).toBeNull();
  });

  it("leads with the most overdue dose and counts the rest", () => {
    const alert = vaccinationDueAlert([
      { flockName: "A", vaccineName: "Dose B", daysUntilDue: 3 },
      { flockName: "A", vaccineName: "Dose A", daysUntilDue: -2 },
    ]);
    expect(alert).toEqual({
      level: "bad",
      message: "Dose A for A is 2 days overdue (+1 more).",
      type: "vaccination_due",
    });
  });

  it("warns for a dose due today or soon", () => {
    expect(
      vaccinationDueAlert([{ flockName: "A", vaccineName: "Dose A", daysUntilDue: 0 }])?.message
    ).toBe("Dose A for A is due today.");
    expect(
      vaccinationDueAlert([{ flockName: "A", vaccineName: "Dose A", daysUntilDue: 1 }])
    ).toMatchObject({ level: "warn", message: "Dose A for A is due in 1 day." });
  });
});

describe("formatAge", () => {
  it("speaks in weeks and days", () => {
    expect(formatAge(5)).toBe("5 d");
    expect(formatAge(126)).toBe("18 wk");
    expect(formatAge(23)).toBe("3 wk 2 d");
  });
});
