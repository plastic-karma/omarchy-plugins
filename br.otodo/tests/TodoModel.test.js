"use strict"

const assert = require("node:assert/strict")
const model = require("../TodoModel.js")

const referenceDate = model.dateAtNoon(2026, 8, 4)

function detect(input) {
  const result = model.detectDueDatePhrase(input, referenceDate)
  assert.ok(result, `expected a due-date phrase in: ${input}`)
  assert.equal(
    input.slice(result.range.start, result.range.start + result.range.length),
    result.phrase
  )
  return result
}

{
  const result = detect("Call mum tomorrow!")
  assert.equal(result.phrase, "tomorrow")
  assert.equal(result.dueDate, "2026-09-05")
  assert.equal(result.nameWithoutPhrase, "Call mum")
}

for (const [weekday, expectedDate] of [
  ["Sunday", "2026-09-06"],
  ["Monday", "2026-09-07"],
  ["Tuesday", "2026-09-08"],
  ["Wednesday", "2026-09-09"],
  ["Thursday", "2026-09-10"],
  ["Friday", "2026-09-11"],
  ["Saturday", "2026-09-05"]
]) {
  const result = detect(`Finish report ${weekday.toUpperCase()}`)
  assert.equal(result.dueDate, expectedDate, weekday)
  assert.equal(result.nameWithoutPhrase, "Finish report", weekday)
}

for (const [input, expectedDate, expectedName] of [
  ["Ship in 3 days", "2026-09-07", "Ship"],
  ["Review in 2 weeks", "2026-09-18", "Review"],
  ["Budget in 2 months", "2026-11-04", "Budget"],
  ["Call in 1 day", "2026-09-05", "Call"],
  ["Plan launch next week", "2026-09-11", "Plan launch"],
  ["Close books next month", "2026-10-04", "Close books"]
]) {
  const result = detect(input)
  assert.equal(result.dueDate, expectedDate, input)
  assert.equal(result.nameWithoutPhrase, expectedName, input)
}

for (const input of [
  "Visit Tomorrowland",
  "Wait in 3 hours",
  "Wait in 0 days",
  "Someday maybe",
  "Discuss next quarter"
]) {
  assert.equal(model.detectDueDatePhrase(input, referenceDate), null, input)
}

{
  const result = detect("Prepare tomorrow, review next week")
  assert.equal(result.phrase, "next week")
  assert.equal(result.dueDate, "2026-09-11")
  assert.equal(result.nameWithoutPhrase, "Prepare tomorrow, review")
}

assert.equal(model.detectDueDatePhrase("tomorrow", referenceDate).nameWithoutPhrase, "")
assert.equal(
  model.keyForDate(model.addMonths(model.parseDateKey("2026-01-31"), 1)),
  "2026-02-28"
)

console.log("TodoModel due-date phrase tests passed")
