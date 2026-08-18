import { getDb } from "./db";

// No rows for a user means "unrestricted" (sees/records on every board) — this keeps
// newly created rasid accounts usable before an admin has assigned them anything.
export function getAssignedBoardIds(userId: string): string[] | null {
  const db = getDb();
  const rows = db.prepare("SELECT board_id FROM board_assignments WHERE user_id = ?").all(userId) as {
    board_id: string;
  }[];
  return rows.length ? rows.map((r) => r.board_id) : null;
}

export function isBoardAllowedForUser(userId: string, boardId: string): boolean {
  const assigned = getAssignedBoardIds(userId);
  return assigned === null || assigned.includes(boardId);
}
