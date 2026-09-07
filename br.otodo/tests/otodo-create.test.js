"use strict"

// Run with OTODO_BIN=/absolute/current/otodo OTODO_LEGACY_BIN=/absolute/v1/otodo node tests/otodo-create.test.js.
// OTODO_OMARCHY_CONFIG, if supplied, is read only: its settings are copied and storeRoot
// is replaced with a private temporary store. No caller store or installed config is used.
const assert = require("node:assert/strict")
const fs = require("node:fs")
const os = require("node:os")
const path = require("node:path")
const { spawnSync } = require("node:child_process")
const model = require("../TodoModel.js")
const helper = path.resolve(__dirname, "../bin/otodo-create")

function binary(name) {
  const value = process.env[name]
  assert.ok(value && path.isAbsolute(value), `${name} must name an absolute real otodo binary`)
  fs.accessSync(value, fs.constants.X_OK)
  return value
}

const cli = binary("OTODO_BIN")
const legacy = binary("OTODO_LEGACY_BIN")
const template = process.env.OTODO_OMARCHY_CONFIG
  ? JSON.parse(fs.readFileSync(process.env.OTODO_OMARCHY_CONFIG, "utf8")) : {}
assert.ok(template && typeof template === "object" && !Array.isArray(template), "Config override must be a JSON object")
const temp = fs.mkdtempSync(path.join(os.tmpdir(), "otodo-helper-"))
const config = path.join(temp, "omarchy config.json")
const env = { ...process.env, HOME: temp, XDG_CONFIG_HOME: path.join(temp, "config"), OTODO_BIN: cli, OTODO_OMARCHY_CONFIG: config }
const date = "2026-09-06"
const missing = "00000000000000000000000000"

function run(program, args, environment = env) {
  const result = spawnSync(program, args, { cwd: temp, env: environment, encoding: "utf8", timeout: 30000, maxBuffer: 1024 * 1024 })
  if (result.error) throw result.error
  assert.equal(result.signal, null, `Command interrupted: ${program}: ${result.stderr}`)
  return result
}

function success(result) {
  assert.equal(result.status, 0, `stdout=${result.stdout}\nstderr=${result.stderr}`)
  assert.equal(result.stderr, "")
  return result.stdout
}

function failure(result, code) {
  assert.notEqual(result.status, 0, `Unexpected successful mutation: ${result.stdout}`)
  assert.equal(result.stdout, "", "Failure must not produce a successful stdout envelope")
  if (code) assert.equal(JSON.parse(result.stderr).error.code, code)
  return model.decodeError(result.stderr)
}

function invoke(args, overrides = {}) {
  return run(helper, args, { ...env, ...overrides })
}

function rooted(root, args, executable = cli) {
  return run(executable, ["--root", root, "--format", "json", ...args])
}

function initialize(name, executable = cli) {
  success(run(executable, ["--format", "json", "init", name, "--vault-root", "."]))
  return path.join(temp, name)
}

function select(root) {
  fs.writeFileSync(config, JSON.stringify({ ...template, storeRoot: root }))
}

function tasksSnapshot(root) {
  const files = []
  function visit(directory) {
    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
      const file = path.join(directory, entry.name)
      if (entry.isDirectory()) visit(file)
      else files.push([path.relative(root, file), fs.readFileSync(file).toString("base64")])
    }
  }
  visit(path.join(root, "Tasks"))
  return files.sort((a, b) => a[0].localeCompare(b[0]))
}

function unchanged(root, action) {
  const before = tasksSnapshot(root)
  action()
  assert.deepEqual(tasksSnapshot(root), before, "Refused parent intent must not write a child or fallback root")
}

try {
  fs.mkdirSync(path.join(temp, ".obsidian"))
  fs.mkdirSync(path.join(temp, ".git"))
  fs.writeFileSync(path.join(temp, ".obsidian/community-plugins.json"), '["obsidian-git"]')

  // Binary-only discovery must survive an unreadable-as-JSON store configuration.
  fs.writeFileSync(config, "not JSON")
  const capabilities = model.decodeCapabilities(success(invoke(["--capabilities"])))
  assert.ok(capabilities.features.includes("subtasks"))
  assert.ok(capabilities.features.includes("task_candidates"))
  assert.ok(capabilities.store_schema_versions.includes(2))
  failure(invoke(["--check"]))

  const root = initialize("Todo space ' $ &")
  select(root)
  success(invoke(["--check"]))
  const literal = "--parent=$(touch NEVER_CREATED); `echo nope` ' \" & <b>literal</b>"
  const parent = model.decodeTask(success(invoke(["--add", literal, date])))
  assert.equal(parent.name, literal)
  assert.equal(parent.due_date, date)
  assert.equal(parent.parent, null)
  assert.equal(fs.existsSync(path.join(temp, "NEVER_CREATED")), false)
  const candidates = model.decodeCandidates(success(invoke(["--parents", literal])))
  assert.deepEqual(candidates.tasks.map(task => task.id), [parent.id])
  assert.equal(candidates.has_more, false)
  const found = model.decodeTask(success(invoke(["--parent", parent.id.toLowerCase()])))
  assert.equal(found.id, parent.id)

  // Terminal parents remain eligible, including in the bounded --all search.
  success(rooted(root, ["complete", parent.id, "--on", date]))
  const terminal = model.decodeCandidates(success(invoke(["--parents", literal]))).tasks[0]
  assert.equal(terminal.terminal, true)
  const childName = "--roots [child] ; $HOME * ? --parent"
  const child = model.decodeTask(success(invoke(["--add", childName, date, "--parent", parent.id.toLowerCase()])))
  assert.equal(child.name, childName)
  assert.equal(child.parent, parent.id)
  assert.equal(child.terminal, false)
  assert.equal(model.decodeTask(success(rooted(root, ["show", child.id]))).parent, parent.id)

  for (let index = 0; index < 26; index++)
    success(invoke(["--add", `Bounded needle ${String(index).padStart(2, "0")}`, date]))
  const bounded = model.decodeCandidates(success(invoke(["--parents", "BOUNDED NEEDLE"])))
  assert.equal(bounded.tasks.length, 25)
  assert.equal(bounded.has_more, true)
  assert.deepEqual(bounded.tasks.map(task => task.name), Array.from({ length: 25 }, (_, index) => `Bounded needle ${String(index).padStart(2, "0")}`))
  assert.deepEqual(model.decodeCandidates(success(invoke(["--parents", "does not match"]))).tasks, [])

  unchanged(root, () => {
    failure(invoke(["--parent", missing]), "task_not_found")
    failure(invoke(["--add", "Missing parent child", date, "--parent", missing]), "task_not_found")
    failure(invoke(["--add", "Non-ASCII parent", date, "--parent", "0" + "ſ".repeat(25)]))
    for (const invalid of ["", parent.id.slice(0, 8), ` ${parent.id}`, `8${parent.id.slice(1)}`, "[[parent]]", "0123456789012345678901234I"])
      failure(invoke(["--add", "Invalid intent", date, "--parent", invalid]))
    for (const args of [["--check", "extra"], ["--capabilities", "extra"], ["--parents"], ["--parent"], ["--parent", parent.id, "extra"], ["--add", "Draft", date, "--parent"], ["--add", "Draft", date, "--other", parent.id], ["--add", "Draft", date, "--parent", parent.id, "extra"]])
      failure(invoke(args))
  })

  // Selection is advisory: an externally removed target must fail at mutation time.
  const stale = model.decodeTask(success(invoke(["--add", "Stale target", date])))
  assert.equal(model.decodeTask(success(invoke(["--parent", stale.id]))).id, stale.id)
  const stalePath = path.resolve(root, stale.path)
  assert.ok(stalePath.startsWith(root + path.sep), "CLI path must remain inside temporary store")
  fs.unlinkSync(stalePath)
  unchanged(root, () => failure(invoke(["--add", "Must not become a root", date, "--parent", stale.id]), "task_not_found"))

  // A real historical executable supplies the exact historical store/schema pair.
  const v1 = initialize("Legacy", legacy)
  select(v1)
  const legacyRoot = model.decodeTask(success(invoke(["--add", "Legacy root", date], { OTODO_BIN: legacy })))
  assert.equal(legacyRoot.parent, null)
  unchanged(v1, () => {
    failure(invoke(["--capabilities"], { OTODO_BIN: legacy }))
    failure(invoke(["--parents", "Legacy"], { OTODO_BIN: legacy }))
    failure(invoke(["--add", "Legacy child rejected", date, "--parent", legacyRoot.id], { OTODO_BIN: legacy }))
    failure(invoke(["--add", "V1 child rejected", date, "--parent", legacyRoot.id]), "unsupported_schema")
  })
  assert.equal(model.decodeCandidates(success(invoke(["--parents", "Legacy"]))).tasks[0].parent, null)
  assert.equal(model.decodeTask(success(invoke(["--add", "V1 ordinary root", date]))).parent, null)

  select(root)
  const storeConfig = path.join(root, ".todo/config.toml")
  const originalConfig = fs.readFileSync(storeConfig, "utf8")
  assert.match(originalConfig, /^schema_version = 2$/m)
  fs.writeFileSync(storeConfig, originalConfig.replace(/^schema_version = 2$/m, "schema_version = 999"))
  unchanged(root, () => {
    failure(invoke(["--parents", ""]), "unsupported_schema")
    failure(invoke(["--parent", parent.id]), "unsupported_schema")
    failure(invoke(["--add", "Unsupported child", date, "--parent", parent.id]), "unsupported_schema")
  })
  model.decodeCapabilities(success(invoke(["--capabilities"])))
  fs.writeFileSync(storeConfig, originalConfig)
  success(rooted(root, ["validate"]))
  console.log("otodo-create real-store integration tests passed (current CLI, v1 store, legacy CLI)")
} finally {
  fs.rmSync(temp, { recursive: true, force: true })
}
