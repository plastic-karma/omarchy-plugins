import Quickshell
import Quickshell.Wayland
import QtQuick
import QtQuick.Controls as Controls
import QtQuick.Layouts
import qs.Commons
import qs.Ui

Item {
  id: root

  property string omarchyPath: Quickshell.env("OMARCHY_PATH")
  property var shell: null
  property var manifest: null
  property bool opened: false
  property var scratch: ({})
  property var lastResult: undefined
  property var history: []
  property int historyIndex: 0
  property string historyDraft: ""
  property int sequence: 0
  readonly property var nativeConsole: console
  readonly property var nativeErrorStackGetter: Object.getOwnPropertyDescriptor(new Error(), "stack").get
  readonly property string helpText: [
    "Runs once, directly in this plugin's QML context on the shell's main thread. No sandbox, timeout, or undo.",
    "Available: root (this plugin), shell (the real host), manifest, Qt, Quickshell, Color, Style.",
    "$ is persistent scratch state; $_ is the last result, including a returned Promise. Use let/const or an IIFE for local bindings. Non-strict var declarations can persist in the QML context and collide with inherited QML names; there is no per-entry isolation. Scratch state survives closing, not plugin reload or shell restart.",
    "console.log/info/debug/warn/error/dir and print(...) write here, including from callbacks. Other console methods remain available through root.nativeConsole. Results are bounded previews; $_ retains the actual object. Functions, QObjects, dates and regexps use type labels instead of invoking their conversion hooks. Request an explicit conversion when needed. Object.getOwnPropertyNames(value) lists members without reading ordinary getters (unlike Object.keys in this Qt runtime). Proxy reflection traps and modified built-ins are not isolated.",
    "Ctrl+Enter or Run: execute the entire editor. Enter: newline. Ctrl+Up/Down: history. Ctrl+L: clear output only. Esc: close (does not stop callbacks or undo effects).",
    "Quickshell.processId",
    "Object.getOwnPropertyNames(shell)",
    "Object.getOwnPropertyNames(shell.pluginRegistry.installedPlugins)",
    "shell.panelLoaders[\"br.otodo\"].item // if loaded",
    "$.host = shell; $.host === shell",
    "Qt.callLater(function() { print(\"event loop resumed\", Quickshell.processId) })",
    "$.timer = Qt.createQmlObject('import QtQuick; Timer { interval: 1000; repeat: true }', root); $.timer.triggered.connect(function() { print(Date.now()) }); $.timer.start()",
    "$.timer.stop(); $.timer.destroy(); delete $.timer",
    "$.file = Qt.createQmlObject('import Quickshell.Io; FileView { path: \"/proc/self/status\"; blockLoading: true }', root); print($.file.text()); $.file.destroy(); delete $.file",
    "List native threads from a terminal: /usr/bin/ps -T -p <PID shown above> -o pid,tid,comm. Asynchronous plugin loading is not a private execution thread. FileView can use I/O helper threads, so /proc/thread-self read through it is not a reliable JavaScript-thread probe.",
    "Import further installed QML modules using Qt.createQmlObject / Qt.createComponent. Quickshell.Io provides FileView and Process. Process launches a child process, not a JS worker; WorkerScript uses a separate JS context and cannot directly share shell QObjects.",
    "This is Qt JavaScript, not a browser or Node: no DOM, require(), or top-level await. Use Promise.then() / QML signals. Qt exposes QML-visible native APIs, not arbitrary C++ memory.",
    "Open: omarchy-shell shell summon br.console '{}'. Pre-fill without executing: pass {\"code\":\"Quickshell.processId\"}. Explicit IPC execution: omarchy-shell shell call br.console evaluate 'Quickshell.processId'. It returns JSON with ok, id, result/error, elapsedMs, and pending for a Promise; async settlement appears in the transcript. Any local caller with shell IPC access can execute code while this plugin is enabled.",
    "Never paste untrusted code. Blocking loops stall the shell; timers and Escape cannot interrupt them. If necessary, recover externally with omarchy restart shell."
  ].join("\n\n")

  function open(payloadJson) {
    root.opened = true
    if (payloadJson) {
      try {
        var payload = JSON.parse(payloadJson)
        if (payload && typeof payload.code === "string") editor.text = payload.code
      } catch (error) {
        root.append("error", 0, root.describe(error))
      }
    }
    Qt.callLater(function() {
      if (root.opened) editor.forceActiveFocus()
    })
  }

  function close() { root.opened = false }

  function dismiss() {
    root.close()
    if (root.shell && typeof root.shell.hide === "function")
      root.shell.hide(root.manifest ? root.manifest.id : "br.console")
  }

  function clear() { transcript.clear() }

  function append(kind, runId, text) {
    var clipped = text.length > 16384 ? text.slice(0, 16384) + "\n[preview truncated]" : text
    if (transcript.count >= 200) transcript.remove(0)
    transcript.append({kind: kind, runId: runId, message: clipped})
    Qt.callLater(function() { output.positionViewAtEnd() })
  }

  function previewError(value) {
    var name = Object.getOwnPropertyDescriptor(value, "name")
      || Object.getOwnPropertyDescriptor(Object.getPrototypeOf(value), "name")
    var message = Object.getOwnPropertyDescriptor(value, "message")
    var stack = Object.getOwnPropertyDescriptor(value, "stack")
    var text = name && typeof name.value === "string" ? name.value : "Error"
    if (message)
      text += ": " + (typeof message.value === "string" ? message.value : "[uninspected message]")
    var trace = stack && typeof stack.value === "string" ? stack.value : ""
    // Qt supplies stack through an intrinsic getter. Never invoke a replacement.
    if (stack && stack.get && stack.get === root.nativeErrorStackGetter)
      trace = root.nativeErrorStackGetter.call(value)
    return text + (trace ? "\n" + trace : "")
  }

  // Avoid recursively traversing the host graph or invoking ordinary JS getters.
  function preview(value, depth, seen) {
    if (value === null) return "null"
    if (typeof value === "string") return depth ? JSON.stringify(value) : value
    if (typeof value === "function") return "[Function]"
    if (typeof value !== "object") return String(value)
    // Qt.isQtObject converts JS objects to QVariant, which can run their getters.
    if (value instanceof QtObject) return "[QObject]"
    if (value instanceof Error) return root.previewError(value)
    if (value instanceof Date) return "[Date]"
    if (value instanceof RegExp) return "[RegExp]"
    if (value instanceof Promise) return "[Promise]"
    if (seen.indexOf(value) !== -1) return "[Circular]"
    var array = Array.isArray(value)
    if (depth >= 2) return array ? "[Array]" : "[Object]"
    seen.push(value)
    // Qt's Object.keys() can evaluate accessors; getOwnPropertyNames() does not.
    var keys = array ? null : Object.getOwnPropertyNames(value)
    var parts = []
    var count = array ? value.length : keys.length
    for (var i = 0; i < Math.min(count, 30); i++) {
      var key = array ? String(i) : keys[i]
      var descriptor = Object.getOwnPropertyDescriptor(value, key)
      var item = !descriptor ? "<empty>" : "value" in descriptor
        ? root.preview(descriptor.value, depth + 1, seen) : "[Getter/Setter]"
      parts.push((array ? "" : JSON.stringify(key) + ": ") + item)
    }
    if (count > 30) parts.push("... " + (count - 30) + " more")
    seen.pop()
    return (array ? "[" : "{") + parts.join(", ") + (array ? "]" : "}")
  }

  function describe(value) {
    try { return root.preview(value, 0, []) }
    catch (error) { return "[unprintable value]" }
  }

  function consoleFor(runId) {
    function logger(kind) {
      return function() {
        var parts = []
        for (var i = 0; i < arguments.length; i++) parts.push(root.describe(arguments[i]))
        root.append(kind, runId, parts.join(" "))
      }
    }
    return {log: logger("log"), info: logger("info"), debug: logger("debug"),
      warn: logger("warn"), error: logger("error"), dir: logger("log"), clear: root.clear}
  }

  function execute(source, console) {
    var $ = root.scratch
    var $_ = root.lastResult
    var print = console.log
    // Direct eval preserves QML imports, ids, and the real host reference.
    // Never retry as an expression/function: a thrown script may already have effects.
    return eval(source)
  }

  // Also callable through: omarchy-shell shell call br.console evaluate '<javascript>'
  // IPC returns a JSON envelope with a preview, never serializes the live QObject graph.
  function evaluate(source) {
    source = String(source)
    var runId = ++root.sequence
    root.append("input", runId, source)
    if (!root.history.length || root.history[root.history.length - 1] !== source) {
      var entries = root.history.slice(-99)
      entries.push(source)
      root.history = entries
    }
    root.historyIndex = root.history.length
    var started = Date.now()
    var value
    try {
      value = root.execute(source, root.consoleFor(runId))
    } catch (error) {
      var failure = root.describe(error)
      root.append("error", runId, failure)
      return JSON.stringify({ok: false, id: runId, error: failure, elapsedMs: Date.now() - started})
    }
    root.lastResult = value
    var text = root.describe(value)
    var pending = value instanceof Promise
    root.append("result", runId, text)
    if (pending) {
      value.then(function(result) {
        root.append("resolved", runId, root.describe(result))
      }, function(error) {
        root.append("rejected", runId, root.describe(error))
      })
    }
    return JSON.stringify({ok: true, id: runId, result: text, pending: pending, elapsedMs: Date.now() - started})
  }

  function submit() {
    if (!editor.text.trim()) return
    root.evaluate(editor.text)
    editor.forceActiveFocus()
  }

  function recall(direction) {
    if (!root.history.length) return
    if (root.historyIndex === root.history.length) root.historyDraft = editor.text
    root.historyIndex = Math.max(0, Math.min(root.history.length, root.historyIndex + direction))
    editor.text = root.historyIndex === root.history.length ? root.historyDraft : root.history[root.historyIndex]
    editor.cursorPosition = editor.text.length
  }

  ListModel { id: transcript }

  component ActionButton: Button {
    foreground: Color.menu.text
    fontFamily: Style.font.menuFamily
    focusable: true
    Accessible.role: Accessible.Button
    Accessible.name: text
  }

  PanelWindow {
    id: panel
    visible: root.opened
    anchors { top: true; bottom: true; left: true; right: true }
    color: "transparent"
    exclusionMode: ExclusionMode.Ignore
    WlrLayershell.namespace: "br-console"
    WlrLayershell.layer: WlrLayer.Overlay
    WlrLayershell.keyboardFocus: WlrKeyboardFocus.Exclusive

    Rectangle { anchors.fill: parent; color: Color.menu.scrim }
    MouseArea { anchors.fill: parent; onClicked: root.dismiss() }

    BorderSurface {
      id: card
      anchors.centerIn: parent
      width: Math.min(Style.space(1100), panel.width - Style.gapsOut * 2)
      height: Math.min(Style.space(800), panel.height - Style.gapsOut * 2)
      color: Color.menu.background
      borderSpec: Border.surfaceSpec("menu", "border", Color.menu.border, Math.max(1, Style.space(2)))
      radius: Style.cornerRadius
      MouseArea { anchors.fill: parent; onClicked: function(mouse) { mouse.accepted = true } }

      ColumnLayout {
        anchors.fill: parent
        anchors.margins: Style.spacing.panelPadding
        spacing: Style.space(10)
        Keys.onPressed: function(event) {
          if (event.key === Qt.Key_Escape) root.dismiss()
          else if ((event.modifiers & Qt.ControlModifier) && event.key === Qt.Key_L) root.clear()
          else return
          event.accepted = true
        }

        RowLayout {
          Layout.fillWidth: true
          Text {
            Layout.fillWidth: true
            text: "JavaScript Console  /  PID " + Quickshell.processId
            color: Color.menu.text
            font.family: Style.font.menuFamily
            font.pixelSize: Style.font.heading
            elide: Text.ElideRight
          }
          ActionButton { text: "Help"; onClicked: root.append("help", 0, root.helpText) }
          ActionButton { text: "Clear"; onClicked: root.clear() }
          ActionButton { text: "Close"; onClicked: root.dismiss() }
        }

        Text {
          Layout.fillWidth: true
          text: "UNSANDBOXED / main thread / same user privileges as the shell. Blocking code freezes the shell; no in-console interrupt."
          color: Color.urgent
          font.family: Style.font.menuFamily
          font.pixelSize: Style.font.bodySmall
          wrapMode: Text.Wrap
        }

        ListView {
          id: output
          objectName: "consoleOutput"
          Layout.fillWidth: true
          Layout.fillHeight: true
          clip: true
          spacing: Style.space(8)
          model: transcript
          boundsBehavior: Flickable.StopAtBounds
          Controls.ScrollBar.vertical: Controls.ScrollBar {}
          delegate: Column {
            required property string kind
            required property int runId
            required property string message
            width: output.width - Style.space(16)
            Text {
              text: (runId ? "#" + runId + " " : "") + kind
              color: kind === "error" || kind === "rejected" ? Color.urgent : Color.accent
              font.family: Style.font.family
              font.pixelSize: Style.font.caption
            }
            TextEdit {
              width: parent.width
              height: contentHeight
              text: message
              readOnly: true
              selectByMouse: true
              textFormat: TextEdit.PlainText
              wrapMode: TextEdit.WrapAnywhere
              color: Color.menu.text
              selectionColor: Color.accent
              selectedTextColor: Color.menu.background
              font.family: Style.font.family
              font.pixelSize: Style.font.body
              Accessible.name: kind + " " + runId
            }
          }
          Text {
            anchors.fill: parent
            visible: transcript.count === 0
            text: "Quickshell.processId\nObject.getOwnPropertyNames(shell)\n$.value = 42\n\n$ keeps scratch state; $_ holds the last result.\nHelp contains host access and timer examples."
            color: Color.menu.text
            opacity: 0.6
            font.family: Style.font.family
            font.pixelSize: Style.font.body
            wrapMode: Text.Wrap
          }
        }

        Rectangle {
          Layout.fillWidth: true
          Layout.preferredHeight: Math.min(Style.space(200), card.height * 0.3)
          color: "transparent"
          border.color: editor.activeFocus ? Color.accent : Color.menu.border
          radius: Style.cornerRadius
          Flickable {
            id: inputScroll
            anchors.fill: parent
            anchors.margins: Style.space(10)
            clip: true
            contentWidth: width
            contentHeight: Math.max(height, editor.contentHeight)
            boundsBehavior: Flickable.StopAtBounds
            Controls.ScrollBar.vertical: Controls.ScrollBar {}
            TextEdit {
              id: editor
              objectName: "consoleInput"
              width: inputScroll.width - Style.space(12)
              height: Math.max(inputScroll.height, contentHeight)
              textFormat: TextEdit.PlainText
              wrapMode: TextEdit.WrapAnywhere
              selectByMouse: true
              color: Color.menu.text
              selectionColor: Color.accent
              selectedTextColor: Color.menu.background
              font.family: Style.font.family
              font.pixelSize: Style.font.body
              Accessible.name: "JavaScript input"
              onCursorRectangleChanged: {
                if (cursorRectangle.y < inputScroll.contentY) inputScroll.contentY = cursorRectangle.y
                else if (cursorRectangle.y + cursorRectangle.height > inputScroll.contentY + inputScroll.height)
                  inputScroll.contentY = cursorRectangle.y + cursorRectangle.height - inputScroll.height
              }
              Keys.onPressed: function(event) {
                if (!(event.modifiers & Qt.ControlModifier)) return
                if (event.key === Qt.Key_Return || event.key === Qt.Key_Enter) {
                  if (!event.isAutoRepeat) root.submit()
                } else if (event.key === Qt.Key_Up) root.recall(-1)
                else if (event.key === Qt.Key_Down) root.recall(1)
                else return
                event.accepted = true
              }
            }
          }
        }

        RowLayout {
          Layout.fillWidth: true
          Text {
            Layout.fillWidth: true
            text: "Ctrl+Enter run  /  Enter newline  /  Ctrl+Up/Down history  /  Esc close"
            color: Color.menu.text
            font.family: Style.font.menuFamily
            font.pixelSize: Style.font.bodySmall
            wrapMode: Text.Wrap
          }
          ActionButton { objectName: "consoleRun"; text: "Run"; onClicked: root.submit() }
        }
      }
    }
  }
}
