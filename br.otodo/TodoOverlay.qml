import Quickshell
import Quickshell.Io
import Quickshell.Wayland
import QtQuick
import Qt.labs.folderlistmodel
import qs.Commons
import qs.Ui
import "TodoModel.js" as TodoModel

Item {
  id: root

  property string omarchyPath: Quickshell.env("OMARCHY_PATH")
  property var shell: null
  property var manifest: null

  property bool opened: false
  property string stage: "text"
  property string errorText: ""
  property var submittedInput: null
  property string submittedLine: ""
  property string submittedKind: ""
  property string submittedParentId: ""
  property var submittedAttachments: []
  property var attachmentSelections: []
  property string attachmentError: ""
  property string attachmentReturnStage: "text"
  property url attachmentFolder: TodoModel.localFileUrl(Quickshell.env("HOME") || "/")
  property bool mutationPending: false
  property bool mutationUncertain: false
  property int mutationSession: 0
  property bool mutationStarted: false
  property int sessionGeneration: 0
  property int requestGeneration: 0
  property var activeRead: null
  property var pendingRead: null
  property string capabilitiesState: "unknown"
  property string capabilitiesError: ""
  property var executableFeatures: []
  readonly property bool supportsAttachments: capabilitiesState === "ready" && executableFeatures.indexOf("attachments") >= 0
  readonly property bool supportsSubtasks: capabilitiesState === "ready" && executableFeatures.indexOf("subtasks") >= 0
  readonly property bool supportsTaskCandidates: capabilitiesState === "ready" && executableFeatures.indexOf("task_candidates") >= 0
  property string parentId: ""
  property var selectedParent: null
  property bool invalidParentIntent: false
  property string parentError: ""
  property string pickerError: ""
  property string pickerReturnStage: "text"
  property var parentCandidates: []
  property bool candidatesHaveMore: false
  property bool candidatesLoading: false
  property int parentIndex: -1
  property string searchQuery: ""
  readonly property bool parentReady: !invalidParentIntent && (!parentId || selectedParent !== null)
  readonly property string parentSummary: invalidParentIntent ? "Invalid launch parent — choose a parent or None."
    : selectedParent ? selectedParent.name + "\n" + selectedParent.id + " · " + selectedParent.state
    : parentId ? parentId + " · " + (parentError ? "Unresolved" : "Resolving…")
    : "None — create a root task"
  property string defaultDueDate: ""
  property var parsedInput: null
  property var catalog: ({projects: [], tags: [], states: [], default_state: ""})
  property string catalogError: ""
  property bool catalogPending: false
  property int catalogSession: 0
  property bool catalogReloadQueued: false
  property var completions: []
  property int completionIndex: 0
  property var historyEntries: []
  property int historyIndex: -1
  property string historyDraft: ""
  property int historyCursor: 0
  property var queuedDrafts: []
  property int savedCount: 0
  property string feedbackText: ""
  property var resultTasks: []
  property bool showResults: false
  property bool showHelp: false

  property string fontFamily: Style.font.menuFamily
  property color background: Color.menu.background
  property color foreground: Color.menu.text
  property color border: Color.menu.border
  property color scrim: Color.menu.scrim
  readonly property color accent: Color.accent
  readonly property var borderSpec: Border.surfaceSpec("menu", "border", border, Math.max(1, Style.space(2)))
  readonly property int cornerRadius: Style.cornerRadius
  readonly property int contentMargin: Style.spacing.panelPadding
  readonly property string pluginDir: manifest && manifest.__sourceDir ? String(manifest.__sourceDir) : ""
  readonly property string helperPath: pluginDir ? pluginDir + "/bin/otodo-create" : ""
  readonly property int cardWidth: Math.min(Style.space(760), panel.width - Style.gapsOut * 2)
  readonly property int desiredCardHeight: root.stage === "text"
    ? Math.max(Style.space(170), textPane.height + root.contentMargin * 2)
    : Style.space(640)
  readonly property int cardHeight: Math.min(desiredCardHeight, panel.height - Style.gapsOut * 2)

  function focusStage() {
    var session = root.sessionGeneration
    var expectedStage = root.stage
    Qt.callLater(function() {
      if (!root.opened || root.sessionGeneration !== session || root.stage !== expectedStage) return
      if (expectedStage === "text") {
        taskField.cursorPosition = taskField.text.length
        taskField.forceActiveFocus()
      } else if (expectedStage === "parent") {
        parentSearch.forceActiveFocus()
      } else if (expectedStage === "attachments") {
        attachmentFolderField.forceActiveFocus()
      }
    })
  }

  function invalidateReads() {
    root.requestGeneration++
    root.pendingRead = null
    parentSearchTimer.stop()
    if (readProcess.running) readProcess.running = false
  }

  function open(payloadJson) {
    if (root.mutationPending) return
    root.sessionGeneration++
    root.invalidateReads()
    root.capabilitiesState = "unknown"
    root.capabilitiesError = ""
    root.executableFeatures = []
    root.attachmentSelections = []
    root.submittedAttachments = []
    root.attachmentError = ""
    root.attachmentReturnStage = "text"
    root.parentId = ""
    root.selectedParent = null
    root.invalidParentIntent = false
    root.parentError = ""
    root.pickerError = ""
    root.parentCandidates = []
    root.candidatesHaveMore = false
    root.candidatesLoading = false
    root.parentIndex = -1
    root.searchQuery = ""
    root.pickerReturnStage = "text"
    root.submittedParentId = ""
    root.mutationUncertain = false
    root.defaultDueDate = ""
    root.parsedInput = null
    root.historyEntries = []
    root.historyIndex = -1
    root.queuedDrafts = []
    root.savedCount = 0
    root.feedbackText = ""
    root.resultTasks = []
    root.showResults = false
    root.showHelp = false
    root.catalog = {projects: [], tags: [], states: [], default_state: ""}
    var payload
    var launchError = ""
    try {
      payload = TodoModel.parseLaunchPayload(payloadJson || "{}")
    } catch (error) {
      // Preserve text/date where possible, but never discard a rejected parent intent.
      payload = {text: "", dueDate: "", parentId: ""}
      try {
        var raw = JSON.parse(payloadJson)
        if (raw && typeof raw === "object" && !Array.isArray(raw)) {
          if (typeof raw.text === "string") payload.text = raw.text
          if (typeof raw.dueDate === "string") payload.dueDate = raw.dueDate
        }
      } catch (ignored) {}
      root.invalidParentIntent = true
      launchError = String(error.message || error)
    }
    root.defaultDueDate = payload.dueDate
    root.parentId = payload.parentId
    root.stage = "text"
    root.opened = true
    contentScroll.contentY = 0
    taskField.text = payload.text
    root.updateInput(taskField.text)
    root.errorText = ""
    root.parentError = launchError
    root.focusStage()
    root.requestParentRead(root.parentId ? "lookup" : "discover", root.parentId)
    root.reloadCatalog()
  }

  function close() {
    if (root.mutationPending) return
    root.opened = false
    root.sessionGeneration++
    root.invalidateReads()
  }

  function dismiss() {
    if (root.mutationPending) return
    root.close()
    if (root.shell && typeof root.shell.hide === "function")
      root.shell.hide((root.manifest && root.manifest.id) || "br.otodo")
  }

  function toggle() {
    if (root.opened) root.dismiss()
    else root.open("{}")
  }

  function reveal(item) {
    var y = item.mapToItem(contentScroll.contentItem, 0, 0).y
    if (y < contentScroll.contentY) contentScroll.contentY = Math.max(0, y)
    else if (y + item.height > contentScroll.contentY + contentScroll.height)
      contentScroll.contentY = Math.max(0, Math.min(y + item.height - contentScroll.height,
        contentScroll.contentHeight - contentScroll.height))
  }

  function openParentPicker() {
    if (root.mutationPending || root.stage !== "text") return
    root.pickerReturnStage = root.stage
    root.stage = "parent"
    contentScroll.contentY = 0
    root.searchQuery = ""
    parentSearch.text = ""
    root.parentCandidates = []
    root.parentIndex = -1
    root.candidatesHaveMore = false
    root.focusStage()
    root.requestParentRead("search", "")
  }

  function openAttachmentPicker() {
    if (!root.supportsAttachments || root.mutationPending || root.mutationUncertain
        || (root.stage !== "text" && root.stage !== "parent")) return
    root.attachmentReturnStage = root.stage
    root.stage = "attachments"
    contentScroll.contentY = 0
    root.attachmentError = ""
    root.focusStage()
  }

  function leaveAttachmentPicker() {
    root.stage = root.attachmentReturnStage
    contentScroll.contentY = 0
    root.focusStage()
    // A debounced parent search can expire while the file browser is open.
    if (root.stage === "parent") root.requestParentRead("search", root.searchQuery)
  }

  function addAttachmentUrls(urls) {
    if (!root.opened || !root.supportsAttachments || root.mutationPending || root.mutationUncertain) return false
    var additions = root.attachmentSelections.slice()
    try {
      // Validate the whole drop before changing the selection.
      for (var index = 0; index < urls.length; index++) {
        var item = TodoModel.attachmentSelection(urls[index])
        if (!additions.some(function(existing) { return existing.path === item.path })) additions.push(item)
      }
    } catch (error) {
      root.attachmentError = String(error.message || error)
      return false
    }
    root.attachmentSelections = additions
    root.attachmentError = ""
    return true
  }

  function chooseAttachment(index) {
    if (attachmentFiles.isFolder(index)) {
      root.attachmentFolder = attachmentFiles.get(index, "fileUrl")
      attachmentList.currentIndex = -1
      return
    }
    try {
      var item = TodoModel.attachmentSelection(attachmentFiles.get(index, "fileUrl"),
        Number(attachmentFiles.get(index, "fileSize")))
      if (!root.attachmentSelections.some(function(existing) { return existing.path === item.path }))
        root.attachmentSelections = root.attachmentSelections.concat([item])
      root.attachmentError = ""
    } catch (error) { root.attachmentError = String(error.message || error) }
  }

  function removeAttachment(index) {
    if (root.mutationPending || root.mutationUncertain) return
    var selections = root.attachmentSelections.slice()
    selections.splice(index, 1)
    root.attachmentSelections = selections
    root.attachmentError = ""
  }

  function browseAttachmentFolder(value) {
    try {
      root.attachmentFolder = TodoModel.localFileUrl(value)
      root.attachmentError = ""
    } catch (error) { root.attachmentError = String(error.message || error) }
  }

  function leaveParentPicker() {
    root.requestGeneration++
    root.pendingRead = null
    parentSearchTimer.stop()
    root.candidatesLoading = false
    root.stage = root.pickerReturnStage
    contentScroll.contentY = 0
    root.focusStage()
    // A cancelled picker must not abandon an unresolved launch intent.
    if (root.parentId && !root.selectedParent && !root.parentError)
      root.requestParentRead("lookup", root.parentId)
  }

  function chooseParent(task) {
    root.parentId = task ? task.id : ""
    root.selectedParent = task
    root.invalidParentIntent = false
    root.parentError = ""
    root.leaveParentPicker()
  }

  function moveParentCursor(delta) {
    root.parentIndex = Math.max(-1, Math.min(root.parentCandidates.length - 1, root.parentIndex + delta))
    parentList.currentIndex = root.parentIndex
    if (root.parentIndex >= 0) parentList.positionViewAtIndex(root.parentIndex, ListView.Contain)
  }

  function chooseHighlightedParent() {
    if (root.parentIndex < 0) root.chooseParent(null)
    else if (!root.candidatesLoading && root.parentIndex < root.parentCandidates.length)
      root.chooseParent(root.parentCandidates[root.parentIndex])
  }

  function searchParents(value) {
    root.searchQuery = value
    if (!root.opened || root.stage !== "parent") return
    root.requestGeneration++
    root.pendingRead = null
    root.parentCandidates = []
    root.parentIndex = -1
    root.candidatesHaveMore = false
    root.pickerError = ""
    root.candidatesLoading = true
    parentSearchTimer.restart()
  }

  function requestParentRead(kind, value) {
    if (!root.opened) return
    root.requestGeneration++
    root.pendingRead = {kind: kind, value: value, session: root.sessionGeneration,
      generation: root.requestGeneration}
    if (kind === "search") {
      root.pickerError = ""
      root.candidatesLoading = true
    } else if (kind !== "discover") root.parentError = ""
    root.pumpReads()
  }

  function readFailure(request, message) {
    if (!root.opened || request.session !== root.sessionGeneration
        || request.generation !== root.requestGeneration) return
    if (request.kind === "search") {
      root.pickerError = message
      root.candidatesLoading = false
    } else if (request.kind !== "discover") root.parentError = message
  }

  function pumpReads() {
    if (root.activeRead || readProcess.running || !root.pendingRead || !root.opened) return
    var request = root.pendingRead
    if (!root.helperPath) {
      root.pendingRead = null
      root.readFailure(request, "The todo helper is unavailable: plugin source directory is missing.")
      return
    }
    if (root.capabilitiesState === "failed") {
      root.pendingRead = null
      root.readFailure(request, root.capabilitiesError)
      return
    }
    if (root.capabilitiesState !== "ready") {
      root.activeRead = {kind: "capabilities", session: root.sessionGeneration,
        generation: request.generation}
      readProcess.command = [root.helperPath, "--capabilities"]
    } else {
      root.pendingRead = null
      if (request.kind === "discover") return
      if (!root.supportsSubtasks || (request.kind === "search" && !root.supportsTaskCandidates)) {
        root.readFailure(request, "This otodo does not support this parent lookup. Update otodo, or explicitly choose None.")
        return
      }
      root.activeRead = request
      readProcess.command = [root.helperPath, request.kind === "search" ? "--parents" : "--parent", request.value]
    }
    readProcess.running = true
    readStartTimer.restart()
  }

  function finishRead(exitCode, startFailure) {
    var request = root.activeRead
    if (!request) return
    readStartTimer.stop()
    root.activeRead = null
    if (root.opened && request.session === root.sessionGeneration) {
      var detail = startFailure || (exitCode !== 0
        ? TodoModel.decodeError(readStderr.text) || "Parent lookup failed." : "")
      if (request.kind === "capabilities") {
        try {
          if (detail) throw new Error(detail)
          var capabilities = TodoModel.decodeCapabilities(readStdout.text)
          root.executableFeatures = capabilities.features
          root.capabilitiesState = "ready"
        } catch (error) {
          root.capabilitiesState = "failed"
          root.capabilitiesError = String(error.message || error)
        }
      } else if (request.generation === root.requestGeneration) {
        try {
          if (detail) throw new Error(detail)
          if (request.kind === "search") {
            var result = TodoModel.decodeCandidates(readStdout.text)
            if (result.tasks.length > 25) throw new Error("Parent lookup returned more than 25 candidates.")
            root.parentCandidates = result.tasks
            root.candidatesHaveMore = result.has_more
            root.candidatesLoading = false
          } else {
            var task = TodoModel.decodeTask(readStdout.text)
            if (task.id !== request.value) throw new Error("Parent lookup returned a different task ID.")
            root.selectedParent = {id: task.id, name: task.name, state: task.state}
            root.parentError = ""
          }
        } catch (error) {
          root.readFailure(request, String(error.message || error))
        }
      }
    }
    Qt.callLater(root.pumpReads)
  }

  function retryParentRead() {
    root.capabilitiesState = "unknown"
    root.capabilitiesError = ""
    root.requestParentRead("search", root.searchQuery)
  }

  Timer {
    id: parentSearchTimer
    interval: 200
    onTriggered: {
      if (root.opened && root.stage === "parent")
        root.requestParentRead("search", root.searchQuery)
    }
  }

  Timer {
    id: readStartTimer
    interval: 1000
    onTriggered: {
      if (root.activeRead && !readProcess.running)
        root.finishRead(-1, "Could not start the todo helper. Check that it exists and is executable.")
    }
  }

  Process {
    id: readProcess
    command: []
    stdout: StdioCollector { id: readStdout; waitForEnd: true }
    stderr: StdioCollector { id: readStderr; waitForEnd: true }
    onStarted: readStartTimer.stop()
    onExited: function(exitCode) { root.finishRead(exitCode, "") }
    onRunningChanged: {
      if (!running) {
        var request = root.activeRead
        Qt.callLater(function() {
          if (request && root.activeRead === request && !readProcess.running)
            root.finishRead(-1, "The todo helper stopped without a result. Check that it exists and is executable.")
        })
      }
    }
  }

  function updateCompletions() {
    root.completions = TodoModel.completeInput(taskField.text, taskField.cursorPosition, root.catalog)
    root.completionIndex = 0
  }

  function updateInput(value) {
    root.parsedInput = null
    if (value.trim()) {
      try { root.parsedInput = TodoModel.parseInput(value, new Date(), root.defaultDueDate) }
      catch (ignored) {} // Incomplete input remains editable; Enter reports the error.
    }
    if (!root.mutationUncertain) root.errorText = ""
    root.updateCompletions()
  }

  function inputSummary() {
    var input = root.parsedInput
    if (!input || input.kind !== "task") return ""
    var parts = input.projects.map(function(value) { return "#" + value })
      .concat(input.tags.map(function(value) { return "@" + value }))
    if (input.state || root.catalog.default_state) parts.push("!" + (input.state || root.catalog.default_state))
    if (input.dueDate) parts.push(input.dueDate + (input.dueTime ? " " + input.dueTime : ""))
    else parts.push("No due date")
    if (input.url) parts.push(input.url)
    return input.name + "  ·  " + parts.join("  ")
  }

  function reloadCatalog() {
    if (!root.opened || !root.helperPath) return
    if (root.catalogPending) {
      root.catalogReloadQueued = true
      return
    }
    root.catalogPending = true
    root.catalogSession = root.sessionGeneration
    root.catalogError = ""
    catalogProcess.command = [root.helperPath, "--catalog"]
    catalogProcess.running = true
    catalogStartTimer.restart()
  }

  function finishCatalog(exitCode, failure) {
    if (!root.catalogPending) return
    root.catalogPending = false
    catalogStartTimer.stop()
    if (root.opened && root.catalogSession === root.sessionGeneration) {
      try {
        if (failure || exitCode !== 0)
          throw new Error(failure || TodoModel.decodeError(catalogStderr.text))
        root.catalog = TodoModel.decodeCatalog(catalogStdout.text)
      } catch (error) { root.catalogError = String(error.message || error) }
      root.updateCompletions()
    }
    if (root.catalogReloadQueued) {
      root.catalogReloadQueued = false
      Qt.callLater(root.reloadCatalog)
    }
  }

  Timer {
    id: catalogStartTimer
    interval: 1000
    onTriggered: if (root.catalogPending && !catalogProcess.running)
      root.finishCatalog(-1, "Could not load suggestions. Check the todo helper, then press F5.")
  }

  Process {
    id: catalogProcess
    command: []
    stdout: StdioCollector { id: catalogStdout; waitForEnd: true }
    stderr: StdioCollector { id: catalogStderr; waitForEnd: true }
    onStarted: catalogStartTimer.stop()
    onExited: function(exitCode) { root.finishCatalog(exitCode, "") }
    onRunningChanged: if (!running) Qt.callLater(function() {
      if (root.catalogPending && !catalogProcess.running)
        root.finishCatalog(-1, "Suggestion lookup stopped without a result. Press F5 to reload.")
    })
  }

  function acceptCompletion(index) {
    if (root.mutationPending || index < 0 || index >= root.completions.length) return
    var completion = root.completions[index]
    var suffix = taskField.text.slice(completion.end)
    var replacement = completion.value + (suffix && /^\s/.test(suffix) ? "" : " ")
    taskField.text = taskField.text.slice(0, completion.start) + replacement + suffix
    taskField.cursorPosition = completion.start + replacement.length
    taskField.forceActiveFocus()
  }

  function moveHistory(delta) {
    if (!root.historyEntries.length) return
    if (root.historyIndex < 0) {
      if (delta > 0) return
      root.historyDraft = taskField.text
      root.historyCursor = taskField.cursorPosition
      root.historyIndex = root.historyEntries.length
    }
    var next = Math.max(0, Math.min(root.historyEntries.length, root.historyIndex + delta))
    if (next === root.historyEntries.length) {
      root.historyIndex = -1
      taskField.text = root.historyDraft
      taskField.cursorPosition = root.historyCursor
    } else {
      root.historyIndex = next
      taskField.text = root.historyEntries[next]
      taskField.cursorPosition = taskField.text.length
    }
  }

  function pasteInput() {
    pasteBuffer.clear()
    pasteBuffer.paste()
    var value = pasteBuffer.text.replace(/\r\n?/g, "\n").replace(/\t/g, " ")
    if (!value) return
    var start = taskField.selectionStart
    var end = taskField.selectionEnd
    var combined = taskField.text.slice(0, start) + value + taskField.text.slice(end)
    if (/[\x00-\x09\x0b-\x1f\x7f-\x9f\u2028\u2029]/.test(value)
        || unescape(encodeURIComponent(combined)).length > 16384) {
      root.errorText = "Paste must be at most 16 KiB including the draft, without control characters."
      return
    }
    var lines = combined.split("\n").filter(function(line) { return line.trim() !== "" })
    if (!lines.length) return
    taskField.text = lines.shift()
    taskField.cursorPosition = value.indexOf("\n") >= 0 ? taskField.text.length : start + value.length
    root.queuedDrafts = root.queuedDrafts.concat(lines)
  }

  function finishLine() {
    var line = root.submittedLine.trim()
    if (line && root.historyEntries[root.historyEntries.length - 1] !== line)
      root.historyEntries = root.historyEntries.concat([line]).slice(-100)
    root.historyIndex = -1
    var drafts = root.queuedDrafts.slice()
    taskField.text = drafts.length ? drafts.shift() : ""
    root.queuedDrafts = drafts
    root.focusStage()
  }

  function submitLine() {
    if (!root.opened || root.stage !== "text" || root.mutationPending || root.mutationUncertain) return
    if (!taskField.text.trim()) {
      root.submittedLine = ""
      root.finishLine()
      return
    }
    root.historyIndex = -1
    var input
    try { input = TodoModel.parseInput(taskField.text, new Date(), root.defaultDueDate) }
    catch (error) {
      root.errorText = String(error.message || error)
      return
    }
    root.submittedLine = taskField.text
    root.submittedKind = input.kind
    if (["help", "clear", "quit", "parent", "attach"].indexOf(input.kind) >= 0) {
      if (input.kind === "quit") { root.dismiss(); return }
      if (input.kind === "attach" && !root.supportsAttachments) {
        root.errorText = "Attachment support is unavailable. Check the installed otodo CLI."
        return
      }
      root.showHelp = input.kind === "help"
      if (input.kind === "clear") {
        root.resultTasks = []
        root.showResults = false
        root.feedbackText = ""
      }
      root.finishLine()
      if (input.kind === "parent") root.openParentPicker()
      else if (input.kind === "attach") root.openAttachmentPicker()
      return
    }
    if (!root.helperPath) {
      root.errorText = "The todo helper is unavailable: plugin source directory is missing."
      return
    }
    var command
    if (input.kind === "task") {
      if (!root.parentReady) {
        root.errorText = "Resolve the requested parent, choose another parent, or explicitly choose None before adding."
        return
      }
      if (root.attachmentSelections.length && !root.supportsAttachments) {
        root.errorText = "This otodo does not support attachments. Update otodo or remove the selections."
        return
      }
      root.submittedInput = input
      root.submittedParentId = root.parentId
      root.submittedAttachments = root.attachmentSelections.slice()
      command = [root.helperPath, "--add", input.name, input.dueDate]
      if (input.dueTime) command.push("--due-time", input.dueTime)
      if (input.state) command.push("--state", input.state)
      if (input.url) command.push("--url", input.url)
      input.projects.forEach(function(value) { command.push("--project", value) })
      input.tags.forEach(function(value) { command.push("--tag", value) })
      if (root.submittedParentId) command.push("--parent", root.submittedParentId)
      root.submittedAttachments.forEach(function(item) { command.push("--attach", item.path) })
    } else command = [root.helperPath, "--input", input.line]
    root.mutationSession = root.sessionGeneration
    root.mutationPending = true
    root.mutationStarted = false
    root.errorText = ""
    createProcess.command = command
    createProcess.running = true
    createStartTimer.restart()
  }

  function mutationFailure(message, uncertain) {
    root.mutationPending = false
    createStartTimer.stop()
    if (!root.opened || root.mutationSession !== root.sessionGeneration) return
    if (root.submittedKind === "sync") {
      // The one-shot CLI stops on every sync failure; never replay that line here.
      root.mutationUncertain = true
      root.resultTasks = []
      root.showResults = false
      root.errorText = "Sync stopped. This session is paused because a failed sync can leave commits or remote changes. "
        + "Inspect the repository, then close and reopen the prompt before continuing. " + message
    } else {
      root.mutationUncertain = root.submittedKind === "task" && uncertain
      root.errorText = root.mutationUncertain
        ? "Creation could not be confirmed. The task may already exist; check the store before adding again. "
          + "Submitted: " + root.submittedLine + " · parent " + (root.submittedParentId || "None")
          + " · " + root.submittedAttachments.length + " attachment(s). " + message
        : message
    }
    root.focusStage()
  }

  function finishSubmission(stdout) {
    if (root.submittedKind === "task") {
      var task = TodoModel.decodeTask(stdout)
      var input = root.submittedInput
      if ((task.parent || "") !== root.submittedParentId || task.name !== input.name
          || (task.due_date || "") !== input.dueDate || (task.due_time || "") !== input.dueTime
          || (input.state && task.state !== input.state) || (task.url || "") !== input.url
          || JSON.stringify(task.projects.slice().sort()) !== JSON.stringify(input.projects.slice().sort())
          || JSON.stringify(task.tags.slice().sort()) !== JSON.stringify(input.tags.slice().sort()))
        throw new Error("The returned task does not match the submitted capture.")
      root.savedCount++
      root.resultTasks = []
      root.showResults = false
      root.feedbackText = "Saved " + task.name + "  ·  !" + task.state
        + (task.due_date ? "  ·  " + task.due_date + (task.due_time ? " " + task.due_time : "") : "")
      root.defaultDueDate = ""
      root.attachmentSelections = []
      root.parentId = ""
      root.selectedParent = null
      root.parentError = ""
      root.invalidParentIntent = false
      root.reloadCatalog()
    } else {
      var result = TodoModel.decodeInputResult(stdout, root.submittedKind)
      if (root.submittedKind === "list") {
        root.resultTasks = result.tasks
        root.showResults = true
        root.feedbackText = result.tasks.length + (result.tasks.length === 1 ? " task" : " tasks")
        resultList.positionViewAtBeginning()
      } else {
        root.feedbackText = "Sync complete"
        root.resultTasks = []
        root.showResults = false
        root.reloadCatalog()
      }
    }
    root.showHelp = false
    root.mutationPending = false
    root.finishLine()
  }

  Timer {
    id: createStartTimer
    interval: 1000
    onTriggered: {
      if (root.mutationPending && !createProcess.running && !root.mutationStarted)
        root.mutationFailure("Could not start the todo helper. Check that it exists and is executable.", false)
    }
  }

  Process {
    id: createProcess
    running: false
    command: []
    stdout: StdioCollector { id: createStdout; waitForEnd: true }
    stderr: StdioCollector { id: createStderr; waitForEnd: true }
    onStarted: {
      root.mutationStarted = true
      createStartTimer.stop()
    }
    onRunningChanged: {
      if (!running) {
        var session = root.mutationSession
        Qt.callLater(function() {
          if (root.mutationPending && root.mutationSession === session && !createProcess.running)
            root.mutationFailure("The todo helper stopped without a result.", root.mutationStarted)
        })
      }
    }
    onExited: function(exitCode, exitStatus) {
      if (!root.mutationPending) return
      createStartTimer.stop()
      if (exitCode !== 0 || exitStatus !== 0) {
        var failure = TodoModel.decodeMutationError(createStderr.text, exitCode)
        root.mutationFailure(failure.message,
          exitStatus !== 0 || String(createStdout.text || "") !== "" || !failure.safeToRetry)
        return
      }
      try {
        if (root.opened && root.mutationSession === root.sessionGeneration)
          root.finishSubmission(createStdout.text)
      } catch (error) {
        root.mutationFailure(String(error.message || error), true)
        return
      }
      root.mutationPending = false
    }
  }

  component ActionButton: Button {
    focusable: true
    foreground: root.foreground
    accent: root.accent
    fontFamily: root.fontFamily
    Accessible.role: Accessible.Button
    Accessible.name: text
    onActiveFocusChanged: if (activeFocus) root.reveal(this)
    Keys.onReturnPressed: function(event) { if (!event.isAutoRepeat) clicked() }
    Keys.onEnterPressed: function(event) { if (!event.isAutoRepeat) clicked() }
    Keys.onSpacePressed: function(event) { if (!event.isAutoRepeat) clicked() }
  }


  component AttachmentControl: Column {
    required property string actionName
    property bool allowBrowse: true
    visible: root.supportsAttachments || root.attachmentSelections.length > 0
    spacing: Style.space(5)
    ActionButton {
      objectName: parent.actionName
      visible: parent.allowBrowse
      enabled: root.supportsAttachments && !root.mutationPending && !root.mutationUncertain
      width: parent.width
      text: "Attach files…  (Ctrl+O)"
      Accessible.name: "Choose attachment files"
      bordered: true
      onClicked: root.openAttachmentPicker()
    }
    Repeater {
      model: root.attachmentSelections
      delegate: Row {
        required property var modelData
        required property int index
        width: parent.width
        spacing: Style.space(6)
        Text {
          width: parent.width - removeAttachmentButton.width - parent.spacing
          text: modelData.name + " · " + TodoModel.attachmentSizeLabel(modelData.size) + "\n" + modelData.path
          textFormat: Text.PlainText
          wrapMode: Text.WrapAnywhere
          color: root.foreground
          font.family: root.fontFamily
          font.pixelSize: Style.font.bodySmall
        }
        ActionButton {
          id: removeAttachmentButton
          objectName: "removeAttachment" + index
          text: "Remove"
          Accessible.name: "Remove attachment " + modelData.name
          enabled: !root.mutationPending && !root.mutationUncertain
          onClicked: root.removeAttachment(index)
        }
      }
    }
    Text {
      visible: root.attachmentSelections.length === 0
      width: parent.width
      text: "Drop local files here · Up to 20 MiB each"
      textFormat: Text.PlainText
      wrapMode: Text.Wrap
      color: Qt.darker(root.foreground, 1.5)
      font.family: root.fontFamily
      font.pixelSize: Style.font.bodySmall
    }
    Text {
      visible: root.attachmentError !== ""
      width: parent.width
      text: root.attachmentError
      textFormat: Text.PlainText
      wrapMode: Text.Wrap
      color: Color.urgent
      font.family: root.fontFamily
      font.pixelSize: Style.font.bodySmall
    }
  }

  FolderListModel {
    id: attachmentFiles
    folder: root.stage === "attachments" ? root.attachmentFolder : ""
    showDirsFirst: true
    showDotAndDotDot: false
    showHidden: true
    showOnlyReadable: true
    sortField: FolderListModel.Name
    sortCaseSensitive: false
  }

  PanelWindow {
    id: panel
    visible: root.opened
    anchors { top: true; bottom: true; left: true; right: true }
    color: "transparent"
    WlrLayershell.namespace: "br-otodo"
    WlrLayershell.layer: WlrLayer.Overlay
    WlrLayershell.keyboardFocus: WlrKeyboardFocus.Exclusive
    exclusionMode: ExclusionMode.Ignore

    Rectangle {
      anchors.fill: parent
      color: root.scrim
    }

    MouseArea {
      anchors.fill: parent
      onClicked: root.dismiss()
    }

    BorderSurface {
      id: card
      width: root.cardWidth
      height: root.cardHeight
      anchors.centerIn: parent
      color: root.background
      borderSpec: root.borderSpec
      radius: root.cornerRadius
      padding: root.contentMargin

      Behavior on height {
        NumberAnimation { duration: 140; easing.type: Easing.OutCubic }
      }

      MouseArea {
        anchors.fill: parent
        onClicked: function(mouse) { mouse.accepted = true }
      }

      DropArea {
        id: attachmentDropArea
        objectName: "attachmentDropArea"
        anchors.fill: parent
        enabled: root.supportsAttachments && !root.mutationPending && !root.mutationUncertain
        onEntered: function(drag) {
          drag.accepted = drag.hasUrls && drag.urls.length > 0
        }
        onDropped: function(drop) {
          if (drop.hasUrls && root.addAttachmentUrls(drop.urls)) drop.accept(Qt.CopyAction)
        }
      }

      Rectangle {
        anchors.fill: parent
        visible: attachmentDropArea.containsDrag
        color: "transparent"
        border.color: root.accent
        border.width: Style.space(3)
        radius: root.cornerRadius
      }

      Flickable {
        id: contentScroll
        objectName: "todoContentScroll"
        anchors.fill: parent
        anchors.margins: root.contentMargin
        clip: true
        contentWidth: width
        contentHeight: root.stage === "parent" ? parentPane.height
          : root.stage === "attachments" ? attachmentPane.height : textPane.height
        boundsBehavior: Flickable.StopAtBounds
        flickableDirection: Flickable.VerticalFlick
        Keys.onPressed: function(event) {
          if (root.mutationPending) return
          if (event.key === Qt.Key_P && (event.modifiers & Qt.ControlModifier)) {
            root.openParentPicker()
          } else if (event.key === Qt.Key_O && (event.modifiers & Qt.ControlModifier)) {
            root.openAttachmentPicker()
          } else if (event.key === Qt.Key_Escape) {
            if (root.stage === "attachments") root.leaveAttachmentPicker()
            else if (root.stage === "parent") root.leaveParentPicker()
            else root.dismiss()
          } else return
          event.accepted = true
        }

      TextEdit {
        id: pasteBuffer
        visible: false
        textFormat: TextEdit.PlainText
      }

      Column {
        id: textPane
        visible: root.stage === "text"
        width: contentScroll.width
        spacing: Style.space(10)

        Row {
          width: parent.width
          Text {
            width: parent.width - sessionLabel.implicitWidth
            text: "otodo"
            color: root.foreground
            font.family: root.fontFamily
            font.pixelSize: Style.font.body
            font.bold: true
          }
          Text {
            id: sessionLabel
            text: root.savedCount + " saved" + (root.queuedDrafts.length ? " · " + root.queuedDrafts.length + " queued" : "")
            color: Qt.darker(root.foreground, 1.5)
            font.family: root.fontFamily
            font.pixelSize: Style.font.bodySmall
          }
        }

        ListView {
          id: resultList
          objectName: "todoResults"
          visible: root.showResults && count > 0
          width: parent.width
          height: visible ? Math.min(contentHeight, Style.space(250)) : 0
          clip: true
          spacing: Style.space(6)
          model: root.resultTasks
          boundsBehavior: Flickable.StopAtBounds
          delegate: Column {
            required property var modelData
            width: resultList.width
            Text {
              width: parent.width
              text: modelData.name
              textFormat: Text.PlainText
              wrapMode: Text.Wrap
              color: root.foreground
              font.family: root.fontFamily
              font.pixelSize: Style.font.body
            }
            Text {
              width: parent.width
              text: "!" + modelData.state
                + (modelData.due_date ? " · " + modelData.due_date + (modelData.due_time ? " " + modelData.due_time : "") : "")
                + "  " + (modelData.projects || []).map(function(value) { return "#" + value }).join(" ")
                + "  " + (modelData.tags || []).map(function(value) { return "@" + value }).join(" ")
              textFormat: Text.PlainText
              wrapMode: Text.Wrap
              color: Qt.darker(root.foreground, 1.5)
              font.family: root.fontFamily
              font.pixelSize: Style.font.bodySmall
            }
          }
        }

        Row {
          width: parent.width
          spacing: Style.space(8)
          Text {
            id: prompt
            anchors.verticalCenter: parent.verticalCenter
            text: "›"
            color: root.accent
            font.family: root.fontFamily
            font.pixelSize: Style.font.heading
          }
          TextField {
            id: taskField
            objectName: "todoInput"
            Accessible.name: "Todo or slash command"
            width: parent.width - prompt.width - parent.spacing
            foreground: root.foreground
            accent: root.accent
            font.family: root.fontFamily
            placeholderText: "Call plumber tom 9am #personal @chores !open"
            maximumLength: 16384
            readOnly: root.mutationPending || root.mutationUncertain
            onTextChanged: root.updateInput(text)
            onCursorPositionChanged: root.updateCompletions()
            onActiveFocusChanged: if (activeFocus) root.reveal(this)
            Keys.onPressed: function(event) {
              if (root.mutationPending) { event.accepted = true; return }
              var control = event.modifiers & Qt.ControlModifier
              if (event.key === Qt.Key_Escape || (control && event.key === Qt.Key_C)) {
                root.dismiss()
              } else if (root.mutationUncertain) return
              else if (event.key === Qt.Key_Return || event.key === Qt.Key_Enter) {
                if (!event.isAutoRepeat) root.submitLine()
              } else if (event.key === Qt.Key_Tab && !(event.modifiers & Qt.ShiftModifier)) {
                root.acceptCompletion(root.completionIndex)
              } else if (event.key === Qt.Key_Backtab || (event.key === Qt.Key_Tab && (event.modifiers & Qt.ShiftModifier))) {
                if (root.completions.length)
                  root.completionIndex = (root.completionIndex + 1) % root.completions.length
              } else if (event.key === Qt.Key_Up || event.key === Qt.Key_Down) {
                var delta = event.key === Qt.Key_Up ? -1 : 1
                if (root.historyIndex >= 0 || !root.completions.length) root.moveHistory(delta)
                else root.completionIndex = (root.completionIndex + delta + root.completions.length) % root.completions.length
              } else if (event.key === Qt.Key_F5) {
                root.reloadCatalog()
              } else if (control && event.key === Qt.Key_U) {
                text = ""
              } else if ((control && event.key === Qt.Key_V)
                  || (event.key === Qt.Key_Insert && (event.modifiers & Qt.ShiftModifier))) {
                root.pasteInput()
              } else if (control && event.key === Qt.Key_D && !text && !root.queuedDrafts.length) {
                root.dismiss()
              } else if (event.key === Qt.Key_PageDown || event.key === Qt.Key_PageUp) {
                resultList.contentY = Math.max(0, Math.min(resultList.contentHeight - resultList.height,
                  resultList.contentY + (event.key === Qt.Key_PageDown ? 1 : -1) * resultList.height))
              } else return
              event.accepted = true
            }
          }
        }

        ListView {
          id: completionList
          objectName: "todoCompletions"
          visible: root.completions.length > 0 && !root.mutationPending && !root.mutationUncertain
          width: parent.width
          height: visible ? Math.min(contentHeight, Style.space(140)) : 0
          clip: true
          model: root.completions
          currentIndex: root.completionIndex
          onCurrentIndexChanged: if (currentIndex >= 0) positionViewAtIndex(currentIndex, ListView.Contain)
          delegate: ActionButton {
            required property var modelData
            required property int index
            width: completionList.width
            height: Style.space(28)
            text: ""
            selected: root.completionIndex === index
            Accessible.name: modelData.label
            Text {
              anchors.fill: parent
              anchors.leftMargin: Style.space(10)
              verticalAlignment: Text.AlignVCenter
              text: (root.completionIndex === index ? "› " : "  ") + modelData.label
              textFormat: Text.PlainText
              elide: Text.ElideRight
              color: root.completionIndex === index ? root.accent : root.foreground
              font.family: root.fontFamily
              font.pixelSize: Style.font.bodySmall
            }
            onClicked: root.acceptCompletion(index)
          }
        }

        Text {
          objectName: "todoPreview"
          visible: text !== "" && !root.mutationPending
          width: parent.width
          text: root.inputSummary()
          textFormat: Text.PlainText
          wrapMode: Text.WrapAnywhere
          color: root.accent
          font.family: root.fontFamily
          font.pixelSize: Style.font.bodySmall
        }

        Text {
          visible: root.parentId !== "" || root.invalidParentIntent
          width: parent.width
          text: "Parent: " + root.parentSummary + (root.parentError ? "\n" + root.parentError : "")
          textFormat: Text.PlainText
          wrapMode: Text.WrapAnywhere
          color: root.parentError ? Color.urgent : root.foreground
          font.family: root.fontFamily
          font.pixelSize: Style.font.bodySmall
        }

        AttachmentControl {
          width: parent.width
          actionName: "attachmentSelections"
          visible: root.attachmentSelections.length > 0 || root.attachmentError !== ""
          allowBrowse: false
        }

        Text {
          visible: root.showHelp
          width: parent.width
          text: "#project  @tag  !state  ·  tom 9am, next week, in 2 hours\n"
            + "/list [#project @tag !state due:today|tomorrow|overdue|none]\n"
            + "/sync [ours|theirs]  ·  explicitly synchronize the Git branch\n"
            + "/parent  /attach  ·  optional parent and files for the next todo\n"
            + "/clear  /help  /quit\n"
            + "Tab completes · ↑/↓ suggestions or history · F5 reloads suggestions\n"
            + "PgUp/PgDn scroll results · Multiline paste queues one draft per Enter"
          textFormat: Text.PlainText
          wrapMode: Text.Wrap
          color: root.foreground
          font.family: root.fontFamily
          font.pixelSize: Style.font.bodySmall
        }

        Text {
          objectName: "todoFeedback"
          visible: text !== ""
          width: parent.width
          text: root.mutationPending ? (root.submittedKind === "task" ? "Saving…" : "Running /" + root.submittedKind + "…")
            : root.errorText || root.feedbackText
          textFormat: Text.PlainText
          color: root.errorText ? Color.urgent : root.accent
          wrapMode: Text.WrapAnywhere
          font.family: root.fontFamily
          font.pixelSize: Style.font.bodySmall
        }

        Text {
          visible: root.catalogError !== ""
          width: parent.width
          text: "Suggestions unavailable · F5 to reload\n" + root.catalogError
          textFormat: Text.PlainText
          wrapMode: Text.Wrap
          color: Color.urgent
          font.family: root.fontFamily
          font.pixelSize: Style.font.bodySmall
        }

        Text {
          width: parent.width
          text: "Enter saves · /help commands · Ctrl+P parent · Ctrl+O files · Esc closes"
          color: Qt.darker(root.foreground, 1.5)
          wrapMode: Text.Wrap
          font.family: root.fontFamily
          font.pixelSize: Style.font.caption
        }
      }

      Column {
        id: attachmentPane
        visible: root.stage === "attachments"
        width: contentScroll.width
        spacing: Style.space(10)

        Text {
          width: parent.width
          text: "ATTACH FILES"
          color: root.foreground
          font.family: root.fontFamily
          font.pixelSize: Style.font.heading
          font.bold: true
        }

        TextField {
          id: attachmentFolderField
          objectName: "attachmentFolder"
          width: parent.width
          text: decodeURIComponent(String(root.attachmentFolder).replace(/^file:\/\//i, ""))
          Accessible.name: "Attachment folder path"
          foreground: root.foreground
          accent: root.accent
          font.family: root.fontFamily
          onAccepted: root.browseAttachmentFolder(text)
          onActiveFocusChanged: if (activeFocus) root.reveal(this)
        }

        Row {
          spacing: Style.space(6)
          ActionButton {
            text: "Up"
            onClicked: {
              root.attachmentFolder = attachmentFiles.parentFolder
              attachmentFolderField.text = decodeURIComponent(String(root.attachmentFolder).replace(/^file:\/\//i, ""))
            }
            enabled: String(root.attachmentFolder) !== "file:///"
          }
          ActionButton {
            text: "Home"
            onClicked: {
              root.attachmentFolder = TodoModel.localFileUrl(Quickshell.env("HOME") || "/")
              attachmentFolderField.text = Quickshell.env("HOME") || "/"
            }
          }
          ActionButton {
            text: "Open folder"
            onClicked: root.browseAttachmentFolder(attachmentFolderField.text)
          }
        }

        Text {
          visible: attachmentFiles.status === FolderListModel.Loading || attachmentFiles.count === 0
          width: parent.width
          text: attachmentFiles.status === FolderListModel.Loading ? "Loading folder…" : "No readable files in this folder. Check the path if it does not exist."
          textFormat: Text.PlainText
          wrapMode: Text.Wrap
          color: root.foreground
          font.family: root.fontFamily
          font.pixelSize: Style.font.bodySmall
        }

        ListView {
          id: attachmentList
          objectName: "attachmentFiles"
          width: parent.width
          height: Math.min(contentHeight, Style.space(250))
          clip: true
          spacing: Style.space(4)
          model: attachmentFiles
          boundsBehavior: Flickable.StopAtBounds
          delegate: ActionButton {
            required property int index
            required property string fileName
            required property string filePath
            required property bool fileIsDir
            required property double fileSize
            width: attachmentList.width
            height: attachmentEntryLabel.implicitHeight + Style.space(18)
            text: ""
            selected: !fileIsDir && root.attachmentSelections.some(function(item) { return item.path === filePath })
            Accessible.name: fileIsDir ? "Open folder " + fileName : "Attach " + fileName
            Text {
              id: attachmentEntryLabel
              anchors.centerIn: parent
              width: parent.width - Style.space(20)
              text: fileIsDir ? fileName + "/" : fileName + " · " + TodoModel.attachmentSizeLabel(fileSize)
              textFormat: Text.PlainText
              wrapMode: Text.WrapAnywhere
              color: root.foreground
              font.family: root.fontFamily
              font.pixelSize: Style.font.bodySmall
            }
            onClicked: {
              root.chooseAttachment(index)
              attachmentFolderField.text = decodeURIComponent(String(root.attachmentFolder).replace(/^file:\/\//i, ""))
            }
            onActiveFocusChanged: if (activeFocus) {
              attachmentList.currentIndex = index
              attachmentList.positionViewAtIndex(index, ListView.Contain)
              root.reveal(attachmentList)
            }
            Keys.onPressed: function(event) {
              if (event.key === Qt.Key_Up || event.key === Qt.Key_Down) {
                attachmentList.currentIndex = Math.max(0, Math.min(attachmentFiles.count - 1,
                  index + (event.key === Qt.Key_Down ? 1 : -1)))
                attachmentList.positionViewAtIndex(attachmentList.currentIndex, ListView.Contain)
                if (attachmentList.currentItem) attachmentList.currentItem.forceActiveFocus()
                event.accepted = true
              }
            }
          }
        }

        AttachmentControl {
          width: parent.width
          actionName: "attachmentPickerSelections"
          allowBrowse: false
        }

        ActionButton {
          objectName: "finishAttachmentsButton"
          width: parent.width
          text: "Done · " + root.attachmentSelections.length + " selected"
          onClicked: root.leaveAttachmentPicker()
        }

        Text {
          width: parent.width
          text: "Files are copied when you add the todo. Esc keeps your selections."
          textFormat: Text.PlainText
          wrapMode: Text.Wrap
          color: Qt.darker(root.foreground, 1.5)
          font.family: root.fontFamily
          font.pixelSize: Style.font.bodySmall
        }
      }

      Column {
        id: parentPane
        visible: root.stage === "parent"
        width: contentScroll.width
        spacing: Style.space(10)

        AttachmentControl {
          width: parent.width
          actionName: "attachmentParentButton"
        }

        Text {
          width: parent.width
          text: "CHOOSE PARENT"
          color: root.foreground
          font.family: root.fontFamily
          font.pixelSize: Style.font.heading
          font.bold: true
        }

        Text {
          objectName: "pickerParentSummary"
          width: parent.width
          text: "Current: " + root.parentSummary
          textFormat: Text.PlainText
          wrapMode: Text.WrapAnywhere
          color: root.foreground
          font.family: root.fontFamily
          font.pixelSize: Style.font.bodySmall
        }

        TextField {
          id: parentSearch
          objectName: "parentSearch"
          Accessible.name: "Search parents by name or full ID"
          width: parent.width
          foreground: root.foreground
          accent: root.accent
          font.family: root.fontFamily
          placeholderText: "Search name or full ID"
          maximumLength: 500
          onTextChanged: root.searchParents(text)
          onActiveFocusChanged: if (activeFocus) root.reveal(this)
          Keys.onPressed: function(event) {
            if (event.key === Qt.Key_Down) root.moveParentCursor(1)
            else if (event.key === Qt.Key_Up) root.moveParentCursor(-1)
            else if (event.key === Qt.Key_Return || event.key === Qt.Key_Enter) {
              if (!event.isAutoRepeat) root.chooseHighlightedParent()
            } else return
            event.accepted = true
          }
        }

        ActionButton {
          objectName: "parentNoneButton"
          width: parent.width
          text: "None (root task)"
          Accessible.name: "None — create a root task"
          selected: root.parentIndex < 0
          bordered: true
          onClicked: root.chooseParent(null)
        }

        Text {
          objectName: "parentLookupStatus"
          width: parent.width
          visible: root.candidatesLoading || root.pickerError !== "" || !root.parentCandidates.length
          text: root.pickerError || (root.candidatesLoading ? "Loading parents…"
            : "No matching parents. Try another name or ID.")
          textFormat: Text.PlainText
          wrapMode: Text.Wrap
          color: root.pickerError ? Color.urgent : root.foreground
          font.family: root.fontFamily
          font.pixelSize: Style.font.bodySmall
        }

        ListView {
          id: parentList
          objectName: "parentCandidates"
          Accessible.name: "Parent candidates"
          width: parent.width
          height: Math.min(contentHeight, Math.max(Style.space(100), Math.min(Style.space(280), root.cardHeight - Style.space(340))))
          clip: true
          boundsBehavior: Flickable.StopAtBounds
          model: root.parentCandidates
          currentIndex: root.parentIndex
          spacing: Style.space(5)
          delegate: ActionButton {
            required property var modelData
            required property int index
            objectName: "parentCandidate_" + modelData.id
            Accessible.name: modelData.name + ", " + modelData.id + ", " + modelData.state
            width: parentList.width
            height: candidateLabel.implicitHeight + Style.space(18)
            selected: root.parentIndex === index
            bordered: true
            // Keep external labels out of Button's auto-text-format implementation.
            text: ""
            Text {
              id: candidateLabel
              anchors.centerIn: parent
              width: parent.width - Style.space(20)
              text: modelData.name + "\n" + modelData.id + " · " + modelData.state
                + (modelData.terminal ? " · terminal" : "")
              textFormat: Text.PlainText
              wrapMode: Text.WrapAnywhere
              color: root.foreground
              font.family: root.fontFamily
              font.pixelSize: Style.font.bodySmall
            }
            onClicked: root.chooseParent(modelData)
            onActiveFocusChanged: {
              if (activeFocus) {
                root.parentIndex = index
                parentList.positionViewAtIndex(index, ListView.Contain)
                root.reveal(parentList)
              }
            }
            Keys.onPressed: function(event) {
              if (event.key === Qt.Key_Down || event.key === Qt.Key_Up) {
                root.moveParentCursor(event.key === Qt.Key_Down ? 1 : -1)
                parentSearch.forceActiveFocus()
                event.accepted = true
              }
            }
          }
        }

        Text {
          objectName: "parentTruncationHint"
          visible: root.candidatesHaveMore
          width: parent.width
          text: "Showing the first 25 matches. Refine your search to find more."
          textFormat: Text.PlainText
          wrapMode: Text.Wrap
          color: root.accent
          font.family: root.fontFamily
          font.pixelSize: Style.font.bodySmall
        }

        ActionButton {
          objectName: "retryParentLookupButton"
          visible: root.pickerError !== ""
          width: parent.width
          text: "Retry parent lookup"
          onClicked: root.retryParentRead()
        }

        ActionButton {
          objectName: "cancelParentPickerButton"
          width: parent.width
          text: "Back (keep parent)"
          onClicked: root.leaveParentPicker()
        }

        Text {
          width: parent.width
          text: "↑/↓ then Enter selects  ·  Esc keeps current parent\nTerminal tasks are selectable. The store is checked again when adding."
          textFormat: Text.PlainText
          wrapMode: Text.Wrap
          color: Qt.darker(root.foreground, 1.5)
          font.family: root.fontFamily
          font.pixelSize: Style.font.bodySmall
        }
      }
      }

    }
  }
}
