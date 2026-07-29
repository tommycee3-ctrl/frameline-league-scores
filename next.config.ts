import type { NextConfig } from "next";

const isGitHubPages = process.env.GITHUB_ACTIONS === "true";

const nextConfig: NextConfig = {
  output: "export",
  basePath: isGitHubPages ? "/west-lanes-bowling" : "",
  assetPrefix: isGitHubPages ? "/west-lanes-bowling/" : "",
  trailingSlash: true,
};

export default nextConfig;
