import { pool } from "@/lib/db";
import { getSessionUser } from "@/lib/server/auth";

export type DashboardRole = "superadmin" | "admin" | "coach" | "student";

export type ClubAccess = {
  id: string;
  name: string;
  sport: string | null;
  role: "admin" | "coach" | "student";
};

export type AccessContext = {
  userId: string;
  userLabel: string;
  role: DashboardRole;
  clubs: ClubAccess[];
  isSuperadmin: boolean;
};

const roleOrder: Array<ClubAccess["role"]> = ["admin", "coach", "student"];

const pickPrimaryRole = (roles: ClubAccess["role"][]): ClubAccess["role"] => {
  for (const role of roleOrder) {
    if (roles.includes(role)) return role;
  }
  return "student";
};

export const getAccessContext = async (): Promise<AccessContext | null> => {
  const user = await getSessionUser();
  if (!user) return null;

  const userLabel = user.full_name?.trim() || user.email || "User";

  if (user.is_superadmin) {
    return {
      userId: user.id,
      userLabel,
      role: "superadmin",
      clubs: [],
      isSuperadmin: true,
    };
  }

  const { rows } = await pool.query<{
    club_id: string;
    club_name: string;
    role: ClubAccess["role"];
    sport_name: string | null;
  }>(
    `
      select
        cm.club_id,
        c.name as club_name,
        cm.role,
        s.name as sport_name
      from public.club_memberships cm
      join public.clubs c on c.id = cm.club_id
      join public.sports s on s.id = c.sport_id
      where cm.user_id = $1
      order by c.name
    `,
    [user.id],
  );

  const clubs = rows.map((row) => ({
    id: row.club_id,
    name: row.club_name,
    sport: row.sport_name,
    role: row.role,
  }));

  if (clubs.length === 0) {
    return {
      userId: user.id,
      userLabel,
      role: "student",
      clubs: [],
      isSuperadmin: false,
    };
  }

  return {
    userId: user.id,
    userLabel,
    role: pickPrimaryRole(clubs.map((club) => club.role)),
    clubs,
    isSuperadmin: false,
  };
};

export const getClubRole = async (userId: string, clubId: string) => {
  const { rows } = await pool.query<{ role: ClubAccess["role"] }>(
    `
      select role
      from public.club_memberships
      where user_id = $1 and club_id = $2
    `,
    [userId, clubId],
  );
  return rows[0]?.role ?? null;
};
