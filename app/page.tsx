"use client";

import { useMemo, useState } from "react";

type Team = {
  id: string;
  name: string;
  gender: "Girls" | "Boys";
  age: number;
};

const teams: Team[] = [
  { id: "89302537", name: "Sandviken, IL RØD", gender: "Girls", age: 14 },
  { id: "demo-blue", name: "Sandviken/Varegg BLÅ", gender: "Girls", age: 14 },
  { id: "demo-1", name: "Bjarg", gender: "Girls", age: 14 },
  { id: "demo-2", name: "Fana", gender: "Girls", age: 14 },
  { id: "demo-3", name: "Varegg", gender: "Boys", age: 14 },
  { id: "demo-4", name: "Åsane", gender: "Girls", age: 15 },
];

export default function Home() {
  const [showTeamPicker, setShowTeamPicker] = useState(false);
  const [gender, setGender] = useState<"All" | "Girls" | "Boys">("All");
  const [age, setAge] = useState<number | "All">("All");
  const [search, setSearch] = useState("");
  const [favourites, setFavourites] = useState<Team[]>([]);

  const filteredTeams = useMemo(() => {
    const text = search.trim().toLowerCase();

    return teams.filter((team) => {
      const genderMatch = gender === "All" || team.gender === gender;
      const ageMatch = age === "All" || team.age === age;
      const textMatch =
        text === "" || team.name.toLowerCase().includes(text);

      return genderMatch && ageMatch && textMatch;
    });
  }, [gender, age, search]);

  function addFavourite(team: Team) {
    setFavourites((current) => {
      if (current.some((item) => item.id === team.id)) {
        return current;
      }

      return [...current, team];
    });

    setShowTeamPicker(false);
    setSearch("");
  }

  function removeFavourite(teamId: string) {
    setFavourites((current) =>
      current.filter((team) => team.id !== teamId)
    );
  }

  return (
    <main
      style={{
        maxWidth: "600px",
        margin: "0 auto",
        padding: "24px 16px 60px",
      }}
    >
      <div style={{ fontSize: "14px", color: "#68707c" }}>
        Tournament Match Tracker
      </div>

      <h1 style={{ marginBottom: "8px" }}>⚽ My Matches</h1>

      <p style={{ marginTop: 0, color: "#68707c" }}>
        Follow your favourite teams
      </p>

      <button
        type="button"
        onClick={() => setShowTeamPicker(true)}
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
          cursor: "pointer",
        }}
      >
        + Add favourite team
      </button>

      {favourites.length === 0 ? (
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
      ) : (
        <section style={{ marginTop: "28px" }}>
          <h2 style={{ fontSize: "18px" }}>⭐ Favourite teams</h2>

          {favourites.map((team) => (
            <div
              key={team.id}
              style={{
                marginTop: "10px",
                padding: "16px",
                background: "white",
                borderRadius: "12px",
                display: "flex",
                justifyContent: "space-between",
                gap: "12px",
                alignItems: "center",
              }}
            >
              <div>
                <strong>{team.name}</strong>
                <div
                  style={{
                    marginTop: "4px",
                    fontSize: "14px",
                    color: "#68707c",
                  }}
                >
                  {team.gender} · {team.age}
                </div>
              </div>

              <button
                type="button"
                onClick={() => removeFavourite(team.id)}
                style={{
                  border: 0,
                  background: "transparent",
                  color: "#b42318",
                  fontSize: "14px",
                }}
              >
                Remove
              </button>
            </div>
          ))}
        </section>
      )}

      {showTeamPicker && (
        <section
          style={{
            marginTop: "28px",
            padding: "20px",
            background: "white",
            borderRadius: "14px",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <h2 style={{ margin: 0, fontSize: "20px" }}>Add team</h2>

            <button
              type="button"
              onClick={() => setShowTeamPicker(false)}
              style={{
                border: 0,
                background: "transparent",
                fontSize: "22px",
              }}
              aria-label="Close team selector"
            >
              ×
            </button>
          </div>

          <p style={{ color: "#68707c" }}>Fotballfest 2026</p>

          <strong>Gender</strong>

          <div
            style={{
              display: "flex",
              gap: "8px",
              marginTop: "8px",
              marginBottom: "18px",
            }}
          >
            {(["All", "Girls", "Boys"] as const).map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => setGender(option)}
                style={{
                  flex: 1,
                  padding: "10px",
                  borderRadius: "8px",
                  border:
                    gender === option
                      ? "2px solid #166534"
                      : "1px solid #d0d5dd",
                  background:
                    gender === option ? "#ecfdf3" : "white",
                }}
              >
                {option}
              </button>
            ))}
          </div>

          <strong>Age</strong>

          <select
            value={age}
            onChange={(event) =>
              setAge(
                event.target.value === "All"
                  ? "All"
                  : Number(event.target.value)
              )
            }
            style={{
              width: "100%",
              marginTop: "8px",
              marginBottom: "18px",
              padding: "12px",
              borderRadius: "8px",
              border: "1px solid #d0d5dd",
              fontSize: "16px",
            }}
          >
            <option value="All">All ages</option>
            {[10, 11, 12, 13, 14, 15, 16, 17, 18].map((number) => (
              <option key={number} value={number}>
                {number}
              </option>
            ))}
          </select>

          <strong>Team</strong>

          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search team..."
            style={{
              width: "100%",
              boxSizing: "border-box",
              marginTop: "8px",
              padding: "12px",
              borderRadius: "8px",
              border: "1px solid #d0d5dd",
              fontSize: "16px",
            }}
          />

          <div style={{ marginTop: "12px" }}>
            {filteredTeams.map((team) => (
              <button
                key={team.id}
                type="button"
                onClick={() => addFavourite(team)}
                style={{
                  width: "100%",
                  textAlign: "left",
                  padding: "13px 4px",
                  border: 0,
                  borderBottom: "1px solid #eaecf0",
                  background: "white",
                }}
              >
                <strong>{team.name}</strong>

                <div
                  style={{
                    marginTop: "3px",
                    color: "#68707c",
                    fontSize: "13px",
                  }}
                >
                  {team.gender} · {team.age}
                </div>
              </button>
            ))}

            {filteredTeams.length === 0 && (
              <p style={{ color: "#68707c" }}>No matching teams.</p>
            )}
          </div>
        </section>
      )}
    </main>
  );
}
