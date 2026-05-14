import { AuthError, JWTSessionError } from "@auth/core/errors";
import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { getConfiguredOAuthProviders } from "@/lib/oauth-providers";
import { prisma } from "@/lib/prisma";
import type { UserRole } from "@/lib/types";

const credentialsSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

/** Same order as next-auth `setEnvDefaults`, plus empty-string safe fallback for local dev. */
const authSecret =
  process.env.AUTH_SECRET?.trim() ||
  process.env.NEXTAUTH_SECRET?.trim() ||
  "stock-center-dev-secret";

const red = "\x1b[31m";
const reset = "\x1b[0m";

export const { handlers, auth, signIn, signOut } = NextAuth({
  trustHost: true,
  secret: authSecret,
  logger: {
    error(error) {
      if (error instanceof JWTSessionError) {
        return;
      }
      const name = error instanceof AuthError ? error.type : error.name;
      console.error(`${red}[auth][error]${reset} ${name}: ${error.message}`);
      if (
        error.cause &&
        typeof error.cause === "object" &&
        "err" in error.cause &&
        error.cause.err instanceof Error
      ) {
        const { err, ...data } = error.cause as { err: Error } & Record<
          string,
          unknown
        >;
        console.error(`${red}[auth][cause]${reset}:`, err.stack);
        if (Object.keys(data).length > 0) {
          console.error(`${red}[auth][details]${reset}:`, JSON.stringify(data, null, 2));
        }
      } else if (error.stack) {
        console.error(error.stack.replace(/.*/, "").substring(1));
      }
    },
  },
  session: {
    strategy: "jwt",
  },
  pages: {
    signIn: "/login",
  },
  providers: [
    ...getConfiguredOAuthProviders(),
    Credentials({
      name: "Credenciais",
      credentials: {
        email: { label: "E-mail", type: "email" },
        password: { label: "Senha", type: "password" },
      },
      async authorize(credentials) {
        const parsed = credentialsSchema.safeParse(credentials);

        if (!parsed.success || !prisma) {
          return null;
        }

        const user = await prisma.user.findUnique({
          where: { email: parsed.data.email.toLowerCase() },
        });

        if (!user?.passwordHash) {
          return null;
        }

        const passwordMatches = await bcrypt.compare(
          parsed.data.password,
          user.passwordHash,
        );

        if (!passwordMatches) {
          return null;
        }

        const role: UserRole = user.role === "ADMIN" ? "ADMIN" : "CUSTOMER";

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role,
        };
      },
    }),
  ],
  callbacks: {
    async signIn({ user, account }) {
      if (account?.type !== "oauth") {
        return true;
      }

      const email = user.email?.toLowerCase();
      if (!email) {
        return false;
      }

      await prisma.user.upsert({
        where: { email },
        create: {
          email,
          name: user.name ?? null,
          passwordHash: null,
        },
        update: {
          name: user.name ?? undefined,
        },
      });

      return true;
    },
    async jwt({ token, user, account }) {
      if (user) {
        if (account?.type === "oauth" && user.email) {
          const dbUser = await prisma.user.findUnique({
            where: { email: user.email.toLowerCase() },
          });

          if (dbUser) {
            token.sub = dbUser.id;
            token.role = dbUser.role === "ADMIN" ? "ADMIN" : "CUSTOMER";
          }
        } else if (account?.type === "credentials") {
          token.sub = String(user.id ?? token.sub ?? "");
          const r = "role" in user && user.role ? user.role : "CUSTOMER";
          token.role = r === "ADMIN" ? "ADMIN" : "CUSTOMER";
          if (user.name !== undefined) token.name = user.name;
          if (user.email !== undefined) token.email = user.email;
        } else if ("role" in user && user.role) {
          token.role = user.role;
        }
      }

      return token;
    },
    async session({ session, token }) {
      if (session.user && token.sub) {
        session.user.id = token.sub;
        session.user.role = (token.role as UserRole | undefined) || "CUSTOMER";

        let name: string | null | undefined;
        let email: string | null | undefined;
        let profileImage: string | null = null;

        try {
          const row = await prisma.user.findUnique({
            where: { id: token.sub },
            select: { name: true, email: true, profileImage: true },
          });
          if (row) {
            name = row.name ?? undefined;
            email = row.email ?? undefined;
            profileImage = row.profileImage ?? null;
          }
        } catch {
          try {
            const row = await prisma.user.findUnique({
              where: { id: token.sub },
              select: { name: true, email: true },
            });
            if (row) {
              name = row.name ?? undefined;
              email = row.email ?? undefined;
            }
          } catch {
            /* banco indisponivel ou schema desatualizado */
          }
        }

        const nextUser = session.user as {
          name?: string | null;
          email?: string | null;
          profileImage: string | null;
        };
        nextUser.name = name ?? (token.name as string | null | undefined) ?? null;
        nextUser.email = email ?? (token.email as string | null | undefined) ?? null;
        nextUser.profileImage = profileImage;
      }

      return session;
    },
  },
});
