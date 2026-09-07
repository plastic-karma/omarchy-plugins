"use strict"
const assert = require("node:assert/strict")
const model = require("../TodoModel.js")
const limit = 20 * 1024 * 1024
const name = "/tmp/日本語 space '$() ` & #?% receipt.pdf"
assert.equal(model.attachmentFilePath(model.localFileUrl(name)), name)
assert.equal(model.attachmentFilePath("file://localhost/tmp/%E2%98%83.png"), "/tmp/☃.png")
assert.equal(model.attachmentSelection(model.localFileUrl(name), limit).size, limit)
assert.equal(model.attachmentSelection(model.localFileUrl(name)).size, null)
assert.equal(model.attachmentSelection("file:///tmp/empty", 0).size, 0)
assert.throws(() => model.attachmentSelection("file:///tmp/large", limit + 1), /20 MiB/)
for (const invalid of ["https://example.com/file", "file://remote/tmp/file", "/tmp/file", "file:///tmp/a#b", "file:///tmp/a?b", "file:///tmp/%00", "file:///tmp/%FF", "file:///tmp/", "file:///", "file:///tmp/%2f", ""]) {
  assert.throws(() => model.attachmentFilePath(invalid), Error)
}
for (const invalid of [-1, NaN, Infinity, 1.5, "100"])
  assert.throws(() => model.attachmentSelection("file:///tmp/file", invalid), Error)
for (const invalid of ["tmp", "https://example.com", "", "/tmp/\0"])
  assert.throws(() => model.localFileUrl(invalid), Error)
assert.equal(model.localFileUrl("/"), "file:///")
assert.equal(model.attachmentSizeLabel(0), "0 B")
assert.equal(model.attachmentSizeLabel(1024), "1.0 KiB")
assert.equal(model.attachmentSizeLabel(limit), "20.0 MiB")
const capability = model.decodeCapabilities('{"version":1,"store_schema_versions":[1],"features":["attachments"]}')
assert.deepEqual(capability.features, ["attachments"])
for (const code of ["attachment_source_invalid", "attachment_too_large", "unsafe_attachment_path", "attachments_disabled"]) {
  const envelope = JSON.stringify({ version: 1, error: { code, message: "Cannot import" } })
  assert.equal(model.decodeMutationError(envelope, 5).safeToRetry, true)
  assert.equal(model.decodeMutationError(envelope, 8).safeToRetry, false)
}
console.log("Attachment URL, boundary and retry tests passed")
