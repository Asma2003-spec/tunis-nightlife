import { ConflictException, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { hash, verify } from '@node-rs/argon2';
import type { AuthResponse, PublicUser } from '@tn/contracts';
import { PrismaService } from '../prisma/prisma.service';
import type { JwtPayload } from './auth.types';

/** Hash factice vérifié quand l'email n'existe pas : le temps de réponse reste identique. */
let dummyHash: Promise<string> | undefined;
const getDummyHash = () => (dummyHash ??= hash('compte-inexistant-tunis-nightlife'));

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
  ) {}

  async register(input: { name: string; email: string; password: string }): Promise<AuthResponse> {
    const exists = await this.prisma.user.findUnique({ where: { email: input.email } });
    if (exists) throw new ConflictException('Un compte existe déjà avec cet email');

    const user = await this.prisma.user.create({
      data: {
        name: input.name,
        email: input.email,
        passwordHash: await hash(input.password), // Argon2id
        ageConfirmedAt: new Date(),
      },
      select: { id: true, name: true, email: true, role: true },
    });
    return this.issue(user);
  }

  async login(input: { email: string; password: string }): Promise<AuthResponse> {
    const user = await this.prisma.user.findFirst({
      where: { email: input.email, deletedAt: null },
    });
    // Toujours vérifier un hash pour ne pas révéler si l'email existe (timing)
    const valid = await verify(user?.passwordHash ?? (await getDummyHash()), input.password).catch(
      () => false,
    );
    if (!user || !valid) throw new UnauthorizedException('Email ou mot de passe incorrect');
    return this.issue({ id: user.id, name: user.name, email: user.email, role: user.role });
  }

  private async issue(user: PublicUser): Promise<AuthResponse> {
    const payload: JwtPayload = { sub: user.id, role: user.role };
    return { user, accessToken: await this.jwt.signAsync(payload) };
  }
}
