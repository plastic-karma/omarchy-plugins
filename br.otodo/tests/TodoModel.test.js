"use strict"

const assert = require("node:assert/strict")
const model = require("../TodoModel.js")
const reference = new Date(2026, 8, 4, 12, 0, 0)
const parse = (line, date = reference, fallback) => model.parseInput(line, date, fallback)

assert.deepEqual(parse("Call Plumber tom 9am #personal @chores !open !open #personal"), {
  kind: "task", name: "Call Plumber", projects: ["personal"], tags: ["chores"], state: "open",
  url: "", dueDate: "2026-09-05", dueTime: "09:00"
})
assert.throws(() => parse("Call !open !done"), Error)
assert.equal(parse("Read notes").dueDate, "")
assert.equal(parse("Read notes", reference, "2026-10-01").dueDate, "2026-10-01")
assert.equal(parse("Read notes tomorrow", reference, "2026-10-01").dueDate, "2026-09-05")
assert.equal(parse("Call 09:30", reference, "2026-10-01").dueDate, "2026-09-04")
assert.equal(parse("Call tomorrow").dueTime, "")
assert.throws(() => parse("Read notes", reference, "2026-02-30"), Error)

// Only the last contributing date and time disappear; earlier phrases remain title text.
for (const [line, name, dueDate, dueTime] of [
  ["Call today at 9 am tomorrow with team at 4 pm", "Call today at 9 am with team", "2026-09-05", "16:00"],
  ["Call in 2 hours tomorrow at 4 pm", "Call in 2 hours", "2026-09-05", "16:00"],
  ["Call in 2 hours at 4 pm", "Call", "2026-09-04", "16:00"],
  ["Call at 4 pm in 2 hours tomorrow", "Call at 4 pm", "2026-09-05", "14:00"],
  ["Call tomorrow at 25:30", "Call at 25:30", "2026-09-05", ""],
  ["Call in 9223372036854775807 months tomorrow", "Call in 9223372036854775807 months", "2026-09-05", ""]
]) {
  const task = parse(line)
  assert.deepEqual([task.name, task.dueDate, task.dueTime], [name, dueDate, dueTime], line)
}

for (const [phrase, date] of [
  ["ToDaY", "2026-09-04"], ["tom", "2026-09-05"], ["Sun", "2026-09-06"],
  ["Monday", "2026-09-07"], ["Tues", "2026-09-08"], ["Wed", "2026-09-09"],
  ["Thurs", "2026-09-10"], ["Friday", "2026-09-11"], ["Sat", "2026-09-05"],
  ["next week", "2026-09-11"], ["in 3 days", "2026-09-07"], ["in 2 weeks", "2026-09-18"]
]) assert.equal(parse(`Task ${phrase}`).dueDate, date, phrase)
assert.equal(parse("Budget next month", new Date(2024, 0, 31, 12)).dueDate, "2024-02-29")
assert.equal(parse("Budget in 2 months", new Date(2024, 0, 31, 12)).dueDate, "2024-03-31")
for (const phrase of ["tomorrow", "next month", "in 1 minute", "in 9223372036854775807 weeks"])
  assert.throws(() => parse(`Task ${phrase}`, new Date(9999, 11, 31, 23, 59)), Error, phrase)
const late = parse("Check oven in 1 minute", new Date(2026, 8, 4, 23, 59, 45))
assert.deepEqual([late.name, late.dueDate, late.dueTime], ["Check oven", "2026-09-05", "00:01"])
assert.equal(parse("Check in 1 minute", new Date(2026, 8, 4, 23, 59)).dueTime, "00:00")
assert.equal(parse("Check in 1 minute", new Date(2026, 8, 4, 23, 58, 0, 1)).dueTime, "00:00")
assert.equal(model.keyForDate(model.parseDateKey("0001-01-01")), "0001-01-01")

// Malformed clocks must not contribute a valid-looking suffix, nor identifiers a date word.
for (const phrase of [
  "24:00", "09:60", "9:30", "009:30", "09:300", "09:30:00", "09:30:",
  "09:3 pm", "13:00 pm", "0 am", "12:60 am", "09:30 pmish", "3 p.m.",
  "-09:30", "09:30.5", "v09:30", "09:30beta", "9am2", "task_09:30",
  "in 0 hours", "in -2 hours", "in 1.5 hours", "in 2 hours/path", "in 2 hours-task",
  "https://example.test/today", "https://example.test?time=09:30", "today@example.test",
  "/tmp/tomorrow", "C:\\today", "task_today", "today-task", "today.md", "étodé", "today\u0301", "Mon2"
]) {
  const line = `Read ${phrase}`
  const task = parse(line)
  assert.deepEqual([task.name, task.dueDate, task.dueTime], [line, "", ""], phrase)
}
for (const [phrase, time] of [["00:00", "00:00"], ["23:59", "23:59"], ["12 am", "00:00"], ["12 PM", "12:00"], ["at 1:05 pm", "13:05"]]) {
  const task = parse(`Call ${phrase}`)
  assert.deepEqual([task.name, task.dueTime], ["Call", time])
}
const unicode = parse("  Café\u2003with Zoë, Wed., after lunch #work #work @Équipe/Été @Équipe/Été @équipe/été !today")
assert.equal(unicode.name, "Café with Zoë after lunch")
assert.deepEqual(unicode.tags, ["Équipe/Été", "équipe/été"])
assert.equal(unicode.state, "today")
const protectedMetadata = parse("Task #today @tomorrow @9am !tom")
assert.deepEqual([protectedMetadata.name, protectedMetadata.dueDate, protectedMetadata.dueTime], ["Task", "", ""])

const link = "HTTPS://example.com/a_(b)?q=hello%20world&sort=new#section"
const linked = parse(`Read (${link}). https://second.test tomorrow`)
assert.equal(linked.url, link)
assert.equal(linked.name, `Read (${link}). https://second.test`)
assert.equal(parse("Read https://bad.test/%ZZ https://例え.jp/道").url, "https://例え.jp/道")
assert.equal(parse("Read https://example.test/? at 14:30 with team!").name, "Read https://example.test/? with team!")
assert.equal(parse("Read https://[::1]:443/a").url, "https://[::1]:443/a")
for (const value of ["example.com", "ftp://example.com", "prefixhttps://example.com", "user@https://example.com", "https://", "https://example.com:65536", "https://[:::1]/", "https://bad%2fhost/path", "https://bad%FFhost/path"])
  assert.equal(parse(`Read ${value}`).url, "", value)

for (const line of ["", "  ", "tomorrow 9am #work @chores", "Task #Work", "Task #", "Task @", "Task @bad,tag", "Task !", "Task\nOther", "Task\rOther", "Task\tOther", "Task\0Other", "Task\u2028Other", "Task\u2029Other", "Task\ud800"])
  assert.throws(() => parse(line), Error)
assert.equal(parse("é".repeat(8192)).name, "é".repeat(8192))
assert.throws(() => parse("é".repeat(8193)), Error)
assert.equal(parse("😀".repeat(4096)).name, "😀".repeat(4096))
assert.throws(() => parse("😀".repeat(4096) + "a"), Error)

for (const kind of ["list", "sync", "help", "clear", "quit", "parent", "attach"])
  assert.deepEqual(parse(`  /${kind}  `), { kind, line: `/${kind}` })
assert.deepEqual(parse("/list #work @Équipe !open due:today"), { kind: "list", line: "/list #work @Équipe !open due:today" })
assert.deepEqual(parse("/sync ours"), { kind: "sync", line: "/sync ours" })
// The CLI, not the capture parser, authoritatively rejects malformed remote-command arguments.
assert.equal(parse("/list not-a-filter").kind, "list")
assert.equal(parse("/sync both").kind, "sync")
for (const line of ["/", "/list#work", "/syncing", "/unknown", "/help extra", "/attach /tmp/file"])
  assert.throws(() => parse(line), Error)
assert.equal(parse("Discuss /sync ours").name, "Discuss /sync ours")

const catalog = {
  projects: [{ slug: "personal", name: "Personal" }, { slug: "work", name: "Work" }],
  tags: ["Équipe/Été", "chores"],
  states: [{ id: "open", name: "Open", terminal: false }, { id: "done", name: "Done", terminal: true }],
  default_state: "open"
}
const complete = (line, cursor = line.length) => model.completeInput(line, cursor, catalog)
assert.deepEqual(complete(" /syzz #work", 4), [{ value: "/sync", label: "/sync", start: 1, end: 6 }])
assert.deepEqual(complete("😀 #woZZ next", 6), [{ value: "#work", label: "#work", start: 3, end: 8 }])
assert.deepEqual(complete("Task @éq"), [{ value: "@Équipe/Été", label: "@Équipe/Été", start: 5, end: 8 }])
assert.deepEqual(complete("Task !d"), [{ value: "!done", label: "!done", start: 5, end: 7 }])
assert.deepEqual(complete("/sync t"), [{ value: "theirs", label: "theirs", start: 6, end: 7 }])
assert.deepEqual(complete("/sync ").map(item => item.value), ["ours", "theirs"])
assert.deepEqual(complete("/list due:n").map(item => item.value), ["due:none"])
for (const line of ["Task due:", "/listing due:", "Task /sy", "/sync ours t", "Task t", "Task https://example/#wo"])
  assert.deepEqual(complete(line), [], line)

console.log("TodoModel input parsing and completion tests passed")
