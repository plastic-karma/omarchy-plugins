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
  property bool dateInputReady: false
  property string taskText: ""
  property string errorText: ""
  property string submittedText: ""
  property string submittedDate: ""
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
  property string detectedDateAppliedFor: ""
  readonly property bool parentReady: !invalidParentIntent && (!parentId || selectedParent !== null)
  readonly property string parentSummary: invalidParentIntent ? "Invalid launch parent — choose a parent or None."
    : selectedParent ? selectedParent.name + "\n" + selectedParent.id + " · " + selectedParent.state
    : parentId ? parentId + " · " + (parentError ? "Unresolved" : "Resolving…")
    : "None — create a root task"
  property var detectedDueDatePhrase: null
  property date todayDate: new Date()
  property date selectedDate: new Date()
  property int viewYear: selectedDate.getFullYear()
  property int viewMonth: selectedDate.getMonth()

  property string fontFamily: Style.font.menuFamily
  property color background: Color.menu.background
  property color foreground: Color.menu.text
  property color border: Color.menu.border
  property color scrim: Color.menu.scrim
  readonly property color accent: Color.accent
  readonly property var borderSpec: Border.surfaceSpec("menu", "border", border, Math.max(1, Style.space(2)))
  readonly property int cornerRadius: Style.cornerRadius
  readonly property int contentMargin: Style.spacing.panelPadding
  readonly property int calendarGap: Style.space(4)
  readonly property int calendarCellHeight: Style.space(38)
  readonly property real calendarCellWidth: Math.floor((datePane.width - calendarGap * 6) / 7)
  readonly property string todayKey: TodoModel.keyForDate(todayDate)
  readonly property string selectedKey: TodoModel.keyForDate(selectedDate)
  readonly property date viewDate: TodoModel.dateAtNoon(viewYear, viewMonth, 1)
  readonly property int weekStart: TodoModel.normalizedWeekStart(Qt.locale().firstDayOfWeek)
  readonly property var weekdays: TodoModel.weekdayOrder(weekStart)
  readonly property var calendarCells: TodoModel.monthCells(viewYear, viewMonth, weekStart, todayKey)
  readonly property string pluginDir: manifest && manifest.__sourceDir ? String(manifest.__sourceDir) : ""
  readonly property string helperPath: pluginDir ? pluginDir + "/bin/otodo-create" : ""
  readonly property int cardWidth: Math.min(Style.space(540), panel.width - Style.gapsOut * 2)
  readonly property int desiredCardHeight: stage === "text"
    ? Style.space(510)
    : stage === "parent" || stage === "attachments" ? Style.space(640) : Style.space(760)
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
    dateInputTimer.stop()
    root.dateInputReady = false
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
    root.submittedText = ""
    root.submittedDate = ""
    root.submittedParentId = ""
    root.mutationUncertain = false
    root.detectedDateAppliedFor = ""
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
    var now = new Date()
    root.todayDate = TodoModel.dateAtNoon(now.getFullYear(), now.getMonth(), now.getDate())
    root.selectedDate = TodoModel.parseDateKey(payload.dueDate) || root.todayDate
    root.viewYear = root.selectedDate.getFullYear()
    root.viewMonth = root.selectedDate.getMonth()
    root.taskText = payload.text
    root.parentId = payload.parentId
    root.stage = "text"
    root.opened = true
    contentScroll.contentY = 0
    taskField.text = root.taskText
    root.updateDueDateDetection(taskField.text)
    root.errorText = ""
    root.parentError = launchError
    root.focusStage()
    root.requestParentRead(root.parentId ? "lookup" : "discover", root.parentId)
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
    if (root.mutationPending || (root.stage !== "text" && root.stage !== "date")) return
    root.pickerReturnStage = root.stage
    root.stage = "parent"
    root.dateInputReady = false
    dateInputTimer.stop()
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
        || (root.stage !== "text" && root.stage !== "date" && root.stage !== "parent")) return
    root.attachmentReturnStage = root.stage
    root.stage = "attachments"
    root.dateInputReady = false
    dateInputTimer.stop()
    contentScroll.contentY = 0
    root.attachmentError = ""
    root.focusStage()
  }

  function leaveAttachmentPicker() {
    root.stage = root.attachmentReturnStage
    contentScroll.contentY = 0
    if (root.stage === "date") root.armDateInput()
    else root.focusStage()
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
    if (root.stage === "date") root.armDateInput()
    else root.focusStage()
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

  function updateDueDateDetection(value) {
    root.taskText = String(value || "")
    root.detectedDueDatePhrase = TodoModel.detectDueDatePhrase(root.taskText, root.todayDate)
    if (root.errorText && !root.mutationUncertain) root.errorText = ""
  }

  function showDatePicker() {
    if (!root.opened || root.stage !== "text" || root.mutationPending) return
    var detection = root.detectedDueDatePhrase
    var savedName = detection ? detection.nameWithoutPhrase : taskField.text.trim()
    if (!savedName.trim()) {
      root.errorText = detection ? "Add a name besides the due date." : "Enter a todo first."
      return
    }

    if (detection && root.detectedDateAppliedFor !== taskField.text) {
      var detectedDate = TodoModel.parseDateKey(detection.dueDate)
      if (detectedDate) root.selectDate(detectedDate)
      root.detectedDateAppliedFor = taskField.text
    }

    root.taskText = savedName.trim()
    if (!root.mutationUncertain) root.errorText = ""
    root.stage = "date"
    contentScroll.contentY = 0
    root.armDateInput()
  }

  function returnToText() {
    root.dateInputReady = false
    dateInputTimer.stop()
    root.stage = "text"
    if (!root.mutationUncertain) root.errorText = ""
    contentScroll.contentY = 0
    root.focusStage()
  }

  function selectDate(date) {
    root.selectedDate = TodoModel.dateAtNoon(date.getFullYear(), date.getMonth(), date.getDate())
    root.viewYear = root.selectedDate.getFullYear()
    root.viewMonth = root.selectedDate.getMonth()
  }

  function selectCell(cell) {
    root.selectDate(TodoModel.dateAtNoon(cell.year, cell.month, cell.day))
    dateKeyCatcher.forceActiveFocus()
  }

  function moveSelection(days) {
    root.selectDate(TodoModel.addDays(root.selectedDate, days))
  }

  function moveSelectionMonth(months) {
    root.selectDate(TodoModel.addMonths(root.selectedDate, months))
  }

  function moveViewMonth(months) {
    var next = TodoModel.dateAtNoon(root.viewYear, root.viewMonth + months, 1)
    root.viewYear = next.getFullYear()
    root.viewMonth = next.getMonth()
    dateKeyCatcher.forceActiveFocus()
  }

  function chooseToday() {
    root.selectDate(root.todayDate)
  }

  function chooseTomorrow() {
    root.selectDate(TodoModel.addDays(root.todayDate, 1))
  }

  function armDateInput() {
    root.dateInputReady = false
    dateInputTimer.restart()
  }

  Timer {
    id: dateInputTimer
    interval: 150
    repeat: false
    onTriggered: {
      if (!root.opened || root.stage !== "date") return
      root.dateInputReady = true
      dateKeyCatcher.forceActiveFocus()
    }
  }

  function weekdayLabel(day) {
    return String(Qt.locale().dayName(day, Locale.ShortFormat)).slice(0, 2).toUpperCase()
  }

  function saveTodo() {
    if (!root.opened || root.stage !== "date" || !root.dateInputReady
        || root.mutationPending || root.mutationUncertain) return
    if (!root.helperPath) {
      root.errorText = "The todo helper is unavailable: plugin source directory is missing."
      return
    }
    if (!root.parentReady) {
      root.errorText = "Resolve the requested parent, choose another parent, or explicitly choose None before adding."
      return
    }
    root.submittedText = root.taskText
    root.submittedDate = root.selectedKey
    root.submittedParentId = root.parentId
    if (root.attachmentSelections.length > 0 && !root.supportsAttachments) {
      root.errorText = "This otodo does not support attachments. Update otodo or remove the selections."
      return
    }
    root.submittedAttachments = root.attachmentSelections.slice()
    root.mutationSession = root.sessionGeneration
    root.mutationPending = true
    root.mutationStarted = false
    root.errorText = ""
    root.stage = "saving"
    var command = [root.helperPath, "--add", root.submittedText, root.submittedDate]
    if (root.submittedParentId) command.push("--parent", root.submittedParentId)
    root.submittedAttachments.forEach(function(item) { command.push("--attach", item.path) })
    createProcess.command = command
    createProcess.running = true
    createStartTimer.restart()
  }

  function mutationFailure(message, uncertain) {
    root.mutationPending = false
    createStartTimer.stop()
    if (!root.opened || root.mutationSession !== root.sessionGeneration) return
    root.mutationUncertain = uncertain
    root.errorText = uncertain
      ? "Creation could not be confirmed. The task may already exist; check the store before adding again. "
        + "Submitted: " + root.submittedText + " · " + root.submittedDate
        + " · parent " + (root.submittedParentId || "None")
        + " · " + root.submittedAttachments.length + " attachment(s). " + message
      : message
    root.stage = "date"
    root.armDateInput()
    var session = root.sessionGeneration
    Qt.callLater(function() {
      if (root.opened && root.sessionGeneration === session && root.stage === "date")
        root.reveal(dateError)
    })
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
        var task = TodoModel.decodeTask(createStdout.text)
        if ((task.parent || "") !== root.submittedParentId || task.name !== root.submittedText
            || task.due_date !== root.submittedDate)
          throw new Error("The returned task does not match the submitted title, date, or parent.")
      } catch (error) {
        root.mutationFailure(String(error.message || error), true)
        return
      }
      root.mutationPending = false
      if (!root.opened || root.mutationSession !== root.sessionGeneration) return
      root.attachmentSelections = []
      root.dismiss()
      Quickshell.execDetached([
        root.omarchyPath + "/bin/omarchy-notification-send",
        "Todo created",
        root.submittedText + " · " + root.submittedDate
      ])
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

  component ParentControl: Column {
    required property string actionName
    spacing: Style.space(5)
    ActionButton {
      objectName: parent.actionName
      width: parent.width
      text: "Parent…  (Ctrl+P)"
      Accessible.name: "Choose parent"
      bordered: true
      onClicked: root.openParentPicker()
    }
    Text {
      objectName: parent.actionName + "Summary"
      width: parent.width
      text: root.parentSummary
      textFormat: Text.PlainText
      wrapMode: Text.WrapAnywhere
      color: root.foreground
      font.family: root.fontFamily
      font.pixelSize: Style.font.bodySmall
    }
    Text {
      visible: root.parentError !== ""
      width: parent.width
      text: root.parentError
      textFormat: Text.PlainText
      wrapMode: Text.Wrap
      color: Color.urgent
      font.family: root.fontFamily
      font.pixelSize: Style.font.bodySmall
    }
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
        contentHeight: root.stage === "text" ? textPane.height
          : root.stage === "parent" ? parentPane.height
          : root.stage === "attachments" ? attachmentPane.height : dateColumn.height
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
            else if (root.stage === "date") root.returnToText()
            else root.dismiss()
          } else return
          event.accepted = true
        }

      Column {
        id: textPane
        visible: root.stage === "text"
        width: contentScroll.width
        spacing: Style.space(12)

        Text {
          width: parent.width
          text: "NEW TODO"
          color: Qt.darker(root.foreground, 1.4)
          font.family: root.fontFamily
          font.pixelSize: Style.font.caption
          font.bold: true
          font.letterSpacing: 1
        }

        Text {
          width: parent.width
          text: "What needs doing?"
          color: root.foreground
          font.family: root.fontFamily
          font.pixelSize: Style.font.heading
          font.bold: true
        }

        TextField {
          id: taskField
          objectName: "todoTitle"
          Accessible.name: "Todo title"
          onActiveFocusChanged: if (activeFocus) root.reveal(this)
          width: parent.width
          foreground: root.foreground
          accent: root.accent
          font.family: root.fontFamily
          placeholderText: "Enter a todo"
          maximumLength: 500
          onTextChanged: root.updateDueDateDetection(text)
          onAccepted: root.showDatePicker()

          Keys.onPressed: function(event) {
            if ((event.key === Qt.Key_Return || event.key === Qt.Key_Enter) && event.isAutoRepeat) {
              event.accepted = true
              return
            }
            if (event.key === Qt.Key_Escape) {
              root.dismiss()
              event.accepted = true
            }
          }
        }

        Text {
          visible: root.detectedDueDatePhrase !== null
          width: parent.width
          text: visible
            // Phrase text is data, not markup.
            ? "Due " + root.detectedDueDatePhrase.dueDate
              + "  ·  “" + root.detectedDueDatePhrase.phrase + "” will be removed when added"
            : ""
          color: root.accent
          textFormat: Text.PlainText
          wrapMode: Text.Wrap
          font.family: root.fontFamily
          font.pixelSize: Style.font.bodySmall
        }

        ParentControl {
          width: parent.width
          actionName: "parentTitleButton"
        }

        AttachmentControl {
          width: parent.width
          actionName: "attachmentTitleButton"
        }

        Text {
          visible: root.errorText !== ""
          width: parent.width
          text: root.errorText
          textFormat: Text.PlainText
          color: Color.urgent
          wrapMode: Text.Wrap
          font.family: root.fontFamily
          font.pixelSize: Style.font.bodySmall
        }

        Text {
          width: parent.width
          text: root.detectedDueDatePhrase
            ? "Enter to review the detected date  ·  Esc to cancel"
            : "Enter to choose a date  ·  Esc to cancel"
          color: Qt.darker(root.foreground, 1.6)
          wrapMode: Text.Wrap
          font.family: root.fontFamily
          font.pixelSize: Style.font.bodySmall
        }

        ActionButton {
          objectName: "reviewDateButton"
          width: parent.width
          text: "Choose date"
          onClicked: root.showDatePicker()
        }
      }

      Item {
        id: datePane
        visible: root.stage === "date" || root.stage === "saving"
        enabled: root.stage === "date"
        opacity: root.stage === "saving" ? 0.58 : 1
        width: contentScroll.width
        height: dateColumn.height

        Item {
          id: dateKeyCatcher
          objectName: "dateKeyboard"
          Accessible.name: "Choose due date with arrow keys"
          anchors.fill: parent
          focus: root.stage === "date"

          Keys.onPressed: function(event) {
            if (root.stage !== "date" || !root.dateInputReady) return
            if ((event.key === Qt.Key_Return || event.key === Qt.Key_Enter) && event.isAutoRepeat) {
              event.accepted = true
              return
            }

            if (event.key === Qt.Key_Escape) {
              root.returnToText()
            } else if (event.key === Qt.Key_Left) {
              root.moveSelection(-1)
            } else if (event.key === Qt.Key_Right) {
              root.moveSelection(1)
            } else if (event.key === Qt.Key_Up) {
              root.moveSelection(-7)
            } else if (event.key === Qt.Key_Down) {
              root.moveSelection(7)
            } else if (event.key === Qt.Key_PageUp) {
              root.moveSelectionMonth(-1)
            } else if (event.key === Qt.Key_PageDown) {
              root.moveSelectionMonth(1)
            } else if (event.key === Qt.Key_Home) {
              root.chooseToday()
            } else if (event.key === Qt.Key_Return || event.key === Qt.Key_Enter) {
              root.saveTodo()
            } else {
              return
            }
            event.accepted = true
          }
        }
        Column {
          id: dateColumn
          width: parent.width
          spacing: Style.space(8)

        Item {
          width: parent.width
          height: Style.space(28)

          Text {
            anchors.left: parent.left
            anchors.verticalCenter: parent.verticalCenter
            text: "REMINDER DATE"
            color: Qt.darker(root.foreground, 1.4)
            font.family: root.fontFamily
            font.pixelSize: Style.font.caption
            font.bold: true
            font.letterSpacing: 1
          }

          Text {
            anchors.right: parent.right
            anchors.verticalCenter: parent.verticalCenter
            text: root.selectedKey
            color: root.foreground
            font.family: root.fontFamily
            font.pixelSize: Style.font.bodySmall
          }
        }

        Text {
          width: parent.width
          height: Style.space(28)
          text: root.taskText
          textFormat: Text.PlainText
          color: root.foreground
          elide: Text.ElideRight
          verticalAlignment: Text.AlignVCenter
          font.family: root.fontFamily
          font.pixelSize: Style.font.heading
          font.bold: true
        }

        ParentControl {
          width: parent.width
          actionName: "parentDateButton"
        }

        AttachmentControl {
          width: parent.width
          actionName: "attachmentDateButton"
        }

        Item {
          width: parent.width
          height: Style.space(38)

          Button {
            anchors.left: parent.left
            anchors.verticalCenter: parent.verticalCenter
            width: Style.space(42)
            height: Style.space(34)
            text: "‹"
            tooltipText: "Previous month"
            foreground: root.foreground
            accent: root.accent
            fontFamily: root.fontFamily
            fontSize: Style.font.heading
            onClicked: root.moveViewMonth(-1)
          }

          Text {
            anchors.centerIn: parent
            text: Qt.formatDate(root.viewDate, "MMMM yyyy").toUpperCase()
            color: Qt.darker(root.foreground, 1.3)
            font.family: root.fontFamily
            font.pixelSize: Style.font.body
            font.bold: true
            font.letterSpacing: 1
          }

          Button {
            anchors.right: parent.right
            anchors.verticalCenter: parent.verticalCenter
            width: Style.space(42)
            height: Style.space(34)
            text: "›"
            tooltipText: "Next month"
            foreground: root.foreground
            accent: root.accent
            fontFamily: root.fontFamily
            fontSize: Style.font.heading
            onClicked: root.moveViewMonth(1)
          }
        }

        Row {
          width: parent.width
          height: Style.space(20)
          spacing: root.calendarGap

          Repeater {
            model: root.weekdays

            Text {
              required property var modelData
              width: root.calendarCellWidth
              height: Style.space(20)
              text: root.weekdayLabel(modelData)
              color: Qt.darker(root.foreground, 1.6)
              horizontalAlignment: Text.AlignHCenter
              verticalAlignment: Text.AlignVCenter
              font.family: root.fontFamily
              font.pixelSize: Style.font.caption
              font.bold: true
              font.letterSpacing: 1
            }
          }
        }

        Grid {
          width: parent.width
          height: root.calendarCellHeight * 6 + root.calendarGap * 5
          columns: 7
          columnSpacing: root.calendarGap
          rowSpacing: root.calendarGap

          Repeater {
            model: root.calendarCells

            Button {
              required property var modelData
              width: root.calendarCellWidth
              height: root.calendarCellHeight
              text: String(modelData.day)
              selected: modelData.key === root.selectedKey
              bordered: modelData.today && !selected
              foreground: modelData.inMonth ? root.foreground : Qt.darker(root.foreground, 2)
              accent: root.accent
              fontFamily: root.fontFamily
              fontSize: Style.font.body
              horizontalPadding: 0
              verticalPadding: 0
              onClicked: root.selectCell(modelData)
            }
          }
        }

        Column {
          width: parent.width
          spacing: Style.space(6)

          Row {
            spacing: Style.space(6)

            Button {
              text: "Today"
              bordered: true
              foreground: root.foreground
              accent: root.accent
              fontFamily: root.fontFamily
              onClicked: root.chooseToday()
            }

            Button {
              text: "Tomorrow"
              bordered: true
              foreground: root.foreground
              accent: root.accent
              fontFamily: root.fontFamily
              onClicked: root.chooseTomorrow()
            }
          }

          Text {
            width: parent.width
            wrapMode: Text.Wrap
            text: Qt.formatDate(root.selectedDate, "ddd, MMM d")
            color: root.foreground
            font.family: root.fontFamily
            font.pixelSize: Style.font.body
          }
        }

        Text {
          id: dateError
          objectName: "todoCreateError"
          visible: root.errorText !== ""
          width: parent.width
          textFormat: Text.PlainText
          text: root.errorText
          color: Color.urgent
          wrapMode: Text.Wrap
          font.family: root.fontFamily
          font.pixelSize: Style.font.bodySmall
        }

        Flow {
          width: parent.width
          spacing: Style.space(8)

          ActionButton {
            objectName: "backToTitleButton"
            text: "Back"
            foreground: root.foreground
            accent: root.accent
            fontFamily: root.fontFamily
            onClicked: root.returnToText()
          }


            ActionButton {
              objectName: "cancelTodoButton"
              text: "Cancel"
              foreground: root.foreground
              accent: root.accent
              fontFamily: root.fontFamily
              onClicked: root.dismiss()
            }

            ActionButton {
              objectName: "addTodoButton"
              enabled: root.dateInputReady && root.parentReady && !root.mutationUncertain
              text: root.stage === "saving" ? "Adding…" : "Add todo"
              selected: true
              bordered: true
              foreground: root.foreground
              accent: root.accent
              fontFamily: root.fontFamily
              onClicked: root.saveTodo()
            }
        }

        Text {
          width: parent.width
          text: "Arrow keys choose  ·  Page Up/Down changes month  ·  Enter adds"
          color: Qt.darker(root.foreground, 1.7)
          horizontalAlignment: Text.AlignHCenter
          wrapMode: Text.Wrap
          font.family: root.fontFamily
          font.pixelSize: Style.font.caption
        }
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

      Rectangle {
        visible: root.stage === "saving"
        anchors.centerIn: parent
        width: savingLabel.implicitWidth + Style.space(28)
        height: savingLabel.implicitHeight + Style.space(20)
        radius: root.cornerRadius
        color: root.background
        border.width: Style.spacing.hairline
        border.color: root.border

        Text {
          id: savingLabel
          anchors.centerIn: parent
          text: "Adding todo…"
          color: root.foreground
          font.family: root.fontFamily
          font.pixelSize: Style.font.body
          font.bold: true
        }
      }
    }
  }
}
