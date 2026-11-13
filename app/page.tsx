export default function Home() {
  return (
    <main
      style={{
        maxWidth: "600px",
        margin: "0 auto",
        padding: "24px 16px",
      }}
    >
      <div style={{ fontSize: "14px", color: "#68707c" }}>
        Tournament Match Tracker
      </div>

      <h1 style={{ marginBottom: "8px" }}>
        ⚽ My Matches
      </h1>

      <p style={{ marginTop: 0, color: "#68707c" }}>
        Follow your favourite teams
      </p>

      <button
        style={{
          width: "100%",
          padding: "14px",
          marginTop: "24px",
          border: 0,
          borderRadius: "10px",
          background: "#166534",
          color: "white",
          fontSize: "16px",
          fontWeight: 600,
        }}
      >
        + Add favourite team
      </button>

      <div
        style={{
          marginTop: "32px",
          padding: "24px",
          background: "white",
          borderRadius: "12px",
          textAlign: "center",
        }}
      >
        <strong>No favourite teams yet</strong>

        <p style={{ color: "#68707c", marginBottom: 0 }}>
          Add a team to see upcoming, live and played matches.
        </p>
      </div>
    </main>
  );
}
