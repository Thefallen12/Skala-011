import { randomUUID } from "node:crypto";
import { writeFileSync } from "node:fs";
import { resolve } from "node:path";

const configuredDeploymentId = process.env.NEXT_DEPLOYMENT_ID?.trim();
const deploymentVersion = process.env.DEPLOYMENT_VERSION?.trim() || "deployment";
const deploymentId =
  configuredDeploymentId || `${deploymentVersion}-${Date.now()}-${randomUUID()}`;

writeFileSync(resolve(process.cwd(), ".deployment-id"), `${deploymentId}\n`);
