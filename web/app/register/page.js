"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function RegisterPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    username: "",
    email: "",
    password: "",
    display_name: "",
    region: "Global",
  });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  function set(field) {
    return (e) => setForm({ ...form, [field]: e.target.value });
  }

  async function onSubmit(e) {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      const body = { ...form };
      if (!body.display_name.trim()) delete body.display_name;

      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || "Registration failed");
        return;
      }

      const login = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: form.email, password: form.password }),
      });
      if (login.ok) {
        router.push("/dashboard");
        router.refresh();
      } else {
        router.push("/login");
      }
    } catch {
      setError("Could not reach the server");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="stack">
      <div>
        <h1>Create an account</h1>
        <p>Register as a player to join queues and earn an ELO rating.</p>
      </div>
      <form className="form" onSubmit={onSubmit}>
        <label>
          Username
          <input value={form.username} onChange={set("username")} required />
        </label>
        <label>
          Email
          <input
            type="email"
            value={form.email}
            onChange={set("email")}
            required
          />
        </label>
        <label>
          Password
          <input
            type="password"
            value={form.password}
            onChange={set("password")}
            required
          />
        </label>
        <label>
          Display name (optional)
          <input value={form.display_name} onChange={set("display_name")} maxLength={40} />
        </label>
        <label>
          Region
          <select value={form.region} onChange={set("region")}>
            <option>Global</option>
            <option>NA</option>
            <option>EU</option>
            <option>APAC</option>
          </select>
        </label>
        {error && <div className="error">{error}</div>}
        <button className="btn" type="submit" disabled={busy}>
          {busy ? "Creating..." : "Register"}
        </button>
      </form>
      <p>
        Already registered? <Link href="/login" style={{ color: "var(--accent-hover)" }}>Log in</Link>
      </p>
    </div>
  );
}
