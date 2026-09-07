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

function isPlainObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    && Object.getPrototypeOf(value) === Object.prototype
}

function hasOwn(value, key) {
  return Object.prototype.hasOwnProperty.call(value, key)
}

function parseObject(text, label) {
  if (typeof text !== "string") throw new Error(label + " must be JSON text")
  var value
  try {
    value = JSON.parse(text)
  } catch (error) {
    throw new Error(label + " is not valid JSON")
  }
  if (!isPlainObject(value)) throw new Error(label + " must be a JSON object")
  return value
}

function normalizeParentId(value) {
  if (typeof value !== "string" || value.length !== 26 || !/^[0-7][0-9A-HJKMNP-TV-Z]{25}$/i.test(value))
    throw new Error("Parent must be a full ULID")
  return value.toUpperCase()
}

function parseLaunchPayload(json) {
  var payload = parseObject(json === undefined || json === "" ? "{}" : json, "Launch payload")
  var text = hasOwn(payload, "text") ? payload.text : ""
  var dueDate = hasOwn(payload, "dueDate") ? payload.dueDate : ""
  if (typeof text !== "string") throw new Error("Launch text must be a string")
  if (typeof dueDate !== "string") throw new Error("Launch dueDate must be a string")
  return {
    text: text,
    dueDate: dueDate,
    parentId: hasOwn(payload, "parentId") ? normalizeParentId(payload.parentId) : ""
  }
}

function decodeEnvelope(text, label) {
  var value = parseObject(text, label)
  if (value.version !== 1 || hasOwn(value, "error"))
    throw new Error(label + " has an unsupported or unsuccessful envelope")
  return value
}

function decodeCapabilities(text) {
  var value = decodeEnvelope(text, "Capabilities response")
  if (!Array.isArray(value.store_schema_versions) || !Array.isArray(value.features))
    throw new Error("Capabilities response must include schema versions and features")
  var versions = value.store_schema_versions
  for (var index = 0; index < versions.length; index++) {
    var version = versions[index]
    if (typeof version !== "number" || !isFinite(version) || version < 1
        || Math.floor(version) !== version || versions.indexOf(version) !== index)
      throw new Error("Capabilities response contains an invalid schema version")
  }
  for (var index = 0; index < value.features.length; index++) {
    var feature = value.features[index]
    if (typeof feature !== "string" || feature.length === 0
        || value.features.indexOf(feature) !== index)
      throw new Error("Capabilities response contains an invalid feature")
  }
  return value
}

function attachmentFilePath(url) {
  var value = String(url || "")
  // A local drop must identify the actual file, without remote hosts or URL fragments.
  var match = /^file:\/\/(?:localhost)?(\/[^?#]*)$/i.exec(value)
  if (!match) throw new Error("Choose or drop local files only.")
  var path
  try { path = decodeURIComponent(match[1]) }
  catch (error) { throw new Error("The dropped file URL is invalid.") }
  if (!path || path.indexOf("\u0000") >= 0 || path.charAt(path.length - 1) === "/")
    throw new Error("Choose a file, not a folder.")
  return path
}

function localFileUrl(path) {
  var value = String(path || "")
  if (value.charAt(0) !== "/" || value.indexOf("\u0000") >= 0)
    throw new Error("Use an absolute local folder path.")
  return "file://" + value.split("/").map(function(part) { return encodeURIComponent(part) }).join("/")
}

function attachmentSelection(url, size) {
  var path = attachmentFilePath(url)
  if (size !== undefined && (typeof size !== "number" || !isFinite(size) || size < 0
      || Math.floor(size) !== size)) throw new Error("The file size is invalid.")
  if (size > 20 * 1024 * 1024) throw new Error("Attachments must be 20 MiB or smaller.")
  return { path: path, name: path.slice(path.lastIndexOf("/") + 1), size: size === undefined ? null : size }
}

function attachmentSizeLabel(size) {
  if (size === null) return "Size checked when adding"
  if (size < 1024) return size + " B"
  if (size < 1024 * 1024) return (size / 1024).toFixed(1) + " KiB"
  return (size / (1024 * 1024)).toFixed(1) + " MiB"
}

function validateTask(task, compact) {
  if (!isPlainObject(task)) throw new Error("Task response must contain a task object")
  if (typeof task.id !== "string" || normalizeParentId(task.id) !== task.id)
    throw new Error("Task response contains a noncanonical task ID")
  for (var index = 0; index < 3; index++) {
    var key = ["path", "name", "state"][index]
    if (typeof task[key] !== "string" || task[key].trim().length === 0)
      throw new Error("Task response contains an invalid " + key)
  }
  if (typeof task.terminal !== "boolean")
    throw new Error("Task response contains an invalid terminal flag")
  if (!hasOwn(task, "parent")) {
    // Older flat CLIs remain usable for root quick-add, without a capability probe.
    if (compact) throw new Error("Candidate response is missing parent")
    task.parent = null
  } else if (task.parent !== null
      && (typeof task.parent !== "string" || normalizeParentId(task.parent) !== task.parent)) {
    throw new Error("Task response contains a noncanonical parent ID")
  }
  if (compact) {
    var keys = Object.keys(task)
    var allowed = ["id", "path", "name", "state", "terminal", "parent"]
    if (keys.length !== allowed.length || keys.some(function(key) { return allowed.indexOf(key) < 0 }))
      throw new Error("Candidate response must contain compact tasks only")
  }
  return task
}

function decodeTask(text) {
  try {
    return validateTask(decodeEnvelope(text, "Task response").task, false)
  } catch (error) {
    // A zero-exit mutation may have committed despite missing or malformed output.
    // QML must preserve the draft but block retry until the user checks the store.
    error.safeToRetry = false
    throw error
  }
}

function decodeCandidates(text) {
  var value = decodeEnvelope(text, "Candidate response")
  if (!Array.isArray(value.tasks) || value.tasks.length > 25 || typeof value.has_more !== "boolean"
      || (value.has_more && value.tasks.length !== 25))
    throw new Error("Candidate response must contain at most 25 tasks and a valid truncation flag")
  var ids = []
  for (var index = 0; index < value.tasks.length; index++) {
    var task = validateTask(value.tasks[index], true)
    if (ids.indexOf(task.id) >= 0) throw new Error("Candidate response contains duplicate task IDs")
    ids.push(task.id)
  }
  return { tasks: value.tasks, has_more: value.has_more }
}

// Only add-path rejections known to precede publication permit another attempt.
// In particular, validation-kind serialization errors are not blanket-safe:
// response serialization, directory sync, and lock release happen after add.
function isPrewriteMutationError(code, exitCode) {
  switch (exitCode) {
  case 2:
    return ["usage_error", "invalid_root"].indexOf(code) >= 0
  case 3:
    return ["task_not_found", "store_not_found", "project_not_found"].indexOf(code) >= 0
  case 4:
    return code === "ambiguous_store"
  case 5:
    return [
      "invalid_parent_id", "missing_parent_reference", "self_parent_reference", "parent_cycle",
      "attachment_source_invalid", "attachment_too_large", "unsafe_attachment_path", "attachments_disabled",
      "duplicate_task_id", "invalid_task_id", "invalid_task_path", "invalid_name", "unknown_state",
      "invalid_date", "invalid_tag", "duplicate_tag", "invalid_project_slug", "duplicate_project",
      "invalid_recurrence", "invalid_recurrence_mode", "recurrence_requires_due_date",
      "due_date_not_occurrence", "recurrence_requires_mode", "mode_requires_recurrence",
      "completion_date_requires_recurrence", "invalid_config", "invalid_config_utf8",
      "invalid_store_root", "invalid_store_file", "invalid_schema_file", "invalid_managed_path",
      "managed_paths_not_distinct", "managed_directory_missing", "managed_path_symlink",
      "managed_path_not_directory", "invalid_link_prefix", "invalid_state_id", "duplicate_state_id",
      "invalid_state_name", "missing_nonterminal_state", "invalid_default_state", "terminal_default_state",
      "record_too_large", "file_too_large", "invalid_utf8", "utf8_bom_not_allowed", "record_symlink",
      "invalid_record_file", "invalid_path", "path_escape", "nested_project", "invalid_project_path",
      "missing_frontmatter", "missing_frontmatter_delimiter", "duplicate_yaml_key", "invalid_yaml_syntax",
      "invalid_frontmatter_type", "unsafe_yaml_construct", "yaml_too_deep", "yaml_too_complex",
      "invalid_yaml_number", "unsupported_yaml_key", "missing_property", "invalid_property_type",
      "invalid_project_link", "redundant_id_property", "reserved_extra_property"
    ].indexOf(code) >= 0
  case 6:
    return ["concurrent_modification", "unresolved_conflict", "task_id_collision"].indexOf(code) >= 0
  case 7:
    return ["unsupported_schema", "schema_version_mismatch", "unsupported_recurrence"].indexOf(code) >= 0
  default:
    return false
  }
}

function decodeMutationError(stderr, exitCode) {
  var fallback = typeof stderr === "string" ? stderr.trim() : ""
  var result = { message: fallback || "otodo failed without an error message", safeToRetry: false }
  if (!fallback) return result
  var value
  try {
    value = parseObject(fallback, "Error response")
  } catch (error) {
    return result
  }
  if (value.version !== 1 || !isPlainObject(value.error)
      || typeof value.error.code !== "string" || !value.error.code.trim()
      || typeof value.error.message !== "string" || !value.error.message.trim())
    return result
  var detail = value.error
  var message = detail.message + " (" + detail.code + ")"
  if (typeof detail.path === "string" && detail.path) message += "\n" + detail.path
  if (typeof detail.field === "string" && detail.field) message += "\nField: " + detail.field
  result.message = message
  // A mixed success/error envelope or malformed metadata cannot prove no write.
  if (Object.keys(value).some(function(key) { return key !== "version" && key !== "error" })
      || Object.keys(detail).some(function(key) {
        return ["code", "message", "path", "field", "line", "column", "issues", "validation"].indexOf(key) < 0
      })
      || ["path", "field"].some(function(key) {
        return hasOwn(detail, key) && detail[key] !== null && typeof detail[key] !== "string"
      })
      || ["line", "column"].some(function(key) {
        var number = detail[key]
        return hasOwn(detail, key) && number !== null
          && (typeof number !== "number" || !isFinite(number) || number < 1 || Math.floor(number) !== number)
      })
      || (hasOwn(detail, "issues") && (!Array.isArray(detail.issues) || detail.issues.length !== 0))
      || (hasOwn(detail, "validation") && detail.validation !== null))
    return result
  result.safeToRetry = isPrewriteMutationError(detail.code, exitCode)
  return result
}

function decodeError(stderr) {
  return decodeMutationError(stderr).message
}

if (typeof module !== "undefined") {
  module.exports = {
    attachmentFilePath: attachmentFilePath,
    attachmentSelection: attachmentSelection,
    attachmentSizeLabel: attachmentSizeLabel,
    addDays: addDays,
    addMonths: addMonths,
    dateAtNoon: dateAtNoon,
    detectDueDatePhrase: detectDueDatePhrase,
    decodeCandidates: decodeCandidates,
    decodeCapabilities: decodeCapabilities,
    decodeError: decodeError,
    decodeMutationError: decodeMutationError,
    decodeTask: decodeTask,
    keyForDate: keyForDate,
    keyForParts: keyForParts,
    localFileUrl: localFileUrl,
    monthCells: monthCells,
    normalizedWeekStart: normalizedWeekStart,
    normalizeParentId: normalizeParentId,
    parseDateKey: parseDateKey,
    parseLaunchPayload: parseLaunchPayload,
    weekdayOrder: weekdayOrder
  }
}
