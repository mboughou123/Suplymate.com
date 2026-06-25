"use client";

import { useEffect, useState } from "react";

type Team = { id: string; name: string; role: string; memberCount: number };

export default function TeamSettingsPage() {
  const [teams, setTeams] = useState<Team[]>([]);
  const [name, setName] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("BUYER");
  const [selectedTeam, setSelectedTeam] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  const load = () =>
    fetch("/api/teams")
      .then((r) => (r.ok ? r.json() : { teams: [] }))
      .then((d) => setTeams(d.teams ?? []));

  useEffect(() => {
    load();
  }, []);

  const create = async () => {
    setError(null);
    const res = await fetch("/api/teams", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || "Failed");
      return;
    }
    setName("");
    setMsg("Team created");
    load();
  };

  const invite = async () => {
    if (!selectedTeam) return;
    setError(null);
    const res = await fetch(`/api/teams/${selectedTeam}/members`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: inviteEmail, role: inviteRole }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || "Failed");
      return;
    }
    setInviteEmail("");
    setMsg("Member invited");
    load();
  };

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-card">
        <h2 className="text-sm font-bold text-ink">Your teams</h2>
        <p className="mt-1 text-xs text-ink-muted">
          Team roles are enforced server-side (Owner, Admin, Procurement Manager, Buyer, Viewer).
        </p>
        {teams.length === 0 ? (
          <p className="mt-4 text-sm text-ink-dim">No teams yet.</p>
        ) : (
          <ul className="mt-4 space-y-2">
            {teams.map((t) => (
              <li key={t.id} className="flex items-center justify-between rounded-lg border border-slate-200 px-3 py-2 text-sm">
                <span className="font-medium text-ink">{t.name}</span>
                <span className="text-xs text-ink-dim">
                  {t.role} · {t.memberCount} member{t.memberCount === 1 ? "" : "s"}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-card">
        <h2 className="text-sm font-bold text-ink">Create a team</h2>
        <div className="mt-3 flex gap-2">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Team name"
            className="flex-1 rounded-lg border border-slate-200 px-3 py-2 text-sm"
          />
          <button type="button" onClick={create} className="rounded-lg bg-cyan px-4 py-2 text-sm font-semibold text-white hover:bg-cyan/90">
            Create
          </button>
        </div>
      </section>

      {teams.length > 0 && (
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-card">
          <h2 className="text-sm font-bold text-ink">Invite member</h2>
          <select
            value={selectedTeam ?? teams[0]?.id ?? ""}
            onChange={(e) => setSelectedTeam(e.target.value)}
            className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
          >
            {teams.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
          <div className="mt-2 flex gap-2">
            <input
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              placeholder="colleague@company.com"
              className="flex-1 rounded-lg border border-slate-200 px-3 py-2 text-sm"
            />
            <select
              value={inviteRole}
              onChange={(e) => setInviteRole(e.target.value)}
              className="rounded-lg border border-slate-200 px-2 py-2 text-sm"
            >
              {["ADMIN", "PROCUREMENT_MANAGER", "BUYER", "VIEWER"].map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
            <button type="button" onClick={invite} className="rounded-lg bg-cyan px-4 py-2 text-sm font-semibold text-white hover:bg-cyan/90">
              Invite
            </button>
          </div>
        </section>
      )}

      {error && <p className="text-sm text-red-600">{error}</p>}
      {msg && <p className="text-sm text-emerald-700">{msg}</p>}
    </div>
  );
}
