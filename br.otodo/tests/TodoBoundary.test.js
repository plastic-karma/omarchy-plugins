"use strict"

const assert = require("node:assert/strict")
const model = require("../TodoModel.js")
const id = "01ARZ3NDEKTSV4RRFFQ69G5FAV"
const numericId = "01234567890123456789012345"
const task = { id, path: `Tasks/${id}.md`, name: "<b>Literal</b>", state: "done", terminal: true, parent: null }
const encodeTask = value => JSON.stringify({ version: 1, task: value })
const encodeCandidates = (tasks, has_more = false) => JSON.stringify({ version: 1, tasks, has_more })

assert.equal(model.normalizeParentId(id.toLowerCase()), id)
assert.equal(model.normalizeParentId(numericId), numericId)
assert.equal(model.normalizeParentId("7ZZZZZZZZZZZZZZZZZZZZZZZZZ"), "7ZZZZZZZZZZZZZZZZZZZZZZZZZ")
assert.throws(() => model.normalizeParentId("0" + "ſ".repeat(25)), Error)
for (const invalid of [null, undefined, "", 123, [], {}, id.slice(0, -1), ` ${id}`, `${id}\n`, `Tasks/${id}.md`, `[[${id}]]`, `8${id.slice(1)}`, `0${"I".repeat(25)}`, `0${"L".repeat(25)}`, `0${"O".repeat(25)}`, `0${"U".repeat(25)}`]) {
  assert.throws(() => model.normalizeParentId(invalid), Error)
  if (invalid !== undefined) {
    assert.throws(() => model.parseLaunchPayload(JSON.stringify({ text: "Keep draft", parentId: invalid })), Error)
  }
}
assert.deepEqual(model.parseLaunchPayload("{}"), { text: "", dueDate: "", parentId: "" })
assert.deepEqual(model.parseLaunchPayload(""), { text: "", dueDate: "", parentId: "" })
assert.deepEqual(model.parseLaunchPayload(JSON.stringify({ text: "-- tomorrow <i>x</i>", dueDate: "2026-09-06", parentId: id.toLowerCase() })), {
  text: "-- tomorrow <i>x</i>", dueDate: "2026-09-06", parentId: id
})
for (const malformed of ["null", "[]", "1", '"text"', "{", '{"text":{}}', '{"dueDate":null}'])
  assert.throws(() => model.parseLaunchPayload(malformed), Error)
assert.equal(model.parseLaunchPayload('{"__proto__":{"parentId":"bad"}}').parentId, "")

const capabilities = { version: 1, store_schema_versions: [1, 2], features: ["subtasks", "task_candidates", "store_upgrade"] }
assert.deepEqual(model.decodeCapabilities(JSON.stringify(capabilities)), capabilities)
assert.deepEqual(model.decodeCapabilities('{"version":1,"store_schema_versions":[1],"features":[]}').features, [])
for (const change of [{ version: 2 }, { store_schema_versions: ["2"] }, { store_schema_versions: [1, 1] }, { store_schema_versions: [0] }, { store_schema_versions: [1.5] }, { features: {} }, { features: [null] }, { features: ["subtasks", "subtasks"] }, { error: {} }])
  assert.throws(() => model.decodeCapabilities(JSON.stringify({ ...capabilities, ...change })), Error)

assert.deepEqual(model.decodeTask(encodeTask(task)), task)
assert.equal(model.decodeTask(encodeTask({ ...task, parent: numericId })).parent, numericId)
const { parent, ...legacyTask } = task
assert.equal(model.decodeTask(encodeTask(legacyTask)).parent, null)
for (const malformed of ["", "null", "[]", "{}", "{", JSON.stringify({ version: 2, task }), JSON.stringify({ version: 1, error: {}, task }), ...[
  { id: id.toLowerCase() }, { id: `8${id.slice(1)}` }, { name: null }, { path: "" }, { state: [] }, { terminal: "false" }, { parent: "" }, { parent: 123 }, { parent: id.toLowerCase() }
].map(change => encodeTask({ ...task, ...change }))]) {
  assert.throws(() => model.decodeTask(malformed), error => error instanceof Error && error.safeToRetry === false)
}
assert.deepEqual(model.decodeCandidates(encodeCandidates([task])), { tasks: [task], has_more: false })
assert.deepEqual(model.decodeCandidates(encodeCandidates([])), { tasks: [], has_more: false })
const twentyFive = Array.from({ length: 25 }, (_, index) => ({ ...task, id: String(index).padStart(26, "0") }))
assert.equal(model.decodeCandidates(encodeCandidates(twentyFive, true)).has_more, true)
assert.equal(model.decodeCandidates(encodeCandidates(twentyFive, false)).has_more, false)
for (const malformed of [encodeCandidates([task, task]), encodeCandidates([legacyTask]), encodeCandidates([{ ...task, body: "Not compact" }]), encodeCandidates([task], true), encodeCandidates([task], "false"), encodeCandidates({}), encodeCandidates([...twentyFive, { ...task, id }])])
  assert.throws(() => model.decodeCandidates(malformed), Error)
for (const decoder of [model.decodeCapabilities, model.decodeCandidates]) {
  for (const malformed of [null, {}, "null", "[]", "{}", "{", '{"version":"1"}'])
    assert.throws(() => decoder(malformed), Error)
}

const decodedError = model.decodeError(JSON.stringify({ version: 1, error: { code: "task_not_found", message: "Parent <missing>", path: "Tasks/file.md", field: "parent" } }))
assert.ok(decodedError.includes("task_not_found"))
assert.ok(decodedError.includes("Parent <missing>"))
assert.ok(decodedError.includes("Tasks/file.md"))
assert.equal(model.decodeError("  otodo-create: invalid storeRoot\n"), "otodo-create: invalid storeRoot")
for (const fallback of ["{", "null", "[]", '{"version":1,"error":null}', '{"version":1,"error":{"code":1,"message":"bad"}}'])
  assert.equal(model.decodeError(fallback), fallback)
assert.equal(typeof model.decodeError(""), "string")

const encodeError = (code, details = {}) => JSON.stringify({
  version: 1, error: { code, message: "Request failed", ...details }
})
// A failed durability sync or response encoding can follow successful publication.
for (const [code, exitCode] of [["io_error", 8], ["extra_property_json_failed", 5], ["internal_error", 8], ["future_rejection", 5]]) {
  assert.equal(model.decodeMutationError(encodeError(code), exitCode).safeToRetry, false)
}
const missingParent = encodeError("task_not_found", { path: `Tasks/${id}.md`, field: "parent" })
assert.equal(model.decodeMutationError(missingParent, 3).safeToRetry, true)
assert.equal(model.decodeMutationError(encodeError("invalid_parent_id"), 5).safeToRetry, true)
assert.equal(model.decodeMutationError(encodeError("unsupported_schema"), 7).safeToRetry, true)
assert.equal(model.decodeMutationError(encodeError("schema_version_mismatch"), 7).safeToRetry, true)
assert.equal(model.decodeMutationError(encodeError("concurrent_modification"), 6).safeToRetry, true)
assert.equal(model.decodeMutationError(encodeError("unresolved_conflict"), 6).safeToRetry, true)
for (const exitCode of [0, 5, 8, -1, "3", undefined]) {
  assert.equal(model.decodeMutationError(missingParent, exitCode).safeToRetry, false)
}
for (const malformed of [
  "", "not JSON", "{", "null", "[]", '{"version":2,"error":{"code":"task_not_found","message":"Missing"}}',
  '{"version":1,"error":{"code":"task_not_found"}}',
  '{"version":1,"error":{"code":"task_not_found","message":null}}',
  JSON.stringify({ version: 1, error: { code: "task_not_found", message: "Missing" }, task }),
  encodeError("task_not_found", { path: [] }),
  encodeError("task_not_found", { issues: "invalid" }),
  encodeError("task_not_found", { validation: { valid: true } })
]) {
  assert.equal(model.decodeMutationError(malformed, 3).safeToRetry, false)
}

console.log("TodoModel subtask boundary tests passed")
