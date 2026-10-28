import Link from "next/link";

export default function Home() {
  return (
    <div>
      <section className="hero">
        <h1>Find fair matches. Climb the ELO ladder.</h1>
        <p>
          Join a queue, get paired with players of similar skill, and watch
          your rating move after every match. Rankings update automatically
          through database triggers and stored procedures.
        </p>
        <div className="row">
          <Link href="/leaderboard" className="btn">
            View leaderboard
          </Link>
          <Link href="/register" className="btn btn-secondary">
            Create an account
          </Link>
        </div>
      </section>

      <section className="grid">
        <div className="card">
          <h2>Matchmaking</h2>
          <p>
            Players in the queue are grouped by ELO range into balanced teams,
            all inside a single transaction.
          </p>
        </div>
        <div className="card">
          <h2>ELO ratings</h2>
          <p>
            Settling a match runs a stored procedure that updates ratings and
            writes a full history for every player.
          </p>
        </div>
        <div className="card">
          <h2>Match analytics</h2>
          <p>
            In-game events such as kills and headshots are stored in MongoDB
            and aggregated into live stats.
          </p>
        </div>
      </section>
    </div>
  );
}
