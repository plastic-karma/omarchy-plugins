"use strict"

const assert = require("node:assert/strict")
const fs = require("node:fs")
const os = require("node:os")
const path = require("node:path")
const { pathToFileURL } = require("node:url")
const { spawnSync } = require("node:child_process")
const temporary = fs.mkdtempSync(path.join(os.tmpdir(), "console-qml-"))
const plugin = path.resolve(__dirname, "..")
const shellRoot = process.env.OMARCHY_PATH || "/usr/share/omarchy"

try {
  for (const directory of fs.readdirSync(path.join(shellRoot, "shell"), { withFileTypes: true }))
    if (directory.isDirectory()) fs.symlinkSync(path.join(shellRoot, "shell", directory.name), path.join(temporary, directory.name))
  fs.writeFileSync(path.join(temporary, "shell.qml"), `
import Quickshell
import QtQuick
ShellRoot {
  Loader {
    source: ${JSON.stringify(pathToFileURL(path.join(plugin, "Console.qml")).href)}
    onLoaded: {
      try {
        function run(source) { return JSON.parse(item.evaluate(source)) }
        function check(value, message) { if (!value) throw new Error(message) }

        // Both log rendering and result rendering must leave accessors alone.
        // Qt.isQtObject() and Object.keys() each invoked getters on this runtime.
        var inspected = run('$.reads = 0; $.object = {get secret() { $.reads++; throw new Error("getter executed") }}; console.log($.object); $.object')
        check(inspected.ok && inspected.result.indexOf('"secret"') !== -1,
          "accessor-bearing result must have an inspectable preview")
        check(run('$.reads').result === "0", "display must not execute getters")
        run('$.object')
        check(run('$_ === $.object').result === "true", "last result must preserve object identity")

        // Specialized previews must not dispatch to user-defined conversion hooks.
        check(run('$.conversionReads = 0; $.special = [function() {}, new Date(0), /probe/i]; $.special.forEach(function(value) { Object.defineProperty(value, "toString", {get: function() { $.conversionReads++; return function() { return "custom conversion" } }}); }); console.log($.special); $.special').ok,
          "specialized objects must be accepted as results")
        check(run('$_ === $.special').result === "true", "specialized results must retain their actual values")
        check(run('$.conversionReads').result === "0", "previewing functions, dates and regexps must not call conversion getters")

        // Error reporting must not call custom stringification or error accessors.
        check(run('$.errorReads = 0; $.error = Object.create(Error.prototype); Object.defineProperties($.error, {name: {get: function() { $.errorReads++; return "CustomError" }}, message: {get: function() { $.errorReads++; return "custom message" }}, stack: {get: function() { $.errorReads++; return "custom stack" }}, toString: {get: function() { $.errorReads++; return Error.prototype.toString }}}); "ready"').ok,
          "custom error accessors must be installed before testing the throw")
        check(!run('throw $.error').ok, "a custom Error must still be reported as a failure")
        check(run('$.errorReads').result === "0", "reporting an Error must not execute accessors")

        var nativeError = run('$.nativeReads = 0; function nativeStackProbe() { let error = new TypeError("original"); Object.defineProperty(error, "message", {get: function() { $.nativeReads++; return "custom message" }}); throw error }; nativeStackProbe()')
        check(!nativeError.ok && nativeError.error.indexOf("TypeError") !== -1
          && nativeError.error.indexOf("nativeStackProbe") !== -1,
          "native error type and stack must survive descriptor-based formatting")
        check(run('$.nativeReads').result === "0", "native stack rendering must not read the custom message")

        check(run(undefined).ok && run(42).result === "42",
          "missing and non-string input must produce evaluation envelopes")

        // An exception is not permission to retry the input under another wrapper.
        run('$.effects = 0; "previous result"')
        var failed = run('$.effects++; throw new Error("after mutation")')
        check(!failed.ok && failed.error.indexOf("after mutation") !== -1,
          "evaluation must report the original exception")
        check(run('$_').result === "previous result", "failure must retain the previous result")
        check(run('$.effects').result === "1", "throwing code must execute exactly once")

        // Introspection commonly returns graphs that point back to themselves.
        var cyclic = run('$.cycle = {}; $.cycle.self = $.cycle; $.cycle')
        check(cyclic.ok && cyclic.result.indexOf('"self"') !== -1,
          "cycles must remain inspectable rather than failing serialization")
        check(run('$_ === $.cycle && $_.self === $_').result === "true",
          "previewing a cycle must not clone or alter it")
        console.log("CONSOLE_QML_PASS")
      } catch (error) {
        console.error("CONSOLE_QML_FAIL: " + error.message + "\\n" + error.stack)
      }
      Qt.callLater(function() { Qt.quit() })
    }
  }
}
`)
  const result = spawnSync("quickshell", ["--no-color", "--path", path.join(temporary, "shell.qml")], {
    encoding: "utf8", timeout: 20000, maxBuffer: 4 * 1024 * 1024,
    env: { ...process.env, QT_QPA_PLATFORM: "wayland", QT_QUICK_BACKEND: "software",
      QML_DISABLE_DISK_CACHE: "1", OMARCHY_PATH: shellRoot,
      XDG_CONFIG_HOME: temporary, XDG_CACHE_HOME: path.join(temporary, "cache") }
  })
  if (result.error) throw new Error(result.error.message + "\n" + result.stdout + result.stderr)
  const output = result.stdout + result.stderr
  assert.equal(result.status, 0, output)
  assert.match(output, /CONSOLE_QML_PASS/, output)
  assert.doesNotMatch(output, /CONSOLE_QML_FAIL|Failed to load configuration/, output)
  console.log("Real QML getter, object-identity, exception, and cyclic-result regressions passed")
} finally {
  fs.rmSync(temporary, { recursive: true, force: true })
}
