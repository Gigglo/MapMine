"""Build the indexed India catalog from the GeoNames IN.zip country dump."""
import argparse
import io
import sqlite3
import zipfile
from pathlib import Path

parser = argparse.ArgumentParser()
parser.add_argument("archive", type=Path)
parser.add_argument("output", type=Path)
args = parser.parse_args()

settlements = {"PPL", "PPLA", "PPLA2", "PPLA3", "PPLA4", "PPLC", "PPLX", "PPLL"}
features = {
    "MUS": "Museum", "MALL": "Shopping centre", "MNMT": "Monument", "HSTS": "Historic site",
    "RUIN": "Ruins", "TMPL": "Temple", "PAL": "Palace", "FT": "Fort", "CAVE": "Cave",
    "PRK": "Park", "PK": "Peak", "RESN": "Nature reserve", "ZOO": "Zoo", "FLLS": "Waterfall", "MT": "Mountain",
    "CH": "Church", "MSQE": "Mosque", "SHRN": "Shrine", "BTL": "Historic site",
    "BCH": "Beach", "GDN": "Garden", "STDM": "Stadium", "AMTH": "Amphitheatre",
}

def rows():
    with zipfile.ZipFile(args.archive) as archive, archive.open("IN.txt") as source:
        for line in io.TextIOWrapper(source, encoding="utf-8"):
            row = line.rstrip("\n").split("\t")
            code = row[7]
            if code not in settlements and code not in features:
                continue
            latitude, longitude = round(float(row[4]), 6), round(float(row[5]), 6)
            if not row[1].strip() or not (6 <= latitude <= 37 and 68 <= longitude <= 98):
                continue
            population = int(row[14] or 0)
            category = features.get(code, "Town or village")
            min_zoom = 11 if code in features or population >= 50_000 or code == "PPLC" else 13
            rank = 1_000_000 if code in features else population
            radius = 110 if code in features else 160
            yield (int(row[0]), row[1], latitude, longitude, category, radius, min_zoom, rank)

args.output.parent.mkdir(parents=True, exist_ok=True)
with sqlite3.connect(args.output) as db:
    db.executescript("""
    CREATE TABLE IF NOT EXISTS landmarks (
      id INTEGER PRIMARY KEY, name TEXT NOT NULL, latitude REAL NOT NULL, longitude REAL NOT NULL,
      category TEXT NOT NULL, radius INTEGER NOT NULL, minZoom INTEGER NOT NULL, rank INTEGER NOT NULL
    );
    DELETE FROM landmarks;
    """)
    db.executemany("INSERT INTO landmarks VALUES(?,?,?,?,?,?,?,?)", rows())
    db.execute("""DELETE FROM landmarks WHERE id NOT IN (
      SELECT id FROM landmarks ORDER BY minZoom, (id * 2654435761) % 4294967296 LIMIT 150000
    )""")
    db.execute("CREATE INDEX IF NOT EXISTS landmarks_view ON landmarks(latitude, longitude)")
    db.execute("CREATE INDEX IF NOT EXISTS landmarks_name ON landmarks(name COLLATE NOCASE)")
    print(db.execute("SELECT count(*), count(DISTINCT category) FROM landmarks").fetchone())
    print(db.execute("SELECT category, count(*) FROM landmarks GROUP BY category ORDER BY count(*) DESC LIMIT 6").fetchall())
    db.commit()
    db.execute("VACUUM")
