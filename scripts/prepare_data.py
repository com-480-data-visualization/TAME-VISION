"""
TAME-VISION — preprocess Kaggle F1 CSVs into small JSON files for the site.

Usage:
    python scripts/prepare_data.py

Expects raw CSVs at data/raw/ :
    circuits.csv, races.csv, drivers.csv, constructors.csv,
    results.csv, driver_standings.csv, constructor_standings.csv,
    pit_stops.csv, lap_times.csv, qualifying.csv, status.csv, ...

Writes output JSON to data/ :
    circuits.json, top_drivers.json, constructor_share.json,
    season_standings.json, pit_strategy.json
"""

import json
from pathlib import Path
import pandas as pd

ROOT = Path(__file__).resolve().parent.parent
RAW = ROOT / "data" / "raw"
OUT = ROOT / "data"
OUT.mkdir(parents=True, exist_ok=True)


def load(name: str) -> pd.DataFrame:
    path = RAW / name
    if not path.exists():
        raise FileNotFoundError(f"Missing {path}. Put Kaggle F1 CSVs in data/raw/.")
    return pd.read_csv(path, na_values=r"\N")


def save(obj, filename: str) -> None:
    (OUT / filename).write_text(json.dumps(obj, ensure_ascii=False, separators=(",", ":")))
    print(f"  wrote data/{filename}")


# ---------- Viz 1: circuits ----------
def build_circuits():
    circuits = load("circuits.csv")
    races = load("races.csv")
    counts = races.groupby("circuitId").size().rename("race_count")
    df = circuits.merge(counts, on="circuitId", how="left").fillna({"race_count": 0})
    out = [
        {
            "id": int(r["circuitId"]),
            "name": r["name"],
            "location": r.get("location", "") or "",
            "country": r["country"],
            "lat": float(r["lat"]),
            "lng": float(r["lng"]),
            "race_count": int(r["race_count"]),
        }
        for r in df.to_dict(orient="records")
    ]
    save(out, "circuits.json")


# ---------- Viz 2: top drivers by wins ----------
def build_top_drivers():
    results = load("results.csv")
    drivers = load("drivers.csv")
    wins = results[results["positionOrder"] == 1].groupby("driverId").size().rename("wins")
    merged = drivers.merge(wins, on="driverId", how="inner").sort_values("wins", ascending=False)
    out = [
        {
            "id": int(r["driverId"]),
            "name": f"{r['forename']} {r['surname']}",
            "nationality": r["nationality"],
            "wins": int(r["wins"]),
        }
        for r in merged.to_dict(orient="records")
    ]
    save(out, "top_drivers.json")


# ---------- Viz 3: constructor points share per season ----------
def build_constructor_share(top_n: int = 6):
    cs = load("constructor_standings.csv")
    races = load("races.csv")[["raceId", "year", "round"]]
    constructors = load("constructors.csv")[["constructorId", "name"]]

    merged = cs.merge(races, on="raceId").merge(constructors, on="constructorId")
    # Final standings per (year, constructor) = max round
    idx = merged.groupby(["year", "constructorId"])["round"].idxmax()
    final = merged.loc[idx, ["year", "name", "points"]]

    # Identify top N constructors by total points across history
    totals = final.groupby("name")["points"].sum().sort_values(ascending=False)
    top_names = list(totals.head(top_n).index)

    final["bucket"] = final["name"].where(final["name"].isin(top_names), "Others")
    pivot = final.groupby(["year", "bucket"])["points"].sum().unstack(fill_value=0)

    keys = top_names + ["Others"]
    for k in keys:
        if k not in pivot.columns:
            pivot[k] = 0
    pivot = pivot[keys].sort_index()

    years = [{"year": int(y), **{k: float(pivot.loc[y, k]) for k in keys}} for y in pivot.index]
    save({"keys": keys, "years": years}, "constructor_share.json")


# ---------- Viz 4: season standings after each race ----------
def build_season_standings():
    ds = load("driver_standings.csv")
    races = load("races.csv")[["raceId", "year", "round", "name"]]
    drivers = load("drivers.csv")[["driverId", "code", "surname"]]

    merged = ds.merge(races, on="raceId").merge(drivers, on="driverId")
    merged["driver"] = merged["code"].fillna(merged["surname"].str[:3].str.upper())

    out = {}
    for year, y_df in merged.groupby("year"):
        races_out = []
        for (rnd, name), r_df in y_df.groupby(["round", "name"], sort=True):
            standings = (
                r_df.sort_values("position")
                .assign(points=lambda x: x["points"].astype(float))
                [["driver", "points"]]
                .to_dict(orient="records")
            )
            races_out.append({"round": int(rnd), "name": name, "standings": standings})
        races_out.sort(key=lambda x: x["round"])
        out[str(int(year))] = {"races": races_out}
    save(out, "season_standings.json")


# ---------- Viz 5: pit strategy (recent races) ----------
def build_pit_strategy():
    pit = load("pit_stops.csv")
    laps = load("lap_times.csv")
    races = load("races.csv")[["raceId", "year", "name", "round"]]
    drivers = load("drivers.csv")[["driverId", "code", "surname"]]

    # Keep every race that has lap_times data (Ergast: 1996+).
    race_ids = set(laps["raceId"].unique())
    recent_races = races[races["raceId"].isin(race_ids)].sort_values(
        ["year", "round"], ascending=[False, False]
    )

    pit = pit[pit["raceId"].isin(race_ids)]
    laps = laps[laps["raceId"].isin(race_ids)]

    out_races = []
    for _, race in recent_races.iterrows():
        rid = race["raceId"]
        r_laps = laps[laps["raceId"] == rid]
        r_pit = pit[pit["raceId"] == rid].sort_values(["driverId", "lap"])
        if r_laps.empty:
            continue
        max_lap = int(r_laps["lap"].max())

        driver_rows = []
        for did, dlaps in r_laps.groupby("driverId"):
            drv_info = drivers[drivers["driverId"] == did].iloc[0]
            code = drv_info["code"] if pd.notna(drv_info["code"]) else drv_info["surname"][:3].upper()
            last_lap = int(dlaps["lap"].max())
            stops = sorted(int(x) for x in r_pit[r_pit["driverId"] == did]["lap"].tolist())

            # Build stints: [1..stop1],[stop1+1..stop2],...,[lastStop+1..lastLap]
            stints = []
            compounds = ["MEDIUM", "HARD", "SOFT", "MEDIUM", "HARD"]  # placeholder — Ergast lacks compound
            boundaries = [1] + [s + 1 for s in stops] + [last_lap + 1]
            for i in range(len(boundaries) - 1):
                start, end = boundaries[i], boundaries[i + 1] - 1
                if end < start:
                    continue
                stints.append({
                    "startLap": start,
                    "endLap": end,
                    "compound": compounds[i % len(compounds)],
                })

            driver_rows.append({"code": code, "stints": stints, "stops": stops})

        driver_rows.sort(key=lambda d: d["code"])
        out_races.append({
            "raceId": int(rid),
            "year": int(race["year"]),
            "name": race["name"],
            "maxLap": max_lap,
            "drivers": driver_rows,
        })

    out_races.sort(key=lambda r: (r["year"], r["name"]), reverse=True)
    save({"races": out_races}, "pit_strategy.json")


def build_ferrari_history():
    results = load("results.csv")
    races = load("races.csv")[["raceId", "year"]]
    constructors = load("constructors.csv")[["constructorId", "name"]]

    ferrari_id = int(constructors[constructors["name"] == "Ferrari"].iloc[0]["constructorId"])
    merged = results.merge(races, on="raceId")
    merged = merged[merged["constructorId"] == ferrari_id]

    wins_per_year = (
        merged[merged["positionOrder"] == 1].groupby("year").size().rename("wins")
    )
    podiums_per_year = (
        merged[merged["positionOrder"].isin([1, 2, 3])].groupby("year").size().rename("podiums")
    )
    all_years = sorted(set(races["year"].unique()))
    cum = 0
    out = []
    for y in all_years:
        w = int(wins_per_year.get(y, 0))
        p = int(podiums_per_year.get(y, 0))
        cum += w
        out.append({"year": int(y), "wins": w, "podiums": p, "cumulative": cum})
    save(out, "ferrari_history.json")


def main():
    print("Preparing F1 data…")
    build_circuits()
    build_top_drivers()
    build_constructor_share()
    build_season_standings()
    build_pit_strategy()
    build_ferrari_history()
    print("Done.")


if __name__ == "__main__":
    main()
