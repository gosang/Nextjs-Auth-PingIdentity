import NextAuth, { AuthOptions } from "next-auth";
import { OAuthConfig } from "next-auth/providers/oauth";

interface ForgeRockProfile {
  sub: string;
  name?: string;
  given_name?: string;
  family_name?: string;
  email?: string;
  picture?: string;
}

// Custom ForgeRock Provider Configuration
const ForgeRockProvider = (): OAuthConfig<ForgeRockProfile> => ({
  id: "forgerock",
  name: "ForgeRock",
  type: "oauth",
  wellKnown: `${process.env.FORGEROCK_BASE_URL}/oauth2/realms/root/realms/${process.env.FORGEROCK_REALM}/.well-known/openid-configuration`,
  authorization: {
    params: {
      scope: "openid profile email",
      //prompt: "login",
      response_type: "code",
      client_id: process.env.FORGEROCK_CLIENT_ID,
      redirect_uri: process.env.NEXTAUTH_URL + "/api/auth/callback/forgerock",
    },
  },
  token: {
    async request({ client, params, checks, provider }) {
      const response = await client.oauthCallback(
        provider.callbackUrl,
        params,
        checks,
        {
          code_verifier: checks.code_verifier,
        }
      );
      return { tokens: response };
    },
  },
  userinfo: {
    url: `${process.env.FORGEROCK_BASE_URL}/oauth2/${process.env.FORGEROCK_REALM}/userinfo`,
    async request({ tokens, provider }) {
      const response = await fetch(provider.userinfo?.url as string, {
        headers: {
          Authorization: `Bearer ${tokens.access_token}`,
        },
      });

      if (!response.ok) {
        throw new Error("Failed to fetch user info");
      }

      return await response.json();
    },
  },
  profile(profile) {
    return {
      id: profile.sub,
      name: profile.name,
      firstName: profile.given_name,
      lastName: profile.family_name,
      email: profile.email,
      image: profile.picture,
    };
  },
  clientId: process.env.FORGEROCK_CLIENT_ID,
  // clientSecret: process.env.FORGEROCK_CLIENT_SECRET,
});

// Types for session data
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

// NextAuth configuration
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
