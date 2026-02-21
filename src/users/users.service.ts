import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class UsersService {
	constructor(private prisma: PrismaService) {}

	async findAll() {
		return this.prisma.user.findMany({
			orderBy: { email: 'asc' },
			select: {
				id: true,
				email: true,
				name: true,
				roles: true,
				unidade: true,
				classe: true,
				createdAt: true,
			},
		});
	}

	async findByRole(role: string) {
		return this.prisma.user.findMany({
			where: { roles: { has: role as any } },
			orderBy: { email: 'asc' },
			select: {
				id: true,
				email: true,
				name: true,
				roles: true,
				unidade: true,
				classe: true,
				createdAt: true,
			},
		});
	}

	async findInstrutores() {
		return this.findByRole('INSTRUTOR');
	}

	async findConselheiros() {
		return this.findByRole('CONSELHEIRO');
	}

	async update(id: number, data: { name?: string; roles?: string[]; unidade?: string | null; classe?: string | null }) {
		// Prisma enums require casting when using plain strings from HTTP payloads
		return this.prisma.user.update({ where: { id }, data: data as any });
	}

	async updateProfile(id: number, data: { name?: string; avatarUrl?: string }) {
		// Usuário atualiza o próprio perfil (sem poder alterar unidade, classe ou roles)
		return this.prisma.user.update({
			where: { id },
			data: data as any,
			select: {
				id: true,
				email: true,
				name: true,
				avatarUrl: true,
				roles: true,
				unidade: true,
				classe: true,
			},
		});
	}
}

