import nextConfig from "eslint-config-next/core-web-vitals";

export default [
  ...nextConfig,
  {
    ignores: ["node_modules/**", "terminal-server/**", ".next/**"],
  },
];
