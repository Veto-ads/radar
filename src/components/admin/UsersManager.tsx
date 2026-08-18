"use client";

import { useEffect, useState } from "react";
import AddUserModal from "./AddUserModal";
import AssignBoardsModal from "./AssignBoardsModal";
import ChangePasswordModal from "./ChangePasswordModal";

type UserRow = {
  id: string;
  username: string;
  full_name: string;
  role: string;
  custom_role: string | null;
  status: "active" | "frozen";
  can_upload: number;
  can_review: number;
  can_dashboard: number;
  can_admin: number;
  reset_requested_at: string | null;
};

const ROLE_LABELS: Record<string, string> = {
  rasid: "راصد ميداني",
  quality: "مشرف جودة",
  admin: "آدمن",
  partner: "شريك",
  custom: "دور مخصص",
};

export default function UsersManager() {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [addOpen, setAddOpen] = useState(false);
  const [editingName, setEditingName] = useState<{ id: string; value: string } | null>(null);
  const [assigningUser, setAssigningUser] = useState<UserRow | null>(null);
  const [passwordUser, setPasswordUser] = useState<UserRow | null>(null);

  function load() {
    fetch("/api/users")
      .then((r) => r.json())
      .then((d) => setUsers(d.users || []));
  }

  useEffect(load, []);

  async function togglePerm(user: UserRow, key: "can_upload" | "can_review" | "can_dashboard" | "can_admin") {
    await fetch(`/api/users/${user.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ [key]: user[key] ? 0 : 1 }),
    });
    load();
  }

  async function toggleStatus(user: UserRow) {
    await fetch(`/api/users/${user.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: user.status === "active" ? "frozen" : "active" }),
    });
    load();
  }

  async function saveRole(user: UserRow, role: string) {
    await fetch(`/api/users/${user.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role }),
    });
    load();
  }

  async function saveName() {
    if (!editingName) return;
    await fetch(`/api/users/${editingName.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ full_name: editingName.value }),
    });
    setEditingName(null);
    load();
  }

  async function remove(id: string) {
    if (!confirm("هل تريد حذف هذا المستخدم؟")) return;
    await fetch(`/api/users/${id}`, { method: "DELETE" });
    load();
  }

  return (
    <div className="card" style={{ padding: 24 }}>
      <div className="flex items-center justify-between" style={{ marginBottom: 16 }}>
        <h2 style={{ font: "var(--text-subtitle)", color: "var(--text-heading)" }}>المستخدمون والصلاحيات</h2>
        <button onClick={() => setAddOpen(true)} className="btn-primary" style={{ padding: "8px 16px" }}>
          إضافة مستخدم
        </button>
      </div>

      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "var(--fs-xs)" }}>
          <thead>
            <tr style={{ background: "var(--surface-muted)" }}>
              {["الاسم", "اليوزر", "الدور", "الحالة", "رفع", "مراجعة", "إحصائيات", "آدمن", "اللوحات", ""].map((h) => (
                <th key={h} style={{ padding: 10, textAlign: "start", color: "var(--text-heading)" }}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id} style={{ borderBottom: "1px solid var(--border-default)" }}>
                <td style={{ padding: 10 }}>
                  {editingName?.id === u.id ? (
                    <div className="flex gap-1">
                      <input
                        className="field-input"
                        style={{ width: 120 }}
                        value={editingName.value}
                        onChange={(e) => setEditingName({ id: u.id, value: e.target.value })}
                      />
                      <button onClick={saveName} style={{ color: "var(--veto-green)" }}>
                        ✓
                      </button>
                    </div>
                  ) : (
                    <button onClick={() => setEditingName({ id: u.id, value: u.full_name })}>{u.full_name}</button>
                  )}
                </td>
                <td style={{ padding: 10 }}>{u.username}</td>
                <td style={{ padding: 10 }}>
                  <select className="field-input" style={{ width: 120 }} value={u.role} onChange={(e) => saveRole(u, e.target.value)}>
                    {Object.entries(ROLE_LABELS).map(([v, l]) => (
                      <option key={v} value={v}>
                        {l}
                      </option>
                    ))}
                  </select>
                </td>
                <td style={{ padding: 10 }}>
                  <button
                    onClick={() => toggleStatus(u)}
                    className={u.status === "active" ? "chip chip-green" : "chip"}
                    style={u.status !== "active" ? { background: "var(--grey-150)", color: "var(--text-muted)" } : {}}
                  >
                    {u.status === "active" ? "مفعّل" : "مجمّد"}
                  </button>
                </td>
                {(["can_upload", "can_review", "can_dashboard", "can_admin"] as const).map((key) => (
                  <td key={key} style={{ padding: 10 }}>
                    <input type="checkbox" checked={!!u[key]} onChange={() => togglePerm(u, key)} />
                  </td>
                ))}
                <td style={{ padding: 10 }}>
                  {u.role === "rasid" && (
                    <button
                      onClick={() => setAssigningUser(u)}
                      className="btn-secondary"
                      style={{ padding: "6px 12px", fontSize: "var(--fs-caption)" }}
                    >
                      اللوحات المخصصة
                    </button>
                  )}
                </td>
                <td style={{ padding: 10 }}>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setPasswordUser(u)}
                      className="btn-secondary"
                      style={{ padding: "6px 12px", fontSize: "var(--fs-caption)" }}
                    >
                      كلمة المرور
                    </button>
                    <button onClick={() => remove(u.id)} className="btn-danger" style={{ fontSize: "var(--fs-caption)" }}>
                      حذف
                    </button>
                  </div>
                  {u.reset_requested_at && (
                    <div className="chip" style={{ marginTop: 6, background: "var(--warning-100, #fef3c7)", color: "var(--warning-700, #b45309)" }}>
                      طلب إعادة تعيين كلمة المرور
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {addOpen && <AddUserModal onClose={() => setAddOpen(false)} onSaved={load} />}
      {assigningUser && (
        <AssignBoardsModal
          userId={assigningUser.id}
          userName={assigningUser.full_name}
          onClose={() => setAssigningUser(null)}
        />
      )}
      {passwordUser && (
        <ChangePasswordModal
          userId={passwordUser.id}
          userName={passwordUser.full_name}
          onClose={() => setPasswordUser(null)}
          onSaved={load}
        />
      )}
    </div>
  );
}
