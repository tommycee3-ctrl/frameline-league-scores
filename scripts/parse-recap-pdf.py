"""Extract explicit BLS recap markings and point subtotals; never calculate wins."""
import json, re, sys
import pdfplumber

def parse(filename):
    teams = []
    with pdfplumber.open(filename) as pdf:
        for page_index, page in enumerate(pdf.pages):
            for left, right in [(0, page.width / 2), (page.width / 2, page.width)]:
                cropped = page.crop((left, 0, right, page.height)).dedupe_chars()
                header = next((row for row in (cropped.extract_text() or "").splitlines() if row.startswith("Name Avg")), "")
                listed_games = [int(value) for value in re.findall(r"-([1-6])-", header)]
                game_count = max(listed_games, default=3)
                four_games = game_count == 4
                has_handicap = "HDCP" in header
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
                        active = {"team": tokens[2], "lane": tokens[1], "week": tokens[week + 1], "name": " ".join(tokens[4:week]), "matchupKey": f"{page_index}:{round(line[0]['top'])}", "gameCount": game_count, "bowlers": []}
                        teams.append(active)
                        continue
                    if not active: continue
                    def number(v):
                        v = re.sub(r"^(?:bk|[a-z])", "", v, flags=re.I)
                        return v if re.fullmatch(r"\d+(?:\.\d+)?", v) else None
                    def valid_bowler(name, values):
                        return (bool(re.fullmatch(r"[A-Za-z][A-Za-z .,'&-]*", name.strip()))
                                and all(v is not None for v in values)
                                and int(float(values[0])) <= 300
                                and all(int(float(v)) <= 300 for v in values[2:-1])
                                and int(float(values[-1])) <= 1800)
                    if game_count in (1, 2, 5, 6) and not text.startswith(("Scratch Total", "Total", "Handicap", "Team Points", "Match Points")):
                        first = next((i for i, token in enumerate(tokens) if number(token) is not None), None)
                        raw = [number(token) for token in tokens[first:]] if first is not None else []
                        name = " ".join(tokens[:first]) if first is not None else ""
                        minimum = 4 if has_handicap else 3
                        if first is None or len(raw) < minimum or any(value is None for value in raw): continue
                        average = raw[0]
                        handicap = raw[1] if has_handicap else "0"
                        games = raw[2:-2] if has_handicap else raw[1:-1]
                        scratch_series = raw[-2] if has_handicap else raw[-1]
                        handicap_series = raw[-1]
                        if len(games) > game_count: continue
                        values = [average, handicap, *games, *(["0"] * (game_count - len(games))), scratch_series]
                        if not valid_bowler(name, values): continue
                        score_words = line[first + (2 if has_handicap else 1):first + (2 if has_handicap else 1) + len(games)]
                        series_mark = line[-1] if has_handicap else line[-1]
                        active["bowlers"].append({"name": name, "values": values, "handicapSeries": handicap_series, "wins": ["Bold" in word["fontname"] for word in score_words] + [False] * (game_count - len(games)) + ["Bold" in series_mark["fontname"]]})
                    elif four_games and len(tokens) >= 9 and all(number(v) is not None for v in tokens[-8:]) and not text.startswith(("Scratch Total", "Total", "Handicap", "Team Points", "Match Points")):
                        values = [number(v) for v in tokens[-8:]]
                        if not valid_bowler(" ".join(tokens[:-8]), values[:7]): continue
                        active["bowlers"].append({"name": " ".join(tokens[:-8]), "values": values[:7], "handicapSeries": values[7], "wins": ["Bold" in w["fontname"] for w in line[-8:]][2:6] + ["Bold" in line[-1]["fontname"]]})
                    elif len(tokens) >= 8 and all(number(v) is not None for v in tokens[-7:]) and not text.startswith(("Scratch Total", "Total", "Handicap")):
                        values = [number(v) for v in tokens[-7:]]
                        if not valid_bowler(" ".join(tokens[:-7]), values[:6]): continue
                        active["bowlers"].append({"name": " ".join(tokens[:-7]), "values": values[:6], "handicapSeries": values[6], "wins": ["Bold" in w["fontname"] for w in line[-7:]][2:5] + ["Bold" in line[-1]["fontname"]]})
                    elif len(tokens) >= 7 and all(number(v) is not None for v in tokens[-6:]) and not text.startswith(("Scratch Total", "Total", "Handicap", "Team Points", "Match Points")):
                        # Two-game leagues leave the third game column blank.
                        values = [number(v) for v in tokens[-6:]]
                        if not valid_bowler(" ".join(tokens[:-6]), values[:5]): continue
                        active["bowlers"].append({"name": " ".join(tokens[:-6]), "values": [values[0], values[1], values[2], values[3], "0", values[4]], "handicapSeries": values[5], "wins": ["Bold" in line[-4]["fontname"], "Bold" in line[-3]["fontname"], False, "Bold" in line[-1]["fontname"]]})
                    elif len(tokens) >= 6 and all(number(v) is not None for v in tokens[-5:]) and not text.startswith(("Scratch Total", "Total", "Handicap", "Team Points", "Match Points")):
                        # Scratch leagues omit both handicap columns. Normalize
                        # them to the same six values used by the web recap.
                        values = [number(v) for v in tokens[-5:]]
                        if not valid_bowler(" ".join(tokens[:-5]), values): continue
                        active["bowlers"].append({"name": " ".join(tokens[:-5]), "values": [values[0], "0", *values[1:]], "handicapSeries": values[-1], "wins": ["Bold" in w["fontname"] for w in line[-4:]]})
                    elif text.startswith("Scratch Total ") and len(tokens) >= 2 + game_count + 1 and all(number(v) for v in tokens[2:]):
                        active["scratchTotal"] = [number(v) for v in tokens[2:]]
                        active["scratchTotalWins"] = ["Bold" in w["fontname"] for w in line[2:]]
                    elif text.startswith("Total ") and len(tokens) >= 1 + game_count + 1 and all(number(v) for v in tokens[1:]):
                        active["total"] = tokens[1:]
                        active["totalWins"] = ["Bold" in w["fontname"] for w in line[1:-2]] + ["Bold" in line[-1]["fontname"]]
                    else:
                        for label, field in [("Team Points Won", "teamPoints"), ("Match Points Won", "matchPoints"), ("Total Points Won", "points")]:
                            if text.startswith(label + " "):
                                values = [number(v) for v in tokens[3:9]]
                                if len(values) >= 3 and all(v is not None for v in values):
                                    active[field] = values
    for team in teams:
        # A scratch recap has no separate handicap Total row.
        if not team.get("total") and team.get("scratchTotal"):
            team["total"] = list(team["scratchTotal"])
            team["totalWins"] = list(team.get("scratchTotalWins", []))
    # The official sheet's bold cells establish awards. Games are compared
    # with handicap. The printed Match Points totals establish the series
    # value (commonly two points), so league scoring variations remain exact.
    matchups = {}
    for team in teams:
        key = (team.get("week"), team.get("matchupKey") or (int(team["lane"]) + 1) // 2)
        matchups.setdefault(key, []).append(team)
    for pair in matchups.values():
        if len(pair) != 2: continue
        left, right = pair
        for first, second in ((left, right), (right, left)):
            game_count = first.get("gameCount", 3)
            series_winners = sum(1 for bowler in first["bowlers"] if len(bowler["wins"]) > game_count and bowler["wins"][game_count])
            match_points = first.get("matchPoints", [])
            series_pool = (float(match_points[game_count]) - sum(float(value) for value in match_points[:game_count])) if len(match_points) > game_count else series_winners
            series_value = series_pool / series_winners if series_winners else 0
            for position, bowler in enumerate(first["bowlers"]):
                opponent = second["bowlers"][position] if position < len(second["bowlers"]) else None
                points = 0
                for result_index, marked in enumerate(bowler["wins"]):
                    if not marked: continue
                    game_count = len(bowler["values"]) - 3
                    if result_index < game_count:
                        handicap_score = float(bowler["values"][result_index + 2]) + float(bowler["values"][1])
                        opponent_score = (float(opponent["values"][result_index + 2]) + float(opponent["values"][1])) if opponent is not None else None
                        points += .5 if opponent_score == handicap_score else 1
                    else:
                        tied = opponent is not None and bowler["handicapSeries"] == opponent["handicapSeries"]
                        points += series_value / 2 if tied else series_value
                bowler["points"] = points
    if not teams or not any(t.get("total") for t in teams):
        raise ValueError("Unsupported or empty official recap PDF; no results inferred")
    return teams

if __name__ == "__main__":
    print(json.dumps(parse(sys.argv[1])))
