import type { NextConfig } from "next";

const isGitHubPages = process.env.GITHUB_ACTIONS === "true";

const nextConfig: NextConfig = {
  output: "export",
  basePath: isGitHubPages ? "/frameline-league-scores" : "",
  assetPrefix: isGitHubPages ? "/frameline-league-scores/" : "",
  trailingSlash: true,
};

export default nextConfig;
