import csv
import io
import json
import urllib.request
from collections import defaultdict
from pathlib import Path

import zstandard

ROOT = Path(__file__).resolve().parent.parent
CACHE = ROOT / ".cache"
SOURCE = CACHE / "lichess_db_puzzle.csv.zst"
OUTPUT = ROOT / "public" / "puzzles" / "puzzles.json"
URL = "https://database.lichess.org/lichess_db_puzzle.csv.zst"

TARGETS = [
    "fork", "pin", "skewer", "xRayAttack", "discoveredAttack",
    "doubleCheck", "backRankMate", "smotheredMate", "arabianMate",
    "anastasiaMate", "bodensMate", "damianoMate", "grecoMate",
    "legalMate", "suffocationMate", "epauletteMate", "hookMate",
    "capturingDefender", "deflection", "attraction", "clearance",
    "interference", "overloading", "hangingPiece", "trappedPiece",
    "sacrifice", "promotion", "underPromotion", "enPassant",
    "zwischenzug", "zugzwang", "mateIn1", "mateIn2", "mateIn3",
    "mateIn4", "mateIn5", "advancedPawn", "exposedKing",
    "kingsideAttack", "queensideAttack", "attackingF2F7",
    "quietMove", "defensiveMove", "perpetualCheck", "castling",
    "pawnEndgame", "rookEndgame", "bishopEndgame", "knightEndgame",
    "queenEndgame", "queenRookEndgame", "pawnlessEndgame",
    "connectedPawns", "opposition", "fortress"
]

BANDS = [ (600, 900), (900, 1200), (1200, 1500), (1500, 1800), (1800, 2100), (2100, 2400) ]
PER_BAND = 18
MIN_POPULARITY = 78
MIN_PLAYS = 120
MAX_DEVIATION = 100


def download():
    if SOURCE.exists():
        return

    CACHE.mkdir(parents=True, exist_ok=True)
    print(f"downloading {URL}")
    urllib.request.urlretrieve(URL, SOURCE)


def build():
    download()

    selected = {}
    by_game = set()
    buckets = defaultdict(list)
    source = zstandard.ZstdDecompressor().stream_reader(open(SOURCE, "rb"))
    reader = csv.DictReader(io.TextIOWrapper(source, encoding="utf-8"))

    for row in reader:
        try:
            rating = int(row["Rating"])
            popularity = int(row["Popularity"])
            plays = int(row["NbPlays"])
            deviation = int(row["RatingDeviation"])
        except (KeyError, TypeError, ValueError):
            continue

        if rating < 600 or rating >= 2400:
            continue
        if popularity < MIN_POPULARITY or plays < MIN_PLAYS or deviation > MAX_DEVIATION:
            continue

        themes = row["Themes"].split()
        useful = [ theme for theme in themes if theme in TARGETS ]
        if not useful:
            continue

        game = row["GameUrl"].split("#")[0]
        if game in by_game:
            continue

        moves = row["Moves"].split()
        if len(moves) < 2:
            continue

        quality = popularity * 1000 + min(plays, 50000) - deviation
        puzzle = {
            "id": row["PuzzleId"],
            "fen": row["FEN"],
            "moves": moves,
            "rating": rating,
            "themes": useful,
            "popularity": popularity,
            "plays": plays,
            "url": game,
            "opening": row["OpeningTags"].split()[0] if row["OpeningTags"] else ""
        }

        for theme in useful:
            for low, high in BANDS:
                if low <= rating < high:
                    buckets[(theme, low)].append((quality, puzzle))
                    break

    for key, entries in buckets.items():
        entries.sort(key=lambda item: item[0], reverse=True)
        theme, _ = key

        count = 0
        for _, puzzle in entries:
            if count >= PER_BAND:
                break
            if puzzle["id"] in selected:
                continue
            if puzzle["url"] in by_game:
                continue

            selected[puzzle["id"]] = puzzle
            by_game.add(puzzle["url"])
            count += 1

    items = sorted(selected.values(), key=lambda item: (item["rating"], item["id"]))

    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    with open(OUTPUT, "w", encoding="utf-8", newline="\n") as output:
        json.dump({ "source": "Lichess puzzle database", "items": items }, output, separators=(",", ":"))

    print(f"wrote {len(items)} puzzles, {OUTPUT.stat().st_size} bytes")


if __name__ == "__main__":
    build()
