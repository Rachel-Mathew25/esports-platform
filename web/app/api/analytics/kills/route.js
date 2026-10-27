import { NextResponse } from "next/server";
import { pool } from "@/lib/mysql";
import { getMongo } from "@/lib/mongo";
import { requireRole } from "@/lib/auth";

export async function GET(request) {
  const auth = await requireRole(request, ["admin", "staff", "player"]);
  if (auth.error) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const { searchParams } = new URL(request.url);
  const matchParam = searchParams.get("match_id");
  const limitParam = searchParams.get("limit");

  const filter = { type: "kill" };
  if (matchParam !== null) {
    const matchId = Number(matchParam);
    if (!Number.isInteger(matchId) || matchId < 1) {
      return NextResponse.json({ error: "match_id must be a positive integer" }, { status: 400 });
    }
    filter.match_id = matchId;
  }

  let limit = 10;
  if (limitParam !== null) {
    limit = Number(limitParam);
    if (!Number.isInteger(limit) || limit < 1 || limit > 100) {
      return NextResponse.json({ error: "limit must be between 1 and 100" }, { status: 400 });
    }
  }

  const db = await getMongo();
  const rows = await db
    .collection("match_events")
    .aggregate([
      { $match: filter },
      {
        $group: {
          _id: "$player_id",
          kills: { $sum: 1 },
          headshots: { $sum: { $cond: [{ $eq: ["$meta.headshot", true] }, 1, 0] } },
          matches: { $addToSet: "$match_id" },
        },
      },
      { $sort: { kills: -1 } },
      { $limit: limit },
    ])
    .toArray();

  let names = {};
  if (rows.length > 0) {
    const ids = rows.map((r) => r._id);
    const [players] = await pool.query(
      "SELECT player_id, display_name FROM players WHERE player_id IN (?)",
      [ids]
    );
    names = Object.fromEntries(players.map((p) => [p.player_id, p.display_name]));
  }

  const results = rows.map((r) => ({
    player_id: r._id,
    display_name: names[r._id] ?? null,
    kills: r.kills,
    headshots: r.headshots,
    headshot_pct: r.kills > 0 ? Math.round((r.headshots / r.kills) * 100) : 0,
    matches_played: r.matches.length,
  }));

  return NextResponse.json({ results });
}
