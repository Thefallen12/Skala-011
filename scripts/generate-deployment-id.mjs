import { randomUUID } from "node:crypto";
import { writeFileSync } from "node:fs";
import { resolve } from "node:path";

function sanitizeDeploymentId(value) {
  return value
    ?.trim()
    .replace(/[^A-Za-z0-9_-]+/g, "-")
    .replace(/^[-_]+|[-_]+$/g, "");
}

const configuredDeploymentId = sanitizeDeploymentId(process.env.NEXT_DEPLOYMENT_ID);
const deploymentVersion = sanitizeDeploymentId(process.env.DEPLOYMENT_VERSION) || "deployment";
const deploymentId =
  configuredDeploymentId || `${deploymentVersion}-${Date.now()}-${randomUUID()}`;

writeFileSync(resolve(process.cwd(), ".deployment-id"), `${deploymentId}\n`);
