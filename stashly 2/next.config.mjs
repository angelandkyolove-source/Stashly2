/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [{ protocol: "https", hostname: "**.public.blob.vercel-storage.com" }],
  },
  experimental: { serverActions: { bodySizeLimit: "4mb" } },
};
export default nextConfig;
