import { storageService } from './storage.service';
import { groupService } from './group.service';
import * as bcrypt from 'bcryptjs';
import * as jwt from 'jsonwebtoken';
import { randomUUID } from 'crypto';

export interface User {
  id: string;
  email: string;
  username: string;
  passwordHash: string;
  groupId: string;
  active: boolean;
  createdAt: string;
}

export interface PublicUser {
  id: string;
  email: string;
  username: string;
  groupId: string;
  active: boolean;
  createdAt: string;
}

export interface JwtPayload {
  id: string;
  email: string;
  username: string;
  groupId: string;
  permissions: string[];
}

export interface CreateUserDto {
  email: string;
  username: string;
  password: string;
  groupId?: string;
}

export interface UpdateUserDto {
  email?: string;
  username?: string;
  groupId?: string;
  active?: boolean;
  password?: string;
}

function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('JWT_SECRET environment variable is required but not set');
  }
  return secret;
}

function toPublicUser(user: User): PublicUser {
  const { passwordHash: _omit, ...pub } = user;
  return pub;
}

function throwError(status: number, code: string, message: string, field?: string): never {
  const err = new Error(message) as Error & { statusCode: number; code: string; field?: string };
  err.statusCode = status;
  err.code = code;
  if (field) err.field = field;
  throw err;
}

export class UserStorageService {
  private readonly path = 'shared/users.json';

  async listUsers(): Promise<PublicUser[]> {
    const users = await storageService.read<User[]>(this.path);
    return users.map(toPublicUser);
  }

  async getUserById(id: string): Promise<PublicUser> {
    const users = await storageService.read<User[]>(this.path);
    const user = users.find(u => u.id === id);
    if (!user) throwError(404, 'NOT_FOUND', `User not found: ${id}`);
    return toPublicUser(user!);
  }

  async createUser(dto: CreateUserDto): Promise<PublicUser> {
    const users = await storageService.read<User[]>(this.path);
    if (users.find(u => u.email.toLowerCase() === dto.email.toLowerCase())) {
      throwError(409, 'DUPLICATE_EMAIL', 'Email already registered', 'email');
    }
    if (users.find(u => u.username.toLowerCase() === dto.username.toLowerCase())) {
      throwError(409, 'DUPLICATE_USERNAME', 'Username already taken', 'username');
    }
    const passwordHash = await bcrypt.hash(dto.password, 10);
    const newUser: User = {
      id: randomUUID(),
      email: dto.email,
      username: dto.username,
      passwordHash,
      groupId: dto.groupId ?? 'superadmin-group',
      active: true,
      createdAt: new Date().toISOString(),
    };
    users.push(newUser);
    await storageService.write(this.path, users);
    return toPublicUser(newUser);
  }

  async updateUser(id: string, dto: UpdateUserDto): Promise<PublicUser> {
    const users = await storageService.read<User[]>(this.path);
    const idx = users.findIndex(u => u.id === id);
    if (idx === -1) throwError(404, 'NOT_FOUND', `User not found: ${id}`);
    if (dto.email !== undefined) {
      const conflict = users.find(u => u.id !== id && u.email.toLowerCase() === dto.email!.toLowerCase());
      if (conflict) throwError(409, 'DUPLICATE_EMAIL', 'Email already registered', 'email');
      users[idx].email = dto.email;
    }
    if (dto.username !== undefined) {
      const conflict = users.find(u => u.id !== id && u.username.toLowerCase() === dto.username!.toLowerCase());
      if (conflict) throwError(409, 'DUPLICATE_USERNAME', 'Username already taken', 'username');
      users[idx].username = dto.username;
    }
    if (dto.groupId !== undefined) users[idx].groupId = dto.groupId;
    if (dto.active !== undefined) users[idx].active = dto.active;
    if (dto.password !== undefined) {
      if (dto.password.length < 8) {
        throwError(400, 'VALIDATION_ERROR', 'Password must be at least 8 characters', 'password');
      }
      users[idx].passwordHash = await bcrypt.hash(dto.password, 10);
    }
    await storageService.write(this.path, users);
    return toPublicUser(users[idx]);
  }

  async deleteUser(id: string): Promise<void> {
    const users = await storageService.read<User[]>(this.path);
    const idx = users.findIndex(u => u.id === id);
    if (idx === -1) throwError(404, 'NOT_FOUND', `User not found: ${id}`);
    users.splice(idx, 1);
    await storageService.write(this.path, users);
  }

  async getRawByEmail(email: string): Promise<User | undefined> {
    const users = await storageService.read<User[]>(this.path);
    return users.find(u => u.email.toLowerCase() === email.toLowerCase());
  }

  async getRawById(id: string): Promise<User | undefined> {
    const users = await storageService.read<User[]>(this.path);
    return users.find(u => u.id === id);
  }

  async isEmpty(): Promise<boolean> {
    const users = await storageService.read<User[]>(this.path);
    return users.length === 0;
  }
}

export const userStorageService = new UserStorageService();

export class AuthService {
  async getUserById(id: string): Promise<PublicUser> {
    return userStorageService.getUserById(id);
  }

  async updateUser(id: string, dto: UpdateUserDto): Promise<PublicUser> {
    return userStorageService.updateUser(id, dto);
  }

  async register(email: string, username: string, password: string): Promise<{ token: string; user: PublicUser }> {
    const isFirst = await userStorageService.isEmpty();
    const groupId = isFirst ? 'superadmin-group' : 'superadmin-group'; // default; admins can change later
    const user = await userStorageService.createUser({ email, username, password, groupId });
    const token = await this.issueToken(user.id, email, username, groupId);
    return { token, user };
  }

  async login(email: string, password: string): Promise<{ token: string; user: PublicUser }> {
    const raw = await userStorageService.getRawByEmail(email);
    // Use constant-time comparison even if user not found to prevent user enumeration
    const hash = raw?.passwordHash ?? '$2b$10$invalidhashtopreventtimingattack';
    const match = await bcrypt.compare(password, hash);
    if (!raw || !match || !raw.active) {
      throwError(401, 'INVALID_CREDENTIALS', 'Invalid email or password');
    }
    const token = await this.issueToken(raw!.id, raw!.email, raw!.username, raw!.groupId);
    return { token, user: { id: raw!.id, email: raw!.email, username: raw!.username, groupId: raw!.groupId, active: raw!.active, createdAt: raw!.createdAt } };
  }

  private async issueToken(id: string, email: string, username: string, groupId: string): Promise<string> {
    const permissions = await groupService.resolvePermissions(groupId);
    const payload: JwtPayload = { id, email, username, groupId, permissions };
    return jwt.sign(payload, getJwtSecret(), {
      expiresIn: (process.env.JWT_EXPIRES_IN as jwt.SignOptions['expiresIn']) ?? '24h',
    });
  }

  verifyToken(token: string): JwtPayload {
    return jwt.verify(token, getJwtSecret()) as JwtPayload;
  }

  async refreshTokenForUserId(id: string): Promise<string> {
    const raw = await userStorageService.getRawById(id);
    if (!raw) {
      throwError(404, 'NOT_FOUND', `User not found: ${id}`);
    }
    return this.issueToken(raw!.id, raw!.email, raw!.username, raw!.groupId);
  }
}

export const authService = new AuthService();
