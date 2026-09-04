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

function isWordCharacter(character) {
  var code = character.charCodeAt(0)
  if ((code >= 48 && code <= 57)
      || (code >= 65 && code <= 90)
      || (code >= 97 && code <= 122))
    return true
  return character.toLowerCase() !== character.toUpperCase()
}

function wordsIn(value) {
  var text = String(value || "")
  var words = []
  var wordStart = -1

  for (var index = 0; index < text.length; index++) {
    if (isWordCharacter(text.charAt(index))) {
      if (wordStart < 0) wordStart = index
    } else if (wordStart >= 0) {
      words.push({
        normalized: text.slice(wordStart, index).toLowerCase(),
        start: wordStart,
        end: index
      })
      wordStart = -1
    }
  }

  if (wordStart >= 0) {
    words.push({
      normalized: text.slice(wordStart).toLowerCase(),
      start: wordStart,
      end: text.length
    })
  }
  return words
}

function positiveInteger(value) {
  if (!/^[0-9]+$/.test(value)) return 0
  var amount = Number(value)
  return isFinite(amount) && amount > 0 && Math.floor(amount) === amount ? amount : 0
}

function weekdayNumber(value) {
  switch (value) {
  case "sunday": return 0
  case "monday": return 1
  case "tuesday": return 2
  case "wednesday": return 3
  case "thursday": return 4
  case "friday": return 5
  case "saturday": return 6
  default: return -1
  }
}

function isWhitespaceOrPunctuation(character) {
  if (/\s/.test(character)) return true
  var code = character.charCodeAt(0)
  if ((code >= 33 && code <= 47)
      || (code >= 58 && code <= 64)
      || (code >= 91 && code <= 96)
      || (code >= 123 && code <= 126))
    return true
  return "…—–“”‘’«»".indexOf(character) !== -1
}

function removingPhrase(value, start, end) {
  var text = String(value || "")
  var prefixEnd = start
  while (prefixEnd > 0 && isWhitespaceOrPunctuation(text.charAt(prefixEnd - 1)))
    prefixEnd--

  var suffixStart = end
  while (suffixStart < text.length && isWhitespaceOrPunctuation(text.charAt(suffixStart)))
    suffixStart++

  var prefix = text.slice(0, prefixEnd)
  var suffix = text.slice(suffixStart)
  if (!prefix) return suffix
  if (!suffix) return prefix
  return prefix + " " + suffix
}

function detectDueDatePhrase(value, referenceDate) {
  var text = String(value || "")
  var words = wordsIn(text)
  if (words.length === 0) return null

  var candidate = null
  for (var index = 0; index < words.length; index++) {
    var word = words[index].normalized
    if (word === "tomorrow") {
      candidate = { start: words[index].start, end: words[index].end, kind: "days", amount: 1 }
      continue
    }

    var weekday = weekdayNumber(word)
    if (weekday >= 0) {
      candidate = { start: words[index].start, end: words[index].end, kind: "weekday", amount: weekday }
      continue
    }

    if (word === "next" && index + 1 < words.length) {
      var nextWord = words[index + 1]
      if (nextWord.normalized === "week") {
        candidate = { start: words[index].start, end: nextWord.end, kind: "weeks", amount: 1 }
      } else if (nextWord.normalized === "month") {
        candidate = { start: words[index].start, end: nextWord.end, kind: "months", amount: 1 }
      }
      continue
    }

    if (word === "in" && index + 2 < words.length) {
      var amountWord = words[index + 1]
      var unitWord = words[index + 2]
      var amount = positiveInteger(amountWord.normalized)
      if (!amount) continue
      var unit = unitWord.normalized
      if (unit.charAt(unit.length - 1) === "s") unit = unit.slice(0, -1)
      if (unit === "day" || unit === "week" || unit === "month") {
        candidate = {
          start: words[index].start,
          end: unitWord.end,
          kind: unit + "s",
          amount: amount
        }
      }
    }
  }

  if (!candidate) return null
  var reference = referenceDate instanceof Date ? referenceDate : new Date()
  if (isNaN(reference.getTime())) return null
  var start = dateAtNoon(reference.getFullYear(), reference.getMonth(), reference.getDate())
  var resolved = null

  if (candidate.kind === "days") {
    resolved = addDays(start, candidate.amount)
  } else if (candidate.kind === "weeks") {
    resolved = addDays(start, candidate.amount * 7)
  } else if (candidate.kind === "months") {
    resolved = addMonths(start, candidate.amount)
  } else if (candidate.kind === "weekday") {
    var distance = (candidate.amount - start.getDay() + 7) % 7
    resolved = addDays(start, distance === 0 ? 7 : distance)
  }

  if (!resolved || isNaN(resolved.getTime())) return null
  return {
    phrase: text.slice(candidate.start, candidate.end),
    dueDate: keyForDate(resolved),
    range: {
      start: candidate.start,
      length: candidate.end - candidate.start
    },
    nameWithoutPhrase: removingPhrase(text, candidate.start, candidate.end)
  }
}

if (typeof module !== "undefined") {
  module.exports = {
    addDays: addDays,
    addMonths: addMonths,
    dateAtNoon: dateAtNoon,
    detectDueDatePhrase: detectDueDatePhrase,
    keyForDate: keyForDate,
    keyForParts: keyForParts,
    monthCells: monthCells,
    normalizedWeekStart: normalizedWeekStart,
    parseDateKey: parseDateKey,
    weekdayOrder: weekdayOrder
  }
}
