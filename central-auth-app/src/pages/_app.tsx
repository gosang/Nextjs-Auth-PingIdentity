import forgeRockInit from "@/libs/forgeRockInit";
import "@/styles/globals.css";
import type { AppProps } from "next/app";

// if (typeof window === "undefined") {
//   forgeRockInit();
// }
export default function App({ Component, pageProps }: AppProps) {
  return <Component {...pageProps} />;
}
