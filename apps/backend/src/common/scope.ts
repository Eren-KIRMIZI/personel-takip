import type { AuthenticatedUser } from './decorators/current-user.decorator';

/**
 * Rol bazlı satır kapsamlama (row-level scoping) yardımcıları.
 *
 * - admin / hr  → 'all'      : tüm veriyi görür (İK personeli yönetir)
 * - manager     → 'department': yalnızca kendi departmanındaki veriyi görür
 * - diğer       → 'self'     : yalnızca kendisiyle ilgili veriyi görür
 */

export type ScopeKind = 'all' | 'department' | 'self';

export function resolveScopeKind(user: AuthenticatedUser): ScopeKind {
  const roles = user.roles.map((r) => String(r).toLowerCase());
  if (roles.includes('admin') || roles.includes('hr') || roles.includes('ik') || roles.includes('hr_specialist')) {
    return 'all';
  }
  if (
    roles.includes('manager') ||
    roles.includes('unit_manager') ||
    roles.includes('birim_yoneticisi') ||
    roles.includes('birim yöneticisi')
  ) {
    return 'department';
  }
  return 'self';
}

export interface ScopeFilter {
  kind: ScopeKind;
  employeeId?: string | null;
  departmentId?: string | null;
}

export function getScope(user: AuthenticatedUser): ScopeFilter {
  return {
    kind: resolveScopeKind(user),
    employeeId: user.employeeId,
    departmentId: user.departmentId,
  };
}

/**
 * employeeId alanına sahip kayıtlar için Prisma `where` fragmanı üretir.
 * `employee` ilişkisi üzerinden departmana göre filtreler.
 * Var olan `employeeId` filtresi ile scope'u AND'ler.
 */
export function employeeScopedWhere(
  user: AuthenticatedUser,
  existing?: Record<string, unknown>,
): Record<string, unknown> {
  const scope = getScope(user);
  if (scope.kind === 'all') {
    return { ...(existing ?? {}) };
  }

  const and: Record<string, unknown>[] = [];

  if (scope.kind === 'department' && scope.departmentId) {
    and.push({ employee: { departmentId: scope.departmentId } });
  } else if (scope.kind === 'self' && scope.employeeId) {
    and.push({ employeeId: scope.employeeId });
  }

  if (and.length === 0) return { ...(existing ?? {}) };

  const existingWhere = existing ?? {};
  const existingAnd = (existingWhere as { AND?: unknown[] }).AND;
  if (existingAnd) {
    return { AND: [...existingAnd, ...and] };
  }
  return { AND: [{ ...existingWhere }, ...and] };
}

/**
 * Doğrudan Employee kayıtları üzerinde kapsam uygular (GET /employees gibi).
 * Var olan `id` filtresi ile scope'u AND'ler.
 */
export function employeeEntityScopedWhere(
  user: AuthenticatedUser,
  existing?: Record<string, unknown>,
): Record<string, unknown> {
  const scope = getScope(user);
  if (scope.kind === 'all') {
    return { ...(existing ?? {}) };
  }

  const and: Record<string, unknown>[] = [];

  if (scope.kind === 'department' && scope.departmentId) {
    and.push({ departmentId: scope.departmentId });
  } else if (scope.kind === 'self' && scope.employeeId) {
    and.push({ id: scope.employeeId });
  }

  if (and.length === 0) return { ...(existing ?? {}) };

  const existingWhere = existing ?? {};
  const existingAnd = (existingWhere as { AND?: unknown[] }).AND;
  if (existingAnd) {
    return { AND: [...existingAnd, ...and] };
  }
  return { AND: [{ ...existingWhere }, ...and] };
}
