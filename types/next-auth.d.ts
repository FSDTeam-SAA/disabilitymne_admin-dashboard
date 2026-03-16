import { type DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    accessToken: string;
    refreshToken?: string;
    error?: string;
    user: DefaultSession["user"] & {
      role: string;
      _id: string;
      raw?: unknown;
    };
  }

  interface User {
    role?: string;
    _id?: string;
    accessToken?: string;
    refreshToken?: string;
    accessTokenExpires?: number;
    user?: unknown;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    accessToken?: string;
    refreshToken?: string;
    accessTokenExpires?: number;
    role?: string;
    _id?: string;
    user?: unknown;
    error?: string;
  }
}
