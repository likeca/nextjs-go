/** Shared DTOs for the RBAC + user admin server actions. Dates are converted to
 *  `Date` to match the previous Prisma contract so the admin pages stay unchanged. */

export interface Permission {
  id: string;
  name: string;
  description: string | null;
  resource: string;
  action: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Role {
  id: string;
  name: string;
  description: string | null;
  isSystem: boolean;
  createdAt: Date;
  updatedAt: Date;
  rolePermissions: Array<{ permission: Permission }>;
}

export interface AdminUser {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  emailVerified: boolean;
  image: string | null;
  isAdmin: boolean;
  roleId: string | null;
  role: { id: string; name: string } | null;
  createdAt: Date;
  updatedAt: Date;
}

/* eslint-disable @typescript-eslint/no-explicit-any */
export function mapPermission(raw: any): Permission {
  return {
    id: raw.id,
    name: raw.name,
    description: raw.description ?? null,
    resource: raw.resource,
    action: raw.action,
    createdAt: new Date(raw.createdAt),
    updatedAt: new Date(raw.updatedAt),
  };
}

export function mapRole(raw: any): Role {
  return {
    id: raw.id,
    name: raw.name,
    description: raw.description ?? null,
    isSystem: !!raw.isSystem,
    createdAt: new Date(raw.createdAt),
    updatedAt: new Date(raw.updatedAt),
    rolePermissions: (raw.rolePermissions ?? []).map((rp: any) => ({
      permission: mapPermission(rp.permission),
    })),
  };
}

export function mapAdminUser(raw: any): AdminUser {
  return {
    id: raw.id,
    name: raw.name,
    email: raw.email,
    phone: raw.phone ?? null,
    emailVerified: !!raw.emailVerified,
    image: raw.image ?? null,
    isAdmin: !!raw.isAdmin,
    roleId: raw.roleId ?? null,
    role: raw.role ?? null,
    createdAt: new Date(raw.createdAt),
    updatedAt: new Date(raw.updatedAt),
  };
}
/* eslint-enable @typescript-eslint/no-explicit-any */
