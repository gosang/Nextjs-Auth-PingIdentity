import { Config } from "@forgerock/javascript-sdk";
//import getConfig from "next/config";

export default function forgeRockInit() {
  const {
    FORGEROCK_CLIENT_ID,
    FORGEROCK_REDIRECT_URI,
    FORGEROCK_BASE_URL,
    FORGEROCK_REALM,
    FORGEROCK_LOGIN,
  } = process.env;
  //const { basePath } = getConfig().publicRuntimeConfig;

  Config.set({
    clientId: FORGEROCK_CLIENT_ID,
    redirectUri: FORGEROCK_REDIRECT_URI,
    scope: "openid profile email",
    serverConfig: {
      baseUrl: FORGEROCK_BASE_URL as string,
      timeout: 30000,
    },
    realmPath: FORGEROCK_REALM,
    tree: FORGEROCK_LOGIN,
  });
}
