"use strict"

const assert = require("node:assert/strict")
const fs = require("node:fs")
const os = require("node:os")
const path = require("node:path")
const { spawnSync } = require("node:child_process")
const temporary = fs.mkdtempSync(path.join(os.tmpdir(), "otodo-input-qml-"))
const plugin = path.resolve(__dirname, "..")
const cli = process.env.OTODO_BIN || path.join(os.homedir(), ".cargo/bin/otodo")
const shellRoot = process.env.OMARCHY_PATH || "/usr/share/omarchy"
const store = path.join(temporary, "Todo")
const environment = { ...process.env, OTODO_BIN: cli,
  OTODO_OMARCHY_CONFIG: path.join(temporary, "otodo.json"),
  QT_QPA_PLATFORM: "wayland", QT_QUICK_BACKEND: "software", OMARCHY_PATH: shellRoot,
  XDG_CONFIG_HOME: temporary, XDG_CACHE_HOME: path.join(temporary, "cache") }

function run(program, args) {
  const result = spawnSync(program, args, { cwd: temporary, env: environment,
    encoding: "utf8", timeout: 20000, maxBuffer: 4 * 1024 * 1024 })
  if (result.error) throw result.error
  assert.equal(result.status, 0, result.stdout + result.stderr)
  return result.stdout
}

try {
  run(cli, ["init", "Todo", "--vault-root", "."])
  run(cli, ["--root", store, "project", "create", "work", "--name", "Work"])
  run(cli, ["--root", store, "add", "Listed first task"])
  fs.writeFileSync(environment.OTODO_OMARCHY_CONFIG, JSON.stringify({ storeRoot: store }))
  for (const directory of fs.readdirSync(path.join(shellRoot, "shell"), { withFileTypes: true }))
    if (directory.isDirectory()) fs.symlinkSync(path.join(shellRoot, "shell", directory.name), path.join(temporary, directory.name))
  fs.mkdirSync(path.join(temporary, "plugin"))
  for (const file of ["TodoOverlay.qml", "TodoModel.js"]) {
    let contents = fs.readFileSync(path.join(plugin, file), "utf8")
    if (file.endsWith(".qml")) contents = contents.replace("visible: root.opened", "visible: false")
      .replace("id: root", 'id: root\n property alias testInput: taskField\n property string testPaste: ""')
      .replace("pasteBuffer.paste()", "pasteBuffer.text = root.testPaste")
    fs.writeFileSync(path.join(temporary, "plugin", file), contents)
  }
  fs.writeFileSync(path.join(temporary, "shell.qml"), `
import Quickshell
import QtQuick
import "plugin" as Plugin
ShellRoot {
  Plugin.TodoOverlay {
    id: capture
    manifest: ({id: "br.otodo", __sourceDir: ${JSON.stringify(plugin)}})
  }
  property int step: 0
  property int ticks: 0
  function check(value, message) { if (!value) throw new Error(message) }
  function submit(line) { capture.testInput.text = line; capture.submitLine() }
  Timer {
    interval: 50
    repeat: true
    running: true
    onTriggered: {
      try {
        check(ticks++ < 200, "input session timed out: " + capture.errorText)
        if (capture.mutationPending) return
        if (step === 0) {
          capture.open('{}')
          step++
        } else if (step === 1) {
          if (capture.capabilitiesState !== "ready" || capture.catalogPending) return
          submit("/list")
          step++
        } else if (step === 2) {
          check(capture.showResults && capture.resultTasks.length === 1
            && capture.resultTasks[0].name === "Listed first task", "list displays the stored task")
          submit("Saved after list tom 9am #work @capture !active")
          step++
        } else if (step === 3) {
          check(capture.savedCount === 1 && capture.opened && capture.testInput.text === "", "capture stays open and advances")
          check(!capture.showResults && capture.resultTasks.length === 0, "saving clears stale list rows")
          capture.testPaste = "First queued task\\nSecond queued task\\nThird queued task"
          capture.pasteInput()
          capture.testInput.text = ""
          var historyCount = capture.historyEntries.length
          capture.submitLine()
          check(capture.testInput.text === "Second queued task" && capture.queuedDrafts.length === 1,
            "empty Enter skips a cleared draft and reviews the next queued line")
          check(!capture.mutationPending && capture.savedCount === 1 && capture.historyEntries.length === historyCount,
            "skipping a draft neither writes a task nor records a successful capture")
          capture.submitLine()
          step++
        } else if (step === 4) {
          check(capture.savedCount === 2 && capture.testInput.text === "Third queued task", "one Enter saves one queued task")
          submit("/sync")
          step++
        } else if (step === 5) {
          check(capture.errorText !== "" && capture.mutationUncertain, "failed sync pauses the session")
          submit("Must not be saved after failed sync")
          check(!capture.mutationPending && capture.savedCount === 2, "paused sync cannot submit another line")
          capture.close()
          capture.open('{}')
          step++
        } else if (step === 6) {
          if (capture.catalogPending || capture.capabilitiesState !== "ready") return
          check(!capture.mutationUncertain, "explicit new session releases the pause")
          submit("After reopening")
          step++
        } else {
          check(capture.savedCount === 1 && capture.opened && capture.testInput.text === "", "new session can capture normally")
          capture.close()
          console.log("INPUT_QML_PASS")
          stop()
          Qt.quit()
        }
      } catch (error) {
        console.error("INPUT_QML_FAIL: " + error.message + "\\n" + error.stack)
        stop()
        Qt.quit()
      }
    }
  }
}
`)
  const output = run("quickshell", ["--no-color", "--path", path.join(temporary, "shell.qml")])
  assert.match(output, /INPUT_QML_PASS/, output)
  assert.doesNotMatch(output, /INPUT_QML_FAIL|Failed to load configuration|ReferenceError:|TypeError:/, output)
  const tasks = JSON.parse(run(cli, ["--root", store, "--format", "json", "list", "--all"])).tasks
  assert.deepEqual(new Set(tasks.map(task => task.name)), new Set([
    "Listed first task", "Saved after list", "Second queued task", "After reopening"
  ]))
  const captured = tasks.find(task => task.name === "Saved after list")
  assert.equal(captured.state, "active")
  assert.equal(captured.due_time, "09:00")
  assert.deepEqual(captured.projects, ["work"])
  assert.deepEqual(captured.tags, ["capture"])
  const next = tasks.find(task => task.name === "Second queued task")
  assert.equal(next.state, "open")
  assert.equal(next.due_date, null)
  assert.deepEqual(next.projects, [])
  assert.deepEqual(next.tags, [])
  console.log("Real QML capture, queued-draft, list-reset, and sync-pause tests passed")
} finally {
  fs.rmSync(temporary, { recursive: true, force: true })
}
