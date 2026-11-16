"use client";

import { useEffect, useMemo, useState } from "react";

type Team = {
  id: number;
  name: string;
  fullName: string | null;
  categoryName: string | null;
  suffix: string | null;
};

type TeamsResponse = {
  ok: boolean;
  tournament: string;
  category: {
    id: number;
    gender: string;
    age: number;
  };
  count: number;
  teams: Team[];
};

export default function Home() {
  const [teams, setTeams] = useState<Team[]>([]);
  const [favourites, setFavourites] = useState<Team[]>([]);
  const [showTeamPicker, setShowTeamPicker] = useState(false);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadTeams() {
      try {
        setLoading(true);
        setError("");

        const response = await fetch("/api/cupmanager/teams", {
          cache: "no-store",
        });

        if (!response.ok) {
          throw new Error("Could not load teams");
        }

        const data: TeamsResponse = await response.json();

        setTeams(data.teams);
      } catch {
        setError("Could not load teams from Fotballfest.");
      } finally {
        setLoading(false);
      }
    }

    loadTeams();
  }, []);

  const filteredTeams = useMemo(() => {
    const text = search.trim().toLowerCase();

    if (!text) {
      return teams;
    }

    return teams.filter((team) => {
      const searchableText = [
        team.name,
        team.fullName,
        team.categoryName,
        team.suffix,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return searchableText.includes(text);
    });
  }, [teams, search]);

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

  function removeFavourite(teamId: number) {
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

                {team.categoryName && (
                  <div
                    style={{
                      marginTop: "4px",
                      fontSize: "14px",
                      color: "#68707c",
                    }}
                  >
                    {team.categoryName}
                  </div>
                )}
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
            <h2 style={{ margin: 0, fontSize: "20px" }}>
              Add team
            </h2>

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

          <p style={{ color: "#68707c" }}>
            Fotballfest 2026 · Girls · 14
          </p>

          <label
            htmlFor="team-search"
            style={{ fontWeight: 600 }}
          >
            Team
          </label>

          <input
            id="team-search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search team..."
            autoComplete="off"
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
            {loading && (
              <p style={{ color: "#68707c" }}>
                Loading Fotballfest teams...
              </p>
            )}

            {error && (
              <p style={{ color: "#b42318" }}>{error}</p>
            )}

            {!loading &&
              !error &&
              filteredTeams.map((team) => (
                <button
                  key={team.id}
                  type="button"
               
