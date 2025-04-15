import { GnomeAccount } from "@gnome-trading-group/gnome-shared-cdk";

export const PIPELINES: [string, GnomeAccount][] = [
  ["OrchestratorPipeline", GnomeAccount.InfraPipelines],
  ["RegistryPipeline", GnomeAccount.InfraPipelines],
];
