/** @type {import('next').NextConfig} */
const nextConfig = {
    output: "standalone",
    deploymentId: process.env.DEPLOYMENT_VERSION,
    reactStrictMode: false,
    images: {
        unoptimized: true,
        remotePatterns: [
            { protocol: "https", hostname: "res.cloudinary.com", pathname: "/**" }
        ]
    },
    experimental: {
        cpus: 2,
        serverActions: {
            bodySizeLimit: "27mb"
        }
    }
};

export default nextConfig;
