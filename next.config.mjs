import { existsSync, readFileSync } from "node:fs";

const deploymentIdPath = new URL("./.deployment-id", import.meta.url);
const generatedDeploymentId = existsSync(deploymentIdPath)
    ? readFileSync(deploymentIdPath, "utf8").trim()
    : undefined;

/** @type {import('next').NextConfig} */
const nextConfig = {
    output: "standalone",
    deploymentId: generatedDeploymentId || process.env.NEXT_DEPLOYMENT_ID || process.env.DEPLOYMENT_VERSION,
    reactStrictMode: false,
    serverExternalPackages: ["puppeteer-core", "@sparticuz/chromium"],
    images: {
        unoptimized: true,
        remotePatterns: [
            { protocol: "https", hostname: "res.cloudinary.com", pathname: "/**" }
        ]
    },
    experimental: {
        cpus: 2,
        turbopackPluginRuntimeStrategy: "workerThreads",
        serverActions: {
            bodySizeLimit: "27mb"
        }
    }
};

export default nextConfig;
