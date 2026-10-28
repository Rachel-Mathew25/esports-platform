import { NextResponse } from "next/server";
import { pool } from "@/lib/mysql";
import { requireRole } from "@/lib/auth";

export async function POST(request) {
  const auth = await requireRole(request, ["player"]);
  if (auth.error) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const queueId = Number(body.queue_id);
  if (!Number.isInteger(queueId) || queueId < 1) {
    return NextResponse.json({ error: "queue_id must be a positive integer" }, { status: 400 });
  }

  try {
    const [result] = await pool.execute(
      "UPDATE matchmaking_queue SET status = 'cancelled' WHERE queue_id = ? AND player_id = ? AND status = 'waiting'",
      [queueId, auth.session.id]
    );
    if (result.affectedRows === 0) {
      return NextResponse.json({ error: "No waiting queue entry found" }, { status: 404 });
    }
    return NextResponse.json({ message: "Left the queue", queue_id: queueId });
  } catch (err) {
    console.error("queue cancel error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
