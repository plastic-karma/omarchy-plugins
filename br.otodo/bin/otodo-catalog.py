#!/usr/bin/env python3
"""Read CLI catalogs and TOML workflow without publishing partial results."""

import json
import subprocess
import sys
import tomllib


def cli_json(cli, root, *arguments):
    result = subprocess.run(
        [cli, "--root", root, "--format", "json", *arguments],
        stdout=subprocess.PIPE,
        check=False,
    )
    if result.returncode:
        # stderr belongs to the CLI; do not replace its structured error.
        raise SystemExit(result.returncode if result.returncode > 0 else 128 - result.returncode)
    envelope = json.loads(result.stdout)
    if not isinstance(envelope, dict) or type(envelope.get("version")) is not int or envelope["version"] != 1:
        raise ValueError("expected a version-1 CLI envelope")
    return envelope


def catalog(cli, root):
    location = cli_json(cli, root, "root")
    with open(location["config"], "rb") as source:
        config = tomllib.load(source)
    projects = cli_json(cli, root, "project", "list")["projects"]
    tasks = cli_json(cli, root, "list", "--all")["tasks"]
    states = config["states"]
    if not all(isinstance(items, list) for items in (projects, tasks, states)):
        raise ValueError("expected project, task, and workflow arrays")
    if not isinstance(config["default_state"], str) or not config["default_state"]:
        raise ValueError("expected a default workflow state")
    for project in projects:
        if not isinstance(project, dict) or not all(isinstance(project.get(key), str) and project[key] for key in ("slug", "name")):
            raise ValueError("invalid project catalog entry")
    for state in states:
        if not isinstance(state, dict) or not all(isinstance(state.get(key), str) and state[key] for key in ("id", "name")) or type(state.get("terminal")) is not bool:
            raise ValueError("invalid workflow catalog entry")
    tags = set()
    for task in tasks:
        if not isinstance(task, dict) or not isinstance(task.get("tags"), list) or not all(isinstance(tag, str) and tag for tag in task["tags"]):
            raise ValueError("invalid task tags in catalog")
        tags.update(task["tags"])
    return {
        "version": 1,
        "catalog": {
            "projects": [{"slug": project["slug"], "name": project["name"]} for project in projects],
            "tags": sorted(tags),
            "states": [{"id": state["id"], "name": state["name"], "terminal": state["terminal"]} for state in states],
            "default_state": config["default_state"],
        },
    }


if __name__ == "__main__":
    if len(sys.argv) != 3:
        sys.exit("otodo-create: catalog adapter requires CLI and store root")
    try:
        result = catalog(sys.argv[1], sys.argv[2])
    except (OSError, ValueError, KeyError, TypeError) as error:
        sys.exit(f"otodo-create: cannot read catalog: {error}")
    print(json.dumps(result, ensure_ascii=False))
