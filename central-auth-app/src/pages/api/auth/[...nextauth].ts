import { NextApiRequest, NextApiResponse } from "next";
import {
  Config,
  TokenManager,
  UserManager,
  FRAuth,
  FRStep,
  FRLoginFailure,
} from "@forgerock/javascript-sdk";

// Configure ForgeRock SDK
Config.set({
  clientId: process.env.FORGEROCK_CLIENT_ID!,
  redirectUri: process.env.FORGEROCK_REDIRECT_URI!,
  scope: "openid profile email",
  serverConfig: {
    baseUrl: process.env.FORGEROCK_BASE_URL!,
    timeout: 30000,
  },
});

// Type definitions
interface AuthResponse {
  success: boolean;
  redirectUrl?: string;
  error?: string;
}

interface LoginRequest {
  action: string;
  redirectUri?: string;
  username?: string;
  password?: string;
}

// Auth handler
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<AuthResponse>
) {
  if (req.method !== "POST") {
    return res
      .status(405)
      .json({ success: false, error: "Method not allowed" });
  }

  try {
    const { action, redirectUri, username, password }: LoginRequest = req.body;

    switch (action) {
      case "login":
        // Start authentication process
        const step = await FRAuth.next();

        if (username && password) {
          // Submit credentials
          step.setCallbacks([
            {
              type: "NameCallback",
              input: [{ name: "IDToken1", value: username }],
            },
            {
              type: "PasswordCallback",
              input: [{ name: "IDToken2", value: password }],
            },
          ]);

          const loginStep = await FRAuth.next(step);

          if (loginStep.successfulLogin) {
            // Generate PKCE challenge and get tokens
            const tokens = await TokenManager.getTokens({
              query: {
                code_challenge_method: "S256",
                state: redirectUri, // Store redirectUri in state
              },
            });

            // Store tokens securely
            await TokenManager.setTokens(tokens);

            // Get user info
            const user = await UserManager.getCurrentUser();

            // Redirect to the client application
            return res.status(200).json({
              success: true,
              redirectUrl: `${redirectUri}?token=${tokens.accessToken}`,
            });
          } else {
            return res.status(401).json({
              success: false,
              error: "Invalid credentials",
            });
          }
        }

        return res.status(400).json({
          success: false,
          error: "Username and password are required",
        });

      case "logout":
        await TokenManager.deleteTokens();
        return res.status(200).json({ success: true });

      default:
        return res.status(400).json({
          success: false,
          error: "Invalid action",
        });
    }
  } catch (error) {
    console.error("Auth error:", error);
    if (error instanceof FRLoginFailure) {
      return res.status(401).json({
        success: false,
        error: "Authentication failed: " + error.message,
      });
    }
    return res.status(500).json({
      success: false,
      error: "Authentication failed",
    });
  }
}
