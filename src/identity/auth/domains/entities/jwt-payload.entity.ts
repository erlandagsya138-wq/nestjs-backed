// src/auth/domains/entities/jwt-payload.entity.ts
export class JwtPayload {
  sub: string = '';
  email: string = '';
  role: string = '';
  iss?: string;
  aud?: string | string[];
  iat?: number;
  exp?: number;
}

export class AuthenticatedUser {
  sub: string = '';
  email: string = '';
  role: string = '';
}