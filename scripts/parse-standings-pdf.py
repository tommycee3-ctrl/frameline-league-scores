"""Read the published BLS team standings when the interactive API is unavailable."""
import json, re, sys
import pdfplumber

def number(value):
    value = value.replace("½", ".5").replace("�", ".5")
    return value if re.fullmatch(r"\d+(?:\.\d+)?", value) else None

def parse(filename):
    with pdfplumber.open(filename) as pdf:
        page = pdf.pages[0]
        text = page.extract_text() or ""
    lines = text.splitlines()
    period = re.search(r"(\d{1,2}/\d{1,2}/\d{4})\s+Week\s+(\d+)\s+of\s+(\d+)", text)
    if period and text.count("Place # Team Name Won Lost %Won HDCP HDCP") >= 2:
        teams = []
        for left, right in ((0, page.width / 2), (page.width / 2, page.width)):
            half = page.crop((left, 0, right, page.height)).extract_text() or ""
            active = False
            for line in half.splitlines():
                if line.startswith("Place # Team Name Won Lost %Won HDCP HDCP"):
                    active = True
                    continue
                if active and (line.startswith("Review") or line.startswith("HDCP HDCP")):
                    break
                tokens = line.split()
                if not active or len(tokens) < 7 or not tokens[0].isdigit() or not tokens[1].isdigit():
                    continue
                width = 5 if all(number(v) is not None for v in tokens[-5:]) else 4
                values = [number(v) for v in tokens[-width:]]
                if any(value is None for value in values):
                    continue
                teams.append({"place": tokens[0], "lane": None, "team": tokens[1],
                              "printedName": " ".join(tokens[2:-width]), "won": values[0], "lost": values[1],
                              "avg": None, "scratchPins": None, "hsg": None, "hss": None})
        if teams and len({team["team"] for team in teams}) == len(teams):
            return {"date": period[1], "reportWeek": period[2], "teams": teams}
    heading = next((i for i, line in enumerate(lines) if line.startswith("Team Standings")), None)
    if not period or heading is None:
        raise ValueError("No recognizable team standings in official PDF")
    start = heading + 1
    stop = next((i for i in range(start, len(lines)) if lines[i].startswith(("Review of Last Week", "Lane Assignments", "Last Week's Top Scores", "Season High Scores"))), len(lines))
    header = " ".join(lines[start:min(start + 3, stop)])
    split_parts = "1st Part" in header or "2nd Part" in header
    divisions = lines[heading].startswith("Team Standings In Each Division")
    no_lane = "Place # Team Name" in header and "Place Lane # Team Name" not in header
    year_to_date = "Y-T-D" in header or "Year-To-Date" in header
    width = 10 if no_lane and split_parts else (9 if no_lane and year_to_date else (14 if divisions and split_parts else (12 if split_parts else 10)))
    teams = []
    for line in lines[start:stop]:
        tokens = line.split()
        if no_lane and len(tokens) >= 4 and tokens[0].isdigit() and tokens[1].isdigit() and tokens[2].upper() == "BYE":
            teams.append({"place": tokens[0], "lane": None, "team": tokens[1], "printedName": "BYE",
                          "won": "0", "lost": number(tokens[4]) if len(tokens) > 4 else None,
                          "avg": None, "scratchPins": "0", "hsg": None, "hss": None})
            continue
        prefix = 2 if no_lane else 3
        if len(tokens) < width + prefix + 1 or not all(token.isdigit() for token in tokens[:prefix]):
            continue
        tail = [number(token) for token in tokens[-width:]]
        if any(value is None for value in tail):
            continue
        name = " ".join(tokens[prefix:-width])
        if not name:
            continue
        if no_lane and split_parts:
            won, lost, avg, scratch_pins, hsg, hss = tail[-6], None, None, None, tail[-4], tail[-3]
        elif no_lane and year_to_date:
            won, lost, avg, scratch_pins, hsg, hss = tail[-5], tail[-4], None, tail[-2], None, None
        elif divisions and split_parts:
            won, lost, avg, scratch_pins, hsg, hss = tail[0], tail[1], tail[2], tail[5], tail[6], tail[7]
        elif split_parts:
            won, avg, scratch_pins, hsg, hss = tail[0], tail[4], tail[7], tail[8], tail[9]
            lost = None
        else:
            won, lost, avg, scratch_pins, hsg, hss = tail[0], tail[1], tail[2], tail[5], tail[6], tail[7]
        teams.append({"place": tokens[0], "lane": None if no_lane else tokens[1], "team": tokens[1] if no_lane else tokens[2], "printedName": name,
                      "won": won, "lost": lost, "avg": avg, "scratchPins": scratch_pins,
                      "hsg": hsg, "hss": hss})
    if not teams or len({team["team"] for team in teams}) != len(teams):
        raise ValueError("Official PDF team standings are incomplete or duplicated")
    return {"date": period[1], "reportWeek": period[2], "teams": teams}

if __name__ == "__main__":
    print(json.dumps(parse(sys.argv[1])))
