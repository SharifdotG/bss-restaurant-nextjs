import type { EmployeeOut, UserOut, UserRole as Role } from "@/lib/api/schema";
import { canManageAccount } from "@/lib/permissions";

export const ROLES: Role[] = ["manager", "waiter", "chef", "cashier", "admin"];

/** Roles this person may hand out: managers give floor roles, admins give any. */
export const grantableRoles = (actor: Role): Role[] =>
  actor === "admin" ? ROLES : ["waiter", "chef", "cashier"];

export type SignIn = "none" | "on" | "off";

export const signInState = (employee: Pick<EmployeeOut, "account">): SignIn =>
  !employee.account ? "none" : employee.account.isActive ? "on" : "off";

/** Logins with no staff record behind them, usually the owner's admin account. */
export function accountsOnly(users: UserOut[], employees: EmployeeOut[]) {
  const linked = new Set(employees.flatMap((employee) => employee.account?.id ?? []));
  return users.filter((user) => !linked.has(user.id));
}

export type AccountAction = "account" | "password" | "role" | "signInOff" | "signInOn" | "left";

type Actor = { id: number; role: Role };

/**
 * What this manager may do to someone's sign-in and record. Managers can't touch manager or
 * admin sign-ins, and nobody changes their own here (that's what Profile is for).
 */
export function accountActions(actor: Actor, person: Pick<EmployeeOut, "account" | "isActive">) {
  const { account } = person;
  if (!person.isActive || account?.id === actor.id) return [];
  if (!account) return ["account", "left"] satisfies AccountAction[];
  const allowed = canManageAccount(actor.role, account.role);
  const actions: AccountAction[] = [];
  if (allowed) actions.push("password", "role", account.isActive ? "signInOff" : "signInOn");
  // Leaving turns their sign-in off too, which needs the same right while it's on.
  if (allowed || !account.isActive) actions.push("left");
  return actions;
}

export type StaffShow = "current" | "left" | "noSignIn";

export function matchesEmployee(
  employee: EmployeeOut,
  { search, role, show }: { search: string; role: Role | null; show: StaffShow },
) {
  if (show === "left" ? employee.isActive : !employee.isActive) return false;
  if (show === "noSignIn" && employee.account) return false;
  if (role && employee.account?.role !== role) return false;
  const query = search.trim().toLowerCase();
  if (!query) return true;
  return [employee.fullName, employee.designation, employee.phone, employee.email].some((value) =>
    value?.toLowerCase().includes(query),
  );
}

// No look-alikes (l, 1, O, 0) so it can be read out over the counter.
const CONSONANTS = "bcdfghjkmnprstvz";
const VOWELS = "aeiu";
const DIGITS = "23456789";

const pick = (from: string, random: number) => from[random % from.length];

/**
 * A temporary password that is easy to read aloud and type on a phone, like "Mika-Rotu-48".
 * It meets the API's rule of eight or more characters with a letter and a digit.
 */
export function generatePassword(random: (count: number) => number[] = cryptoRandom) {
  const values = random(10);
  const word = (offset: number) =>
    [CONSONANTS, VOWELS, CONSONANTS, VOWELS]
      .map((set, i) => pick(set, values[offset + i]!))
      .join("");
  const first = word(0);
  return `${first[0]!.toUpperCase()}${first.slice(1)}-${word(4)}-${pick(DIGITS, values[8]!)}${pick(DIGITS, values[9]!)}`;
}

function cryptoRandom(count: number) {
  return Array.from(crypto.getRandomValues(new Uint32Array(count)));
}

/** Same rule as the API: 8–128 characters with at least one letter and one digit. */
export function passwordProblem(password: string): "short" | "long" | "mix" | null {
  if (password.length < 8) return "short";
  if (password.length > 128) return "long";
  if (!/[A-Za-z]/.test(password) || !/\d/.test(password)) return "mix";
  return null;
}
