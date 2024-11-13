import { ForgeRockProvider } from "@/providers/forgeRock";
import NextAuth, { AuthOptions } from "next-auth";
interface ExtendedSession {
  accessToken?: string;
  error?: string;
  user?: {
    id?: string;
    name?: string;
    email?: string;
    image?: string;
  };
}

export const authOptions: AuthOptions = {
  providers: [ForgeRockProvider()],

  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },

  callbacks: {
    async jwt({ token, account, profile }) {
      if (account) {
        token.accessToken = account.access_token;
        token.refreshToken = account.refresh_token;
        token.expiresAt = account.expires_at;
        token.idToken = account.id_token;

        if (profile) {
          token.profile = profile;
        }
      }

      // Handle token refresh
      if (token.expiresAt && Date.now() >= token.expiresAt * 1000) {
        try {
          const response = await fetch(
            `${process.env.FORGEROCK_BASE_URL}/oauth2/${process.env.FORGEROCK_REALM}/access_token`,
            {
              method: "POST",
              headers: {
                "Content-Type": "application/x-www-form-urlencoded",
              },
              body: new URLSearchParams({
                grant_type: "refresh_token",
                client_id: process.env.FORGEROCK_CLIENT_ID!,
                client_secret: process.env.FORGEROCK_CLIENT_SECRET!,
                refresh_token: token.refreshToken as string,
              }),
            }
          );

          const tokens = await response.json();

          if (!response.ok) throw tokens;

          return {
            ...token,
            accessToken: tokens.access_token,
            refreshToken: tokens.refresh_token ?? token.refreshToken,
            expiresAt: Math.floor(Date.now() / 1000 + tokens.expires_in),
          };
        } catch (error) {
          console.error("Error refreshing access token", error);
          return { ...token, error: "RefreshAccessTokenError" };
        }
      }

      return token;
    },

    async session({ session, token }): Promise<ExtendedSession> {
      if (token) {
        return {
          ...session,
          accessToken: token.accessToken as string,
          error: token.error,
          user: {
            ...session.user,
            id: token.sub,
          },
        };
      }
      return session;
    },
  },

  pages: {
    signIn: process.env.CENTRALIZED_AUTH_URL,
    error: "/auth/error",
  },

  debug: process.env.NODE_ENV === "development",
};

export default NextAuth(authOptions);
