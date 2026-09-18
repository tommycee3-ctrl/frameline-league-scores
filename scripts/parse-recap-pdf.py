"""Extract explicit BLS recap markings and point subtotals; never calculate wins."""
import json, re, sys
import pdfplumber

def parse(filename):
    teams = []
    with pdfplumber.open(filename) as pdf:
        for page in pdf.pages:
            for left, right in [(0, page.width / 2), (page.width / 2, page.width)]:
                cropped = page.crop((left, 0, right, page.height)).dedupe_chars()
                words = cropped.extract_words(extra_attrs=["fontname"])
                # A long clipped name can touch the following average, including bk book averages.
                expanded = []
                for word in words:
                    raw = word["text"]
                    if re.fullmatch(r"[^0-9]{3,}(?:bk)?\d{2,3}", raw, flags=re.I):
                        # Preserve drawing order when book-average glyphs overlap
                        # the final surname letters; horizontal sorting interleaves them.
                        raw = "".join(c["text"] for c in cropped.chars if abs(c["top"] - word["top"]) < 2 and c["x0"] >= word["x0"] - .1 and c["x1"] <= word["x1"] + .1)
                    merged = re.fullmatch(r"([^0-9]{3,}?)((?:bk)?\d{2,3})", raw, flags=re.I)
                    if merged:
                        expanded.append({**word, "text": merged[1]})
                        expanded.append({**word, "text": merged[2], "x0": word["x1"] - len(merged[2]) * 4.5})
                    else: expanded.append(word)
                words = expanded
                lines = []
                for word in sorted(words, key=lambda w: (w["top"], w["x0"])):
                    line = next((line for line in reversed(lines[-3:]) if abs(line[0]["top"] - word["top"]) < 2), None)
                    if line is None:
                        line = []; lines.append(line)
                    line.append(word)
                active = None
                for line in lines:
                    line.sort(key=lambda w: w["x0"])
                    tokens = [w["text"] for w in line]
                    text = " ".join(tokens)
                    if len(tokens) > 5 and tokens[0] == "Lane" and "Week" in tokens and "-" in tokens:
                        dash, week = tokens.index("-"), tokens.index("Week")
                        if dash != 3 or not tokens[1].isdigit() or not tokens[2].isdigit():
                            active = None; continue
                        active = {"team": tokens[2], "lane": tokens[1], "week": tokens[week + 1], "name": " ".join(tokens[4:week]), "bowlers": []}
                        teams.append(active)
                        continue
                    if not active: continue
                    def number(v):
                        v = re.sub(r"^(?:bk|[abp])", "", v, flags=re.I)
                        return v if re.fullmatch(r"\d+(?:\.\d+)?", v) else None
                    if len(tokens) >= 8 and all(number(v) is not None for v in tokens[-7:]) and not text.startswith(("Scratch Total", "Total", "Handicap")):
                        values = [number(v) for v in tokens[-7:]]
                        active["bowlers"].append({"name": " ".join(tokens[:-7]), "values": values[:6], "handicapSeries": values[6], "wins": ["Bold" in w["fontname"] for w in line[-7:]][2:5] + ["Bold" in line[-1]["fontname"]]})
                    elif len(tokens) >= 6 and all(number(v) is not None for v in tokens[-5:]) and not text.startswith(("Scratch Total", "Total", "Handicap", "Team Points", "Match Points")):
                        # Scratch leagues omit both handicap columns. Normalize
                        # them to the same six values used by the web recap.
                        values = [number(v) for v in tokens[-5:]]
                        active["bowlers"].append({"name": " ".join(tokens[:-5]), "values": [values[0], "0", *values[1:]], "handicapSeries": values[-1], "wins": ["Bold" in w["fontname"] for w in line[-4:]]})
                    elif text.startswith("Scratch Total ") and len(tokens) in (6, 7) and all(number(v) for v in tokens[2:]):
                        active["scratchTotal"] = [number(v) for v in tokens[2:]]
                        active["scratchTotalWins"] = ["Bold" in w["fontname"] for w in line[2:]]
                    elif text.startswith("Total ") and len(tokens) == 6 and all(number(v) for v in tokens[1:]):
                        active["total"] = tokens[1:]
                        active["totalWins"] = ["Bold" in w["fontname"] for w in line[1:4]] + ["Bold" in line[-1]["fontname"]]
                    else:
                        for label, field in [("Team Points Won", "teamPoints"), ("Match Points Won", "matchPoints"), ("Total Points Won", "points")]:
                            if text.startswith(label + " ") and len(tokens) in (7, 8) and all(number(v) for v in tokens[3:]):
                                active[field] = [number(v) for v in tokens[3:]]
    for team in teams:
        # A scratch recap has no separate handicap Total row.
        if not team.get("total") and team.get("scratchTotal"):
            team["total"] = list(team["scratchTotal"])
            team["totalWins"] = list(team.get("scratchTotalWins", []))
    # The official sheet's bold cells establish awards. A marked score tied
    # with the opposing position is worth half; every other marked cell is one.
    matchups = {}
    for team in teams:
        key = (team.get("week"), (int(team["lane"]) + 1) // 2)
        matchups.setdefault(key, []).append(team)
    for pair in matchups.values():
        if len(pair) != 2: continue
        left, right = pair
        for first, second in ((left, right), (right, left)):
            for position, bowler in enumerate(first["bowlers"]):
                opponent = second["bowlers"][position] if position < len(second["bowlers"]) else None
                points = 0
                for result_index, marked in enumerate(bowler["wins"]):
                    if not marked: continue
                    value_index = result_index + 2 if result_index < 3 else 5
                    tied = opponent is not None and bowler["values"][value_index] == opponent["values"][value_index]
                    points += .5 if tied else 1
                bowler["points"] = points
    if not teams or not any(t.get("total") for t in teams):
        raise ValueError("Unsupported or empty official recap PDF; no results inferred")
    return teams

if __name__ == "__main__":
    print(json.dumps(parse(sys.argv[1])))
