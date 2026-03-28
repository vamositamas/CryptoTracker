import { storageService } from './storage.service';
import { roleService, Role } from './role.service';

export interface Group {
  id: string;
  name: string;
  roleIds: string[];
}

export interface GroupWithRoles extends Group {
  roles: Role[];
}

export interface CreateGroupDto {
  name: string;
  roleIds?: string[];
}

export interface UpdateGroupDto {
  name?: string;
  roleIds?: string[];
}

export class GroupService {
  private readonly path = 'shared/groups.json';

  async listGroups(): Promise<Group[]> {
    return storageService.read<Group[]>(this.path);
  }

  async getGroupById(id: string): Promise<Group> {
    const groups = await this.listGroups();
    const group = groups.find(g => g.id === id);
    if (!group) {
      const err = new Error(`Group not found: ${id}`) as Error & { statusCode: number; code: string };
      err.statusCode = 404;
      err.code = 'NOT_FOUND';
      throw err;
    }
    return group;
  }

  async getGroupWithRoles(id: string): Promise<GroupWithRoles> {
    const group = await this.getGroupById(id);
    const roles = await Promise.all(
      group.roleIds.map(rid => roleService.getRoleById(rid).catch(() => null)),
    );
    return { ...group, roles: roles.filter((r): r is Role => r !== null) };
  }

  async resolvePermissions(groupId: string): Promise<string[]> {
    const group = await this.getGroupWithRoles(groupId);
    const permSet = new Set<string>();
    for (const role of group.roles) {
      for (const perm of role.permissions) {
        permSet.add(perm);
      }
    }
    return Array.from(permSet);
  }

  async createGroup(dto: CreateGroupDto): Promise<Group> {
    const groups = await this.listGroups();
    const conflict = groups.find(g => g.name.toLowerCase() === dto.name.toLowerCase());
    if (conflict) {
      const err = new Error(`Group "${dto.name}" already exists`) as Error & { statusCode: number; code: string; field: string };
      err.statusCode = 409;
      err.code = 'DUPLICATE_ENTRY';
      err.field = 'name';
      throw err;
    }
    const group: Group = {
      id: `group-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      name: dto.name,
      roleIds: dto.roleIds ?? [],
    };
    groups.push(group);
    await storageService.write(this.path, groups);
    return group;
  }

  async updateGroup(id: string, dto: UpdateGroupDto): Promise<Group> {
    const groups = await this.listGroups();
    const idx = groups.findIndex(g => g.id === id);
    if (idx === -1) {
      const err = new Error(`Group not found: ${id}`) as Error & { statusCode: number; code: string };
      err.statusCode = 404;
      err.code = 'NOT_FOUND';
      throw err;
    }
    if (dto.name !== undefined) {
      const conflict = groups.find(g => g.id !== id && g.name.toLowerCase() === dto.name!.toLowerCase());
      if (conflict) {
        const err = new Error(`Group "${dto.name}" already exists`) as Error & { statusCode: number; code: string; field: string };
        err.statusCode = 409;
        err.code = 'DUPLICATE_ENTRY';
        err.field = 'name';
        throw err;
      }
      groups[idx].name = dto.name;
    }
    if (dto.roleIds !== undefined) {
      groups[idx].roleIds = dto.roleIds;
    }
    await storageService.write(this.path, groups);
    return groups[idx];
  }

  async deleteGroup(id: string): Promise<void> {
    const groups = await this.listGroups();
    const idx = groups.findIndex(g => g.id === id);
    if (idx === -1) {
      const err = new Error(`Group not found: ${id}`) as Error & { statusCode: number; code: string };
      err.statusCode = 404;
      err.code = 'NOT_FOUND';
      throw err;
    }
    groups.splice(idx, 1);
    await storageService.write(this.path, groups);
  }
}

export const groupService = new GroupService();
