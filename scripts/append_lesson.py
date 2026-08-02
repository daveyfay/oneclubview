#!/usr/bin/env python3
"""aar-loop lesson writer.

Appends one structured, dated lesson entry to a LESSONS.md file, in the
4-question AAR shape (expected, actual, why, lesson), so the next session
can grep past lessons before repeating the same mistake. Also lists what is
already recorded, so the same lesson doesn't get written twice with
different wording.

Usage:
    python3 append_lesson.py --lesson "Batch size >100 fails with a timeout; cap writes at 100." \
        --expected "Bulk upload of 500 rows would complete in one call." \
        --actual "Call returned 200 OK but only 100 rows were written." \
        --why "The API caps batch writes at 100 and does not error on a partial write." \
        --tags "api,timeouts"

    python3 append_lesson.py --list                 # print all lessons
    python3 append_lesson.py --list --tag api        # filter by tag

Stdlib only. No install. Default file: ./LESSONS.md (override with --file).
"""
import argparse
import datetime
import pathlib
import re

DEFAULT_FILE = "LESSONS.md"

HEADER = (
    "# Lessons\n\n"
    "Written by /aar-loop after each session's After Action Review. Read this "
    "file before starting a new task in this project. Every entry should be "
    "concrete and checkable, never vague.\n"
)


def load_existing(path):
    if not path.exists():
        return HEADER
    text = path.read_text(encoding="utf-8")
    return text if text.strip() else HEADER


def format_entry(args):
    date = datetime.date.today().isoformat()
    lines = [f"## {date} -- {args.lesson}\n"]
    if args.expected:
        lines.append(f"- Expected: {args.expected}\n")
    if args.actual:
        lines.append(f"- Actual: {args.actual}\n")
    if args.why:
        lines.append(f"- Why: {args.why}\n")
    if args.tags:
        lines.append(f"- tags: {args.tags.strip()}\n")
    return "".join(lines)


def cmd_add(args):
    path = pathlib.Path(args.file)
    existing = load_existing(path)
    entry = format_entry(args)
    path.write_text(existing.rstrip("\n") + "\n\n" + entry, encoding="utf-8")
    print(f"Wrote lesson to {path}:")
    print(entry.strip())


def cmd_list(args):
    path = pathlib.Path(args.file)
    if not path.exists():
        print(f"No lessons file at {path} yet.")
        return
    text = path.read_text(encoding="utf-8")
    entries = re.split(r"\n(?=## )", text)
    shown = 0
    for e in entries:
        e = e.strip()
        if not e.startswith("## "):
            continue
        if args.tag:
            tag_match = re.search(r"tags:\s*(.+)", e, re.IGNORECASE)
            tags = tag_match.group(1).lower() if tag_match else ""
            if args.tag.lower() not in tags:
                continue
        print(e)
        print()
        shown += 1
    if shown == 0:
        print("No matching lessons.")


def main():
    parser = argparse.ArgumentParser(
        description="Append or list dated AAR lessons in a LESSONS.md file."
    )
    parser.add_argument(
        "--file", default=DEFAULT_FILE,
        help="Path to the lessons file (default: ./LESSONS.md)",
    )
    parser.add_argument(
        "--lesson",
        help="The concrete, checkable lesson (question 4: what to do differently)",
    )
    parser.add_argument("--expected", help="Question 1: what was supposed to happen")
    parser.add_argument("--actual", help="Question 2: what actually happened")
    parser.add_argument("--why", help="Question 3: why there was a difference")
    parser.add_argument("--tags", help="Comma-separated tags for later filtering")
    parser.add_argument(
        "--list", action="store_true",
        help="List existing lessons instead of adding one",
    )
    parser.add_argument("--tag", help="With --list, filter to lessons matching this tag")
    args = parser.parse_args()

    if args.list:
        cmd_list(args)
        return

    if not args.lesson:
        parser.error("--lesson is required unless using --list")

    cmd_add(args)


if __name__ == "__main__":
    main()
