import { OAuthConfig } from "next-auth/providers/oauth";

interface ForgeRockProfile {
  sub: string;
  name?: string;
  given_name?: string;
  family_name?: string;
  email?: string;
}
export const ForgeRockProvider = (): OAuthConfig<ForgeRockProfile> => ({
  id: "forgerock",
  name: "ForgeRock",
  type: "oauth",
  wellKnown: `${process.env.FORGEROCK_BASE_URL}/oauth2/realms/root/realms/${process.env.FORGEROCK_REALM}/.well-known/openid-configuration`,
  authorization: {
    params: {
      scope: "openid profile email",
      //prompt: "login",
      response_type: "code",
      // client_id: process.env.FORGEROCK_CLIENT_ID,
      // redirect_uri: process.env.NEXTAUTH_URL + "/api/auth/callback/forgerock",
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
    };
  },
  clientId: process.env.FORGEROCK_CLIENT_ID,
});
