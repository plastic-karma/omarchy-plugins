# OTodo input

Version 2.0 replaces the title/date wizard with a persistent, keyboard-first
prompt. Open the overlay, type a task, and press **Enter**. A successful save
clears the line and keeps focus ready for the next todo. **Esc** closes it.
There is no date picker and undated tasks stay undated.

```text
Call Plumber tom 9am #personal @chores !active
Read design notes #work @reading
/list #personal @chores !active due:tomorrow
```

The first line saves `Call Plumber`, due tomorrow at 09:00, in project
`personal`, tagged `chores`, with state `active`. Metadata is previewed while
typing. `#project` must name an existing project; `@tag` may be new or nested
(for example `@home/chores`). Repeated projects/tags are deduplicated.
`!state` selects one configured workflow state; omit it to use the store default.
Unlike the reference CLI's task capture, this overlay recognizes `!state` in
new todos as well as `/list` filters.

Natural dates/times follow `otodo input`: `today`, `tod`, `tomorrow`, `tom`,
weekdays, `next week`, `next month`, `in 3 days`, `in 2 hours`, `9am`, and
`at 14:30`. The last date and time win independently. Contributing phrases
are removed from the title; links, email addresses, paths, and metadata are
protected. The first explicit HTTP(S) link is also stored as the task URL.

## Commands and keys

- `/list [#project @tag !state due:today|tomorrow|overdue|none]` queries tasks,
  including terminal tasks unless filtered. PgUp/PgDn scroll results.
  Successful captures and syncs clear previous list results.
- `/sync [ours|theirs]` explicitly synchronizes the existing Git branch with
  its upstream through the CLI. It can commit and push changes across that
  branch. Conflicts without a policy are reported inline; no sync runs
  automatically. Any failed, interrupted, or unconfirmed sync pauses the session:
  inspect the repository, then close and reopen the prompt before continuing.
  This follows the noninteractive CLI's stop-on-failure rule rather than retrying
  a command that may already have committed or pushed.
- `/parent` or Ctrl+P opens optional parent selection for the next todo.
- `/attach` or Ctrl+O opens the optional local file browser.
- `/help` shows syntax, `/clear` clears displayed results, `/quit` closes.
- Tab accepts a completion. Up/Down selects suggestions, or recalls successful
  session entries when no suggestions are active. Once browsing history,
  arrows stay in history; Down past the newest restores the draft and cursor.
  Shift-Tab cycles suggestions in either mode. F5 reloads projects, tags, and
  workflow states from disk, including unused states and terminal-task tags.
- Ctrl-U clears the line. Esc/Ctrl-C closes; Ctrl-D closes an empty prompt.
  Multiline clipboard paste queues nonblank drafts for one Enter per save.
  Tabs become spaces; oversized or control-character pastes leave the draft intact.
  Enter on a cleared draft advances to the next queued line without saving.

Attachments can also be dropped onto the card. Selections and parent intent
survive optional picker navigation and failed captures. A confirmed save clears
both for the next todo. Escape in a picker returns to the input; cancelling the
whole draft does not copy files. Files must remain available until submission.
Each attachment may be at most **20 MiB**. The CLI validates files before
publication, copies them into `Attachments/<ULID>/<filename>`, and adds ordinary
Markdown links or image embeds. Imports work with store schemas 1 and 2;
parents require schema 2. The plugin never upgrades a store implicitly.

## Configuration and safety

The overlay uses `bin/otodo-create` and the installed `otodo` CLI with the store
selected by `otodo.json`; `config.example.json` shows the setting. Dependencies:
Bash, jq, and Python 3.11+ (stdlib TOML parsing for completion catalogs).
Use a current `otodo`; `/list` needs `task_input`, and `/sync` also needs
`git_sync`, Git, and a configured upstream. `OTODO_BIN` selects an executable
by absolute path; `OTODO_OMARCHY_CONFIG` selects a separate plugin configuration.
The existing launch payload fields `text`, `dueDate`, and `parentId` still work.
An explicit launch date applies only to the first capture, unless typed date
metadata overrides it.

If creation cannot be confirmed, the draft is retained and another attempt is
blocked. Check the store before starting a new draft, because a task may already
have been written. Only structured CLI errors that guarantee rejection before
publication permit retry. A failed or interrupted import may leave unreferenced
attachment files; the helper makes one creation command and does not promise
multi-file filesystem atomicity.

Synchronization must include `Attachments/` along with tasks. In Obsidian,
**Settings → Files and links → Default location for new attachments → In the
folder specified below** can point to the store's `Attachments` folder (for
example `todos/Attachments` from the vault root). This is a vault-wide preference;
the plugin does not change it. Files pasted there can be linked with explicit paths.

Verification from the repository root:

```sh
node br.otodo/tests/TodoModel.test.js
node br.otodo/tests/TodoBoundary.test.js
node br.otodo/tests/Attachments.test.js
node br.otodo/tests/Attachments.qml.test.js
OTODO_BIN=/absolute/current/otodo node br.otodo/tests/Input.qml.test.js
OTODO_BIN=/absolute/current/otodo node br.otodo/tests/Attachments.helper.test.js
OTODO_BIN=/absolute/current/otodo node br.otodo/tests/otodo-create.test.js
```

Set `OTODO_LEGACY_BIN=/absolute/v1/otodo` on the last command for optional
historical CLI coverage. The QML check requires Quickshell, Qt's FolderListModel
module, installed Omarchy shell components, and a Wayland session; its window
stays hidden and its clipboard fixture does not replace the desktop clipboard.
Integration checks use temporary stores and a private local Git remote, never the
configured desktop store.
