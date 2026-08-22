/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: [
    '@recoverai/config',
    '@recoverai/domain',
    '@recoverai/validation',
  ],
};

export default nextConfig;
