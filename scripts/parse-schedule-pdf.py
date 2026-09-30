import json
import re
import sys

import pdfplumber


pdf_file, requested_week = sys.argv[1], int(sys.argv[2])
with pdfplumber.open(pdf_file) as pdf:
    text = "\n".join(page.extract_text() or "" for page in pdf.pages)

assignment_text = text.split("Lane Assignments", 1)[-1]
lines = [re.sub(r"\s+", " ", line).strip() for line in assignment_text.splitlines()]
week_pattern = re.compile(rf"^Wk0*{requested_week}\s+\d{{2}}/\d{{2}}\s+(.*)$", re.I)
week_line = next((match.group(1) for line in lines if (match := week_pattern.match(line))), None)
if not week_line:
    raise SystemExit(f"Week {requested_week} was not found in the official schedule")

pairs = [(int(left), int(right)) for left, right in re.findall(r"(\d+)\s*-\s*(\d+)", week_line)]
if not pairs:
    raise SystemExit(f"Week {requested_week} contains no lane matchups")

header_pairs = []
for line in lines:
    if line.lower().startswith("wk"):
        break
    found = [(int(left), int(right)) for left, right in re.findall(r"(\d+)\s*-\s*(\d+)", line)]
    if len(found) >= len(pairs):
        header_pairs = found[:len(pairs)]
        break
if len(header_pairs) != len(pairs):
    header_pairs = [(index * 2 + 1, index * 2 + 2) for index in range(len(pairs))]

rows = []
for lanes, teams in zip(header_pairs, pairs):
    rows.extend(([str(lanes[0]), str(teams[0])], [str(lanes[1]), str(teams[1])]))

print(json.dumps({"week": str(requested_week), "rows": rows}))
