# OTodo quick add

The overlay creates a dated task in the store selected by `otodo.json`. It uses
`bin/otodo-create` and the installed `otodo` CLI; `config.example.json` shows the
store setting. `OTODO_BIN` can select an executable by absolute path and
`OTODO_OMARCHY_CONFIG` can select a separate configuration for testing.

Choose **Attach files…** (Ctrl+O) to browse local folders inside the overlay, or
drop files onto the card. Selections stay with the draft while editing the title,
date, or parent. Remove a selection to exclude it. Escape in the file browser
returns to the previous step and keeps the selections; cancelling the whole draft
does not copy any files. Files must remain available until the todo is added.

Each file may be at most **20 MiB**. The CLI checks all files before publishing
the task, copies their original bytes into `Attachments/<ULID>/<filename>`, and
adds ordinary Markdown links or image embeds. Attachment imports work with store
schemas 1 and 2. The overlay discovers `attachments`, `subtasks`, and
`task_candidates` as independent executable capabilities. It does not activate a
store upgrade. Older CLIs remain usable for ordinary quick add.

If creation cannot be confirmed, the draft is retained and another attempt is
blocked. Check the store before starting a new draft, because a task may already
have been written. Only structured CLI errors that guarantee rejection before
publication permit retry. A failed or interrupted import may leave unreferenced
attachment files; the helper makes one creation command and does not promise
multi-file filesystem atomicity.

Desktop Git synchronization is external to the CLI and must include `Attachments/`
along with tasks. In Obsidian, **Settings → Files and links → Default location for
new attachments → In the folder specified below** can point to the store's
`Attachments` folder (for example `todos/Attachments` from the vault root). This
is a vault-wide preference; the plugin does not change it. Files pasted directly
there can be linked to tasks using explicit paths.

Verification from the repository root:

```sh
node br.otodo/tests/TodoModel.test.js
node br.otodo/tests/TodoBoundary.test.js
node br.otodo/tests/Attachments.test.js
node br.otodo/tests/Attachments.qml.test.js
OTODO_BIN=/absolute/current/otodo node br.otodo/tests/Attachments.helper.test.js
OTODO_BIN=/absolute/current/otodo OTODO_LEGACY_BIN=/absolute/v1/otodo node br.otodo/tests/otodo-create.test.js
```

The QML test requires Quickshell, Qt's FolderListModel module, installed Omarchy
shell components, and a Wayland session. Its window stays hidden. Integration
tests use temporary stores and never write the configured desktop store.
