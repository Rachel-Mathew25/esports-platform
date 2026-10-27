import { NextResponse } from "next/server";
import { pool } from "@/lib/mysql";
import { getMongo } from "@/lib/mongo";
import { requireRole } from "@/lib/auth";

const EVENT_TYPES = ["kill", "death", "assist"];

export async function POST(request, { params }) {
  const auth = await requireRole(request, ["admin", "staff"]);
  if (auth.error) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const { id } = await params;
  const matchId = Number(id);
  if (!Number.isInteger(matchId) || matchId < 1) {
    return NextResponse.json({ error: "Invalid match id" }, { status: 400 });
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const playerId = Number(body.player_id);
  const type = body.type;
  const weapon = body.weapon;
  const meta = body.meta ?? {};

  if (!Number.isInteger(playerId) || playerId < 1) {
    return NextResponse.json({ error: "player_id must be a positive integer" }, { status: 400 });
  }
  if (!EVENT_TYPES.includes(type)) {
    return NextResponse.json(
      { error: `type must be one of: ${EVENT_TYPES.join(", ")}` },
      { status: 400 }
    );
  }
  if (weapon !== undefined && (typeof weapon !== "string" || weapon.length > 40)) {
    return NextResponse.json({ error: "weapon must be a string up to 40 characters" }, { status: 400 });
  }
  if (typeof meta !== "object" || meta === null || Array.isArray(meta)) {
    return NextResponse.json({ error: "meta must be an object" }, { status: 400 });
  }

  const [matchRows] = await pool.query(
    "SELECT match_id FROM matches WHERE match_id = ?",
    [matchId]
  );
  if (matchRows.length === 0) {
    return NextResponse.json({ error: "Match not found" }, { status: 404 });
  }

  const [memberRows] = await pool.query(
    "SELECT player_id FROM match_players WHERE match_id = ? AND player_id = ?",
    [matchId, playerId]
  );
  if (memberRows.length === 0) {
    return NextResponse.json({ error: "Player is not in this match" }, { status: 400 });
  }

  const doc = {
    match_id: matchId,
    player_id: playerId,
    type,
    timestamp: new Date(),
    meta,
  };
  if (weapon !== undefined) doc.weapon = weapon;

  const db = await getMongo();
  const result = await db.collection("match_events").insertOne(doc);

  return NextResponse.json(
    { message: "Event recorded", event_id: result.insertedId, match_id: matchId, player_id: playerId, type },
    { status: 201 }
  );
}
