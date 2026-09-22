"""Read the published BLS team standings when the interactive API is unavailable."""
import json, re, sys
import pdfplumber

def number(value):
    value = value.replace("½", ".5").replace("�", ".5")
    return value if re.fullmatch(r"\d+(?:\.\d+)?", value) else None

def parse(filename):
    with pdfplumber.open(filename) as pdf:
        text = pdf.pages[0].extract_text() or ""
    lines = text.splitlines()
    period = re.search(r"(\d{1,2}/\d{1,2}/\d{4})\s+Week\s+(\d+)\s+of\s+(\d+)", text)
    if not period or "Team Standings" not in lines:
        raise ValueError("No recognizable team standings in official PDF")
    start = lines.index("Team Standings") + 1
    stop = next((i for i in range(start, len(lines)) if lines[i].startswith(("Review of Last Week", "Lane Assignments", "Last Week's Top Scores", "Season High Scores"))), len(lines))
    header = " ".join(lines[start:min(start + 3, stop)])
    split_parts = "1st Part" in header or "2nd Part" in header
    width = 12 if split_parts else 10
    teams = []
    for line in lines[start:stop]:
        tokens = line.split()
        if len(tokens) < width + 4 or not all(token.isdigit() for token in tokens[:3]):
            continue
        tail = [number(token) for token in tokens[-width:]]
        if any(value is None for value in tail):
            continue
        name = " ".join(tokens[3:-width])
        if not name:
            continue
        if split_parts:
            won, avg, scratch_pins, hsg, hss = tail[0], tail[4], tail[7], tail[8], tail[9]
            lost = None
        else:
            won, lost, avg, scratch_pins, hsg, hss = tail[0], tail[1], tail[2], tail[5], tail[6], tail[7]
        teams.append({"place": tokens[0], "lane": tokens[1], "team": tokens[2], "printedName": name,
                      "won": won, "lost": lost, "avg": avg, "scratchPins": scratch_pins,
                      "hsg": hsg, "hss": hss})
    if not teams or len({team["team"] for team in teams}) != len(teams):
        raise ValueError("Official PDF team standings are incomplete or duplicated")
    return {"date": period[1], "reportWeek": period[2], "teams": teams}

if __name__ == "__main__":
    print(json.dumps(parse(sys.argv[1])))
