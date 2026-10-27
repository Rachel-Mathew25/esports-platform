import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { pool } from "@/lib/mysql";

export async function POST(request) {
  const { username, email, password } = await request.json();

  if (!username || username.length < 3 || username.length > 30)
    return NextResponse.json({ error: "Username must be 3-30 characters" }, { status: 400 });
  if (!email || !/^\S+@\S+\.\S+$/.test(email))
    return NextResponse.json({ error: "Invalid email" }, { status: 400 });
  if (!password || password.length < 8)
    return NextResponse.json({ error: "Password must be at least 8 characters" }, { status: 400 });

  try {
    const hash = await bcrypt.hash(password, 10);
    const [result] = await pool.execute(
      "INSERT INTO users (username, email, password_hash, role) VALUES (?, ?, ?, 'player')",
      [username, email, hash]
    );
    return NextResponse.json({ user_id: result.insertId, username }, { status: 201 });
  } catch (err) {
    if (err.code === "ER_DUP_ENTRY")
      return NextResponse.json({ error: "Username or email already exists" }, { status: 409 });
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
