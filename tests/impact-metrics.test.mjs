import assert from "node:assert/strict";
import test from "node:test";
import { sectorCompletions, stats, trainingCompletions, trainingReports, trainingStarts } from "../src/data/impact.js";

test("reported sector rows reconcile to each phase and to the combined completion total", () => {
  const totals = trainingReports.map((_, index) =>
    sectorCompletions.reduce((total, row) => total + (row[index + 1] ?? 0), 0)
  );
  assert.deepEqual(totals, trainingReports.map((report) => report.completions));
  assert.equal(totals.reduce((sum, total) => sum + total, 0), Number(trainingCompletions.replaceAll(",", "")));
  assert.equal(trainingStarts, "30,096");
});

test("training batches and cities use the Phase 2 report, not the combined total", () => {
  assert.ok(stats.some((stat) => stat.value === "827" && stat.label === "Phase 2 training batches"));
  assert.ok(stats.some((stat) => stat.value === "97" && stat.label === "Cities reached in Phase 2"));
});
