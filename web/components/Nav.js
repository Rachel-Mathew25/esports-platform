"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export default function Nav() {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/auth/me")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (cancelled) return;
        const u = d && (d.user || d);
        setUser(u && u.username ? u : null);
      })
      .catch(() => {
        if (!cancelled) setUser(null);
      });
    return () => {
      cancelled = true;
    };
  }, [pathname]);

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    setUser(null);
    router.push("/");
    router.refresh();
  }

  const isStaff = user && (user.role === "admin" || user.role === "staff");
  const isPlayer = user && user.role === "player";

  function cls(href) {
    return "nav-link" + (pathname === href ? " active" : "");
  }

  return (
    <nav className="navbar">
      <div className="navbar-inner">
        <Link href="/" className="brand">
          EsportsELO
        </Link>
        <Link href="/leaderboard" className={cls("/leaderboard")}>
          Leaderboard
        </Link>
        {isPlayer && (
          <Link href="/dashboard" className={cls("/dashboard")}>
            Dashboard
          </Link>
        )}
        {isStaff && (
          <Link href="/admin" className={cls("/admin")}>
            Admin
          </Link>
        )}
        {user ? (
          <>
            <span className="nav-user">
              {user.username}
              <span className="badge">{user.role}</span>
            </span>
            <button className="btn btn-secondary" onClick={logout}>
              Logout
            </button>
          </>
        ) : (
          <>
            <Link href="/login" className={cls("/login")}>
              Login
            </Link>
            <Link href="/register" className="btn">
              Register
            </Link>
          </>
        )}
      </div>
    </nav>
  );
}
