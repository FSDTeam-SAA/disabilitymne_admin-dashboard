import type { NextAuthOptions, User } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import type { JWT } from "next-auth/jwt";

type LoginResponse = {
  success: boolean;
  message?: string;
  data?: {
    accessToken: string;
    refreshToken: string;
    user: {
      id?: string;
      _id?: string;
      email?: string;
      role?: string;
      firstName?: string;
      lastName?: string;
      profileImage?: string | null;
      [key: string]: unknown;
    };
  };
};

function getApiBaseUrl() {
  const raw = process.env.NEXTPUBLICBASEURL || process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:8000/api/v1";
  return raw.endsWith("/api/v1") ? raw : `${raw.replace(/\/$/, "")}/api/v1`;
}

function base64UrlToBase64(input: string) {
  const normalized = input.replace(/-/g, "+").replace(/_/g, "/");
  const pad = normalized.length % 4;
  if (pad === 0) return normalized;
  return normalized + "=".repeat(4 - pad);
}

function getAccessTokenExpiresAt(accessToken: string) {
  try {
    const tokenParts = accessToken.split(".");
    if (tokenParts.length < 2) return Date.now() + 14 * 60 * 1000;
    const payload = JSON.parse(Buffer.from(base64UrlToBase64(tokenParts[1]), "base64").toString("utf8"));
    if (!payload?.exp) return Date.now() + 14 * 60 * 1000;
    return Number(payload.exp) * 1000;
  } catch {
    return Date.now() + 14 * 60 * 1000;
  }
}

async function refreshAccessToken(token: JWT): Promise<JWT> {
  try {
    const refreshToken = String(token.refreshToken || "");
    if (!refreshToken) {
      return { ...token, error: "RefreshAccessTokenError" };
    }

    const response = await fetch(`${getApiBaseUrl()}/auth/refresh-token`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refreshToken }),
      cache: "no-store",
    });

    const payload = (await response.json()) as LoginResponse;
    const nextAccessToken = payload?.data?.accessToken;

    if (!response.ok || !nextAccessToken) {
      return { ...token, error: "RefreshAccessTokenError" };
    }

    const nextUser = payload?.data?.user || (token.user as Record<string, unknown> | undefined) || {};
    const userId = String((nextUser?.id as string) || (nextUser?._id as string) || token._id || "");

    return {
      ...token,
      accessToken: nextAccessToken,
      refreshToken: payload?.data?.refreshToken || refreshToken,
      accessTokenExpires: getAccessTokenExpiresAt(nextAccessToken),
      role: String(nextUser?.role || token.role || ""),
      _id: userId,
      user: {
        ...nextUser,
        id: userId,
      },
      error: undefined,
    };
  } catch {
    return { ...token, error: "RefreshAccessTokenError" };
  }
}

export const authOptions: NextAuthOptions = {
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const email = String(credentials?.email || "").trim().toLowerCase();
        const password = String(credentials?.password || "").trim();

        if (!email || !password) {
          throw new Error("Email and password are required.");
        }

        const response = await fetch(`${getApiBaseUrl()}/auth/login`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, password }),
          cache: "no-store",
        });

        const payload = (await response.json()) as LoginResponse;

        if (!response.ok || !payload?.data?.accessToken || !payload?.data?.user) {
          throw new Error(payload?.message || "Invalid credentials.");
        }

        const userPayload = payload.data.user;
        const role = String(userPayload.role || "");
        const userId = String(userPayload.id || userPayload._id || "");

        if (!userId) {
          throw new Error("Invalid user payload from server.");
        }

        if (role !== "admin") {
          throw new Error("Only admin users can sign in here.");
        }

        const resolvedEmail = String(userPayload.email || email);
        const resolvedName = [userPayload.firstName, userPayload.lastName].filter(Boolean).join(" ").trim() || resolvedEmail;

        return {
          id: userId,
          email: resolvedEmail,
          name: resolvedName,
          role,
          _id: userId,
          accessToken: payload.data.accessToken,
          refreshToken: payload.data.refreshToken,
          accessTokenExpires: getAccessTokenExpiresAt(payload.data.accessToken),
          user: {
            ...userPayload,
            id: userId,
          },
        } as User;
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        const incoming = user as User & {
          accessToken?: string;
          refreshToken?: string;
          accessTokenExpires?: number;
          role?: string;
          _id?: string;
          user?: Record<string, unknown>;
        };

        return {
          ...token,
          accessToken: incoming.accessToken,
          refreshToken: incoming.refreshToken,
          accessTokenExpires: incoming.accessTokenExpires,
          role: incoming.role,
          _id: incoming._id,
          user: incoming.user,
        };
      }

      if (typeof token.accessTokenExpires === "number" && Date.now() < token.accessTokenExpires - 30_000) {
        return token;
      }

      return refreshAccessToken(token);
    },
    async session({ session, token }) {
      session.user = {
        ...session.user,
        role: String(token.role || ""),
        _id: String(token._id || ""),
        raw: token.user,
      };
      session.accessToken = String(token.accessToken || "");
      session.refreshToken = String(token.refreshToken || "");
      session.error = token.error as string | undefined;

      return session;
    },
  },
};

