import { storageService } from './storage.service';

export interface Role {
  id: string;
  name: string;
  permissions: string[];
}

export interface CreateRoleDto {
  name: string;
  permissions: string[];
}

export interface UpdateRoleDto {
  name?: string;
  permissions?: string[];
}

export class RoleService {
  private readonly path = 'shared/roles.json';

  async listRoles(): Promise<Role[]> {
    return storageService.read<Role[]>(this.path);
  }

  async getRoleById(id: string): Promise<Role> {
    const roles = await this.listRoles();
    const role = roles.find(r => r.id === id);
    if (!role) {
      const err = new Error(`Role not found: ${id}`) as Error & { statusCode: number; code: string };
      err.statusCode = 404;
      err.code = 'NOT_FOUND';
      throw err;
    }
    return role;
  }

  async createRole(dto: CreateRoleDto): Promise<Role> {
    const roles = await this.listRoles();
    const nameConflict = roles.find(r => r.name.toLowerCase() === dto.name.toLowerCase());
    if (nameConflict) {
      const err = new Error(`Role "${dto.name}" already exists`) as Error & { statusCode: number; code: string; field: string };
      err.statusCode = 409;
      err.code = 'DUPLICATE_ENTRY';
      err.field = 'name';
      throw err;
    }
    const role: Role = {
      id: `role-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      name: dto.name,
      permissions: dto.permissions ?? [],
    };
    roles.push(role);
    await storageService.write(this.path, roles);
    return role;
  }

  async updateRole(id: string, dto: UpdateRoleDto): Promise<Role> {
    const roles = await this.listRoles();
    const idx = roles.findIndex(r => r.id === id);
    if (idx === -1) {
      const err = new Error(`Role not found: ${id}`) as Error & { statusCode: number; code: string };
      err.statusCode = 404;
      err.code = 'NOT_FOUND';
      throw err;
    }
    if (dto.name !== undefined) {
      const conflict = roles.find(r => r.id !== id && r.name.toLowerCase() === dto.name!.toLowerCase());
      if (conflict) {
        const err = new Error(`Role "${dto.name}" already exists`) as Error & { statusCode: number; code: string; field: string };
        err.statusCode = 409;
        err.code = 'DUPLICATE_ENTRY';
        err.field = 'name';
        throw err;
      }
      roles[idx].name = dto.name;
    }
    if (dto.permissions !== undefined) {
      roles[idx].permissions = dto.permissions;
    }
    await storageService.write(this.path, roles);
    return roles[idx];
  }

  async deleteRole(id: string): Promise<void> {
    const roles = await this.listRoles();
    const idx = roles.findIndex(r => r.id === id);
    if (idx === -1) {
      const err = new Error(`Role not found: ${id}`) as Error & { statusCode: number; code: string };
      err.statusCode = 404;
      err.code = 'NOT_FOUND';
      throw err;
    }
    roles.splice(idx, 1);
    await storageService.write(this.path, roles);
  }
}

export const roleService = new RoleService();
