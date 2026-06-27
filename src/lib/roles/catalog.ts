import type { Role } from './types';
import seedData from './roles.seed.json';

// ─── Interface ────────────────────────────────────────────────────────────────

export interface RoleCatalog {
  getPublishedRoles(): Promise<Role[]>;
}

// ─── JsonRoleCatalog ──────────────────────────────────────────────────────────

export class JsonRoleCatalog implements RoleCatalog {
  private readonly roles: Role[] = seedData as Role[];

  async getPublishedRoles(): Promise<Role[]> {
    return this.roles.filter((r) => r.status === 'published');
  }
}

// ─── SupabaseRoleCatalog (stub) ───────────────────────────────────────────────

export class SupabaseRoleCatalog implements RoleCatalog {
  async getPublishedRoles(): Promise<Role[]> {
    throw new Error('SupabaseRoleCatalog not yet implemented — set ROLE_CATALOG=json or wire Supabase first.');
  }
}

// ─── Factory ──────────────────────────────────────────────────────────────────

export function createRoleCatalog(
  backend: string = process.env['ROLE_CATALOG'] ?? 'json'
): RoleCatalog {
  if (backend === 'json') return new JsonRoleCatalog();
  if (backend === 'supabase') return new SupabaseRoleCatalog();
  throw new Error(`Unknown ROLE_CATALOG backend: "${backend}". Expected "json" or "supabase".`);
}

export const defaultCatalog: RoleCatalog = new JsonRoleCatalog();
