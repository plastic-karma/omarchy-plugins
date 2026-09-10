"use strict"
// Uses a real current CLI; all writes are confined to private temporary stores.
const assert = require("node:assert/strict")
const fs = require("node:fs")
const os = require("node:os")
const path = require("node:path")
const { spawnSync } = require("node:child_process")
const model = require("../TodoModel.js")
const cli = process.env.OTODO_BIN
assert.ok(cli && path.isAbsolute(cli), "Set OTODO_BIN to an absolute current otodo executable")
const helper = path.resolve(__dirname, "../bin/otodo-create")
const temporary = fs.mkdtempSync(path.join(os.tmpdir(), "otodo-attachment-helper-"))
const config = path.join(temporary, "config.json")
const env = { ...process.env, OTODO_BIN: cli, OTODO_OMARCHY_CONFIG: config, HOME: temporary }
function run(program, args) {
  const result = spawnSync(program, args, { cwd: temporary, env, encoding: "utf8", timeout: 30000, maxBuffer: 4 * 1024 * 1024 })
  if (result.error) throw result.error
  assert.equal(result.signal, null)
  return result
}
function success(result) {
  assert.equal(result.status, 0, result.stdout + result.stderr)
  return JSON.parse(result.stdout)
}
function tasks(root) { return fs.readdirSync(path.join(root, "Tasks")).sort() }
try {
  fs.mkdirSync(path.join(temporary, ".obsidian"))
  fs.mkdirSync(path.join(temporary, ".git"))
  fs.writeFileSync(path.join(temporary, ".obsidian", "community-plugins.json"), '["obsidian-git"]')
  fs.writeFileSync(config, "not valid json")
  assert.ok(model.decodeCapabilities(JSON.stringify(success(run(helper, ["--capabilities"])))).features.includes("attachments"))
  const names = ["日本語 receipt '$() ` & #?%.pdf", "--parent=NEVER_CREATED.png"]
  const contents = [Buffer.from([0, 1, 0xff, 0xc3, 0xa9]), Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x00])]
  names.forEach((name, index) => fs.writeFileSync(path.join(temporary, name), contents[index]))
  for (const version of [1, 2]) {
    success(run(cli, ["--format", "json", "init", `Version${version}`, "--vault-root", "."]))
    const root = path.join(temporary, `Version${version}`)
    const metadataPath = path.join(root, ".todo", "config.toml")
    const schemaPath = path.join(root, ".todo", "schema.json")
    if (version === 1) {
      // Use the independently maintained genuine v1 schema, not a relabelled v2 schema.
      const schema = path.resolve(__dirname, "../../../obsidian-todo/assets/schema-v1.json")
      fs.writeFileSync(schemaPath, fs.readFileSync(schema))
      fs.writeFileSync(metadataPath, fs.readFileSync(metadataPath, "utf8").replace(/^schema_version = 2$/m, "schema_version = 1"))
    }
    const metadata = fs.readFileSync(metadataPath)
    const schema = fs.readFileSync(schemaPath)
    fs.writeFileSync(config, JSON.stringify({ storeRoot: root }))
    const parent = success(run(helper, ["--add", "Parent", "2026-09-07"])).task
    const args = ["--add", "--literal $(touch NEVER_CREATED) <expense>", "", "--state", "active", "--tag", "receipt", "--url", "https://example.com/receipt?x=1&y=2", "--attach", names[0]]
    if (version === 2) args.push("--parent", parent.id)
    args.push("--attach", names[1])
    const created = success(run(helper, args)).task
    assert.equal(created.parent, version === 2 ? parent.id : null)
    assert.equal(created.due_date, null)
    assert.equal(created.due_time, null)
    assert.equal(created.state, "active")
    assert.deepEqual(created.tags, ["receipt"])
    assert.equal(created.url, "https://example.com/receipt?x=1&y=2")
    const result = success(run(cli, ["--root", root, "--format", "json", "attachment", "list", created.id]))
    assert.equal(result.version, 1)
    assert.equal(result.attachments.length, 2)
    const actualBytes = result.attachments.map(item => {
      assert.equal(item.availability, "available")
      assert.equal(item.byte_size, 5)
      return fs.readFileSync(path.join(root, item.path)).toString("hex")
    }).sort()
    assert.deepEqual(actualBytes, contents.map(bytes => bytes.toString("hex")).sort())
    assert.equal(fs.existsSync(path.join(temporary, "NEVER_CREATED")), false)
    assert.deepEqual(fs.readFileSync(metadataPath), metadata)
    assert.deepEqual(fs.readFileSync(schemaPath), schema)
    const before = tasks(root)
    for (const selection of [["--attach", names[0], "--attach", "missing.pdf"], ["--attach"], ["--attach", ""], ["--parent", parent.id, "--parent", parent.id], ["--attach", names[0], "--state", "missing"], ["--attach", names[0], "--due-time", "25:00"]]) {
      const failed = run(helper, ["--add", "Must not publish", "2026-09-07", ...selection])
      assert.notEqual(failed.status, 0)
      assert.deepEqual(tasks(root), before)
    }
    const failed = run(helper, ["--add", "Missing attachment", "2026-09-07", "--attach", "missing.pdf"])
    assert.equal(model.decodeMutationError(failed.stderr, failed.status).safeToRetry, true)
    success(run(cli, ["--root", root, "--format", "json", "validate"]))
  }
  console.log("Real CLI attachment helper tests passed (v1/v2, binary bytes, repeated arguments, failed imports)")
} finally {
  fs.rmSync(temporary, { recursive: true, force: true })
}
