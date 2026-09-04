import Quickshell
import Quickshell.Io
import Quickshell.Wayland
import QtQuick
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
  property string taskText: ""
  property string errorText: ""
  property string submittedText: ""
  property string submittedDate: ""
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
  readonly property int desiredCardHeight: stage === "text" ? Style.space(220) : Style.space(600)
  readonly property int cardHeight: Math.min(desiredCardHeight, panel.height - Style.gapsOut * 2)

  function open(payloadJson) {
    if (createProcess.running) return

    var payload = ({})
    try { payload = JSON.parse(payloadJson || "{}") } catch (error) { payload = ({}) }

    var now = new Date()
    root.todayDate = TodoModel.dateAtNoon(now.getFullYear(), now.getMonth(), now.getDate())
    var requestedDate = TodoModel.parseDateKey(payload.dueDate)
    root.selectedDate = requestedDate || root.todayDate
    root.viewYear = root.selectedDate.getFullYear()
    root.viewMonth = root.selectedDate.getMonth()
    root.taskText = payload.text ? String(payload.text) : ""
    root.errorText = ""
    root.stage = "text"
    root.opened = true
    taskField.text = root.taskText

    Qt.callLater(function() {
      taskField.cursorPosition = taskField.text.length
      taskField.forceActiveFocus()
    })
  }

  function close() {
    root.opened = false
  }

  function dismiss() {
    if (createProcess.running) return
    root.opened = false
    if (root.shell && typeof root.shell.hide === "function")
      root.shell.hide((root.manifest && root.manifest.id) || "br.otodo")
  }

  function toggle() {
    if (root.opened) root.dismiss()
    else root.open("{}")
  }

  function showDatePicker() {
    var trimmed = taskField.text.trim()
    if (!trimmed) {
      root.errorText = "Enter a todo first."
      return
    }

    root.taskText = trimmed
    root.errorText = ""
    root.stage = "date"
    Qt.callLater(function() { dateKeyCatcher.forceActiveFocus() })
  }

  function returnToText() {
    root.stage = "text"
    root.errorText = ""
    Qt.callLater(function() {
      taskField.cursorPosition = taskField.text.length
      taskField.forceActiveFocus()
    })
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

  function weekdayLabel(day) {
    return String(Qt.locale().dayName(day, Locale.ShortFormat)).slice(0, 2).toUpperCase()
  }

  function saveTodo() {
    if (createProcess.running || !root.helperPath) return

    root.submittedText = root.taskText
    root.submittedDate = root.selectedKey
    root.errorText = ""
    root.stage = "saving"
    createProcess.command = [root.helperPath, "--add", root.submittedText, root.submittedDate]
    createProcess.running = true
  }

  Process {
    id: createProcess
    running: false
    command: []

    stdout: StdioCollector {
      id: createStdout
      waitForEnd: true
    }

    stderr: StdioCollector {
      id: createStderr
      waitForEnd: true
    }

    onExited: function(exitCode) {
      if (exitCode === 0) {
        root.opened = false
        if (root.shell && typeof root.shell.hide === "function")
          root.shell.hide((root.manifest && root.manifest.id) || "br.otodo")
        Quickshell.execDetached([
          root.omarchyPath + "/bin/omarchy-notification-send",
          "Todo created",
          root.submittedText + " · " + root.submittedDate
        ])
        return
      }

      var detail = String(createStderr.text || "").trim()
      root.errorText = detail || "The todo could not be created."
      root.stage = "date"
      Qt.callLater(function() { dateKeyCatcher.forceActiveFocus() })
    }
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

      Column {
        id: textPane
        visible: root.stage === "text"
        width: card.width - root.contentMargin * 2
        anchors.centerIn: parent
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
          width: parent.width
          foreground: root.foreground
          accent: root.accent
          font.family: root.fontFamily
          placeholderText: "Enter a todo"
          maximumLength: 500
          onTextChanged: root.taskText = text
          onAccepted: root.showDatePicker()

          Keys.onPressed: function(event) {
            if (event.key === Qt.Key_Escape) {
              root.dismiss()
              event.accepted = true
            }
          }
        }

        Text {
          visible: root.errorText !== ""
          width: parent.width
          height: visible ? implicitHeight : 0
          text: root.errorText
          color: Color.urgent
          wrapMode: Text.Wrap
          font.family: root.fontFamily
          font.pixelSize: Style.font.bodySmall
        }

        Text {
          width: parent.width
          text: "Enter to choose a date  ·  Esc to cancel"
          color: Qt.darker(root.foreground, 1.6)
          font.family: root.fontFamily
          font.pixelSize: Style.font.bodySmall
        }
      }

      Item {
        id: datePane
        visible: root.stage === "date" || root.stage === "saving"
        enabled: root.stage === "date"
        opacity: root.stage === "saving" ? 0.58 : 1
        anchors.fill: parent
        anchors.topMargin: root.contentMargin
        anchors.rightMargin: root.contentMargin
        anchors.bottomMargin: root.contentMargin
        anchors.leftMargin: root.contentMargin

        Item {
          id: dateKeyCatcher
          anchors.fill: parent
          focus: root.stage === "date"

          Keys.onPressed: function(event) {
            if (root.stage !== "date") return

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
          anchors.fill: parent
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
          color: root.foreground
          elide: Text.ElideRight
          verticalAlignment: Text.AlignVCenter
          font.family: root.fontFamily
          font.pixelSize: Style.font.heading
          font.bold: true
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

        Item {
          width: parent.width
          height: Style.space(38)

          Row {
            anchors.left: parent.left
            anchors.verticalCenter: parent.verticalCenter
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
            anchors.right: parent.right
            anchors.verticalCenter: parent.verticalCenter
            text: Qt.formatDate(root.selectedDate, "ddd, MMM d")
            color: root.foreground
            font.family: root.fontFamily
            font.pixelSize: Style.font.body
          }
        }

        Text {
          visible: root.errorText !== ""
          width: parent.width
          height: visible ? Math.min(implicitHeight, Style.space(46)) : 0
          text: root.errorText
          color: Color.urgent
          elide: Text.ElideRight
          wrapMode: Text.Wrap
          maximumLineCount: 2
          font.family: root.fontFamily
          font.pixelSize: Style.font.bodySmall
        }

        Item {
          width: parent.width
          height: Style.space(42)

          Button {
            anchors.left: parent.left
            anchors.verticalCenter: parent.verticalCenter
            text: "Back"
            foreground: root.foreground
            accent: root.accent
            fontFamily: root.fontFamily
            onClicked: root.returnToText()
          }

          Row {
            anchors.right: parent.right
            anchors.verticalCenter: parent.verticalCenter
            spacing: Style.space(8)

            Button {
              text: "Cancel"
              foreground: root.foreground
              accent: root.accent
              fontFamily: root.fontFamily
              onClicked: root.dismiss()
            }

            Button {
              text: root.stage === "saving" ? "Adding…" : "Add todo"
              selected: true
              bordered: true
              foreground: root.foreground
              accent: root.accent
              fontFamily: root.fontFamily
              onClicked: root.saveTodo()
            }
          }
        }

        Text {
          width: parent.width
          text: "Arrow keys choose  ·  Page Up/Down changes month  ·  Enter adds"
          color: Qt.darker(root.foreground, 1.7)
          horizontalAlignment: Text.AlignHCenter
          font.family: root.fontFamily
          font.pixelSize: Style.font.caption
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
