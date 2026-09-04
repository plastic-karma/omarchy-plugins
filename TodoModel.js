function pad2(value) {
  return String(value).padStart(2, "0")
}

function dateAtNoon(year, month, day) {
  return new Date(Number(year), Number(month), Number(day), 12, 0, 0, 0)
}

function keyForParts(year, month, day) {
  return String(year).padStart(4, "0") + "-" + pad2(Number(month) + 1) + "-" + pad2(day)
}

function keyForDate(date) {
  return keyForParts(date.getFullYear(), date.getMonth(), date.getDate())
}

function parseDateKey(value) {
  var match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(value || ""))
  if (!match) return null

  var year = Number(match[1])
  var month = Number(match[2]) - 1
  var day = Number(match[3])
  var parsed = dateAtNoon(year, month, day)
  if (parsed.getFullYear() !== year || parsed.getMonth() !== month || parsed.getDate() !== day)
    return null
  return parsed
}

function normalizedWeekStart(value) {
  var day = Number(value)
  return day >= 1 && day <= 7 ? day : 1
}

function weekdayOrder(weekStart) {
  var first = normalizedWeekStart(weekStart)
  var days = []
  for (var index = 0; index < 7; index++)
    days.push(((first - 1 + index) % 7) + 1)
  return days
}

function qtWeekday(date) {
  var day = date.getDay()
  return day === 0 ? 7 : day
}

function monthCells(year, month, weekStart, todayKey) {
  var viewYear = Number(year)
  var viewMonth = Number(month)
  var first = dateAtNoon(viewYear, viewMonth, 1)
  var offset = (qtWeekday(first) - normalizedWeekStart(weekStart) + 7) % 7
  var cells = []

  for (var index = 0; index < 42; index++) {
    var date = dateAtNoon(viewYear, viewMonth, 1 - offset + index)
    var key = keyForDate(date)
    cells.push({
      year: date.getFullYear(),
      month: date.getMonth(),
      day: date.getDate(),
      key: key,
      inMonth: date.getFullYear() === viewYear && date.getMonth() === viewMonth,
      today: key === String(todayKey || "")
    })
  }

  return cells
}

function addDays(date, amount) {
  return dateAtNoon(date.getFullYear(), date.getMonth(), date.getDate() + Number(amount))
}

function addMonths(date, amount) {
  var year = date.getFullYear()
  var month = date.getMonth() + Number(amount)
  var day = date.getDate()
  var lastDay = dateAtNoon(year, month + 1, 0).getDate()
  return dateAtNoon(year, month, Math.min(day, lastDay))
}

if (typeof module !== "undefined") {
  module.exports = {
    addDays: addDays,
    addMonths: addMonths,
    dateAtNoon: dateAtNoon,
    keyForDate: keyForDate,
    keyForParts: keyForParts,
    monthCells: monthCells,
    normalizedWeekStart: normalizedWeekStart,
    parseDateKey: parseDateKey,
    weekdayOrder: weekdayOrder
  }
}
