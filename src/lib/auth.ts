import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { compare, hash } from "bcrypt";
import { db } from "./db";
import { users } from "./db/schema";
import { eq } from "drizzle-orm";

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    Credentials({
      name: "Credentials",
      credentials: {
        username: { label: "Username", type: "text" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.username || !credentials?.password) {
          return null;
        }

        const username = credentials.username as string;
        const password = credentials.password as string;

        // Find user in database
        const user = await db.query.users.findFirst({
          where: eq(users.username, username),
        });

        if (!user) {
          // If no user exists and this is the default admin, create it
          if (
            username === process.env.ADMIN_USERNAME &&
            password === process.env.ADMIN_PASSWORD
          ) {
            const passwordHash = await hash(password, 12);
            const [newUser] = await db
              .insert(users)
              .values({
                username,
                passwordHash,
              })
              .returning();

            return {
              id: String(newUser.id),
              name: newUser.username,
            };
          }
          return null;
        }

        // Verify password
        const isValid = await compare(password, user.passwordHash);
        if (!isValid) {
          return null;
        }

        // Update last login
        await db
          .update(users)
          .set({ lastLogin: new Date() })
          .where(eq(users.id, user.id));

        return {
          id: String(user.id),
          name: user.username,
        };
      },
    }),
  ],
  pages: {
    signIn: "/login",
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
      }
      return session;
    },
  },
  session: {
    strategy: "jwt",
    maxAge: 24 * 60 * 60, // 24 hours
  },
});
