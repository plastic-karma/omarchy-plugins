"use strict"
// Execute the plugin and installed Omarchy components on Wayland. Keep the test
// surface hidden so the test never steals desktop focus; state/navigation is real QML.
const assert = require("node:assert/strict")
const fs = require("node:fs")
const os = require("node:os")
const path = require("node:path")
const { spawnSync } = require("node:child_process")
const temporary = fs.mkdtempSync(path.join(os.tmpdir(), "otodo-attachments-qml-"))
const shellRoot = process.env.OMARCHY_PATH || "/usr/share/omarchy"
try {
  for (const folder of fs.readdirSync(path.join(shellRoot, "shell"), { withFileTypes: true }))
    if (folder.isDirectory()) fs.symlinkSync(path.join(shellRoot, "shell", folder.name), path.join(temporary, folder.name))
  fs.mkdirSync(path.join(temporary, "plugin"))
  const importFolder = path.join(temporary, "Files")
  fs.mkdirSync(importFolder)
  fs.writeFileSync(path.join(importFolder, "日本語 <b>receipt</b>.pdf".replaceAll("/", "_")), "Original bytes")
  fs.writeFileSync(path.join(importFolder, "large.bin"), "")
  fs.truncateSync(path.join(importFolder, "large.bin"), 20 * 1024 * 1024 + 1)
  for (const file of ["TodoOverlay.qml", "TodoModel.js"]) {
    let contents = fs.readFileSync(path.join(__dirname, "..", file), "utf8")
    if (file.endsWith(".qml")) contents = contents.replace("visible: root.opened", "visible: false")
      .replace("id: root", "id: root\n property alias testFiles: attachmentFiles\n property alias testList: attachmentList\n property alias testInput: taskField\n property string testPaste: \"\"")
      .replace("pasteBuffer.paste()", "pasteBuffer.text = root.testPaste")
    fs.writeFileSync(path.join(temporary, "plugin", file), contents)
  }
  fs.writeFileSync(path.join(temporary, "shell.qml"), `
import Quickshell
import QtQuick
import "plugin" as Plugin
ShellRoot {
  Plugin.TodoOverlay { id: overlay }
  property int checks: 0
  function check(value, message) { if (!value) throw new Error(message) }
  Timer {
    interval: 100
    running: true
    onTriggered: {
      try {
        overlay.open('{}')
        overlay.testPaste = "\\nFirst queued task\\r\\n\\t\\r\\nSecond queued task"
        overlay.pasteInput()
        check(overlay.testInput.text === "First queued task"
          && overlay.queuedDrafts.length === 1 && overlay.queuedDrafts[0] === "Second queued task",
          "multiline paste skips empty drafts and never auto-submits")
        check(!overlay.mutationPending && overlay.savedCount === 0, "paste requires Enter for each save")
        overlay.testInput.text = "a".repeat(16384)
        overlay.testInput.cursorPosition = 16384
        overlay.testPaste = "extra"
        overlay.pasteInput()
        check(overlay.testInput.text === "a".repeat(16384) && overlay.errorText !== "",
          "oversized paste preserves the entire existing draft")
        overlay.open('{"text":"Submit expenses tom 9am #work @receipts !active","dueDate":"2026-09-07"}')
        check(overlay.parsedInput.name === "Submit expenses" && overlay.parsedInput.dueTime === "09:00"
          && overlay.parsedInput.state === "active", "Qt recognizes inline dates and metadata")
        overlay.executableFeatures = ["attachments"]
        overlay.capabilitiesState = "ready"
        check(overlay.supportsAttachments && !overlay.supportsSubtasks && !overlay.supportsTaskCandidates, "independent features")
        check(overlay.addAttachmentUrls(["file:///tmp/receipt%20%24.pdf", "file:///tmp/photo.png"]), "drop local files")
        check(overlay.attachmentSelections.length === 2, "selection count")
        check(overlay.addAttachmentUrls(["file:///tmp/photo.png"]), "duplicate selection")
        check(overlay.attachmentSelections.length === 2, "deduplicate local paths")
        check(!overlay.addAttachmentUrls(["file:///tmp/other.pdf", "https://example.com/file"]), "reject nonlocal drop")
        check(overlay.attachmentSelections.length === 2, "invalid drop changes no selections")
        overlay.openAttachmentPicker()
        check(overlay.stage === "attachments", "embedded browser opens from input")
        overlay.leaveAttachmentPicker()
        check(overlay.stage === "text" && overlay.attachmentSelections.length === 2, "browser returns to input")
        overlay.openParentPicker()
        check(overlay.stage === "parent" && overlay.attachmentSelections.length === 2, "parent preserves selections")
        overlay.openAttachmentPicker()
        check(overlay.stage === "attachments", "browser opens from parent")
        overlay.removeAttachment(0)
        check(overlay.attachmentSelections.length === 1 && overlay.attachmentSelections[0].path === "/tmp/photo.png", "remove selected source")
        overlay.leaveAttachmentPicker()
        check(overlay.stage === "parent", "browser returns to parent")
        check(!overlay.candidatesLoading, "parent lookup does not remain stuck after returning")
        overlay.leaveParentPicker()
        check(overlay.stage === "text" && overlay.attachmentSelections.length === 1, "title preserves selections")
        overlay.mutationUncertain = true
        check(!overlay.addAttachmentUrls(["file:///tmp/blocked.pdf"]), "uncertain result blocks drops")
        overlay.removeAttachment(0)
        check(overlay.attachmentSelections.length === 1, "uncertain result retains selections")
        overlay.submitLine()
        check(!overlay.mutationPending, "uncertain result blocks retry")
        overlay.close()
        overlay.open('{}')
        check(overlay.attachmentSelections.length === 0, "new draft clears selections")
        overlay.executableFeatures = ["subtasks", "task_candidates"]
        overlay.capabilitiesState = "ready"
        check(!overlay.supportsAttachments && overlay.supportsSubtasks && overlay.supportsTaskCandidates, "older CLI still supports existing features")
        overlay.openAttachmentPicker()
        check(overlay.stage === "text", "unsupported attachments do not open")
        overlay.executableFeatures = ["attachments"]
        overlay.attachmentFolder = ${JSON.stringify("file://" + importFolder)}
        overlay.openAttachmentPicker()
        browserChecks.start()
      } catch (error) { console.error("ATTACHMENT_QML_FAIL: " + error.stack); Qt.quit() }
    }
  }
  Timer {
    id: browserChecks
    interval: 100
    repeat: true
    onTriggered: {
      try {
        if (overlay.testFiles.count !== 2) {
          check(checks++ < 40, "browser loaded folder")
          return
        }
        var receipt = overlay.testFiles.get(0, "fileName") === "large.bin" ? 1 : 0
        overlay.chooseAttachment(receipt)
        check(overlay.attachmentSelections.length === 1, "browser selects actual local file")
        check(overlay.attachmentSelections[0].size === 14, "browser reads byte size")
        overlay.chooseAttachment(1 - receipt)
        check(overlay.attachmentSelections.length === 1 && overlay.attachmentError.indexOf("20 MiB") >= 0, "browser rejects oversized file")
        check(overlay.testList.count === 2, "browser list contains real model rows")
        overlay.close()
        console.log("ATTACHMENT_QML_PASS")
      } catch (error) { console.error("ATTACHMENT_QML_FAIL: " + error.stack) }
      stop()
      Qt.quit()
    }
  }
}
`)
  const result = spawnSync("quickshell", ["--no-color", "--path", path.join(temporary, "shell.qml")], {
    encoding: "utf8", timeout: 20000, maxBuffer: 4 * 1024 * 1024,
    env: { ...process.env, QT_QPA_PLATFORM: "wayland", QT_QUICK_BACKEND: "software", OMARCHY_PATH: shellRoot,
      XDG_CONFIG_HOME: temporary, XDG_CACHE_HOME: path.join(temporary, "cache") }
  })
  if (result.error) throw result.error
  const output = result.stdout + result.stderr
  assert.match(output, /ATTACHMENT_QML_PASS/, output)
  assert.doesNotMatch(output, /ATTACHMENT_QML_FAIL|Failed to load configuration|ReferenceError:|TypeError:/, output)
  assert.equal(result.status, 0, output)
  console.log("Real QML attachment navigation and capability tests passed")
} finally {
  fs.rmSync(temporary, { recursive: true, force: true })
}
