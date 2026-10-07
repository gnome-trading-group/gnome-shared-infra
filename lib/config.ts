import { GnomeAccount, Stage } from "@gnome-trading-group/gnome-shared-cdk";

export interface SharedInfraConfig {
  account: GnomeAccount;

  // Slack settings
  slackWorkspaceId: string;
  slackChannelConfigurationName: string;
  slackChannelId: string;

  // Pipelines to monitor
  pipelines: string[];

  // Accounts whose controller System page may read this account's deploy pipelines (set only where they live).
  systemHealthReaders?: GnomeAccount[];
  // Accounts whose controller System page may approve or reject this account's pipeline approvals.
  systemHealthApprovers?: GnomeAccount[];
}

// The read-only role the controller's System page assumes to list deploy pipelines. gnome-controller refers to it by
// this name (SYSTEM_HEALTH_PIPELINES_ROLE in its cdk/lib/config.ts), so the two must match.
export const SYSTEM_HEALTH_PIPELINES_ROLE = "gnome-system-health-pipelines-read";
// The role the System page assumes to approve or reject a waiting pipeline approval; gnome-controller names it
// SYSTEM_HEALTH_APPROVALS_ROLE in its cdk/lib/config.ts.
export const SYSTEM_HEALTH_APPROVALS_ROLE = "gnome-system-health-pipelines-approve";

const defaultConfig = {
  slackWorkspaceId: "T08K71WNHSR",
  pipelines: [],
}

export const CONFIGS: { [stage in Stage]?:  SharedInfraConfig } = {
  [Stage.PIPELINES]: {
    ...defaultConfig,
    account: GnomeAccount.InfraPipelines,

    slackChannelConfigurationName: "gnome-alerts-pipelines",
    slackChannelId: "C08MU682NUQ",
    pipelines: [
      "OrchestratorPipeline",
      "RegistryPipeline",
      "ControllerPipeline",
      "WebsitePipeline",
      "SharedInfraPipeline",
      "MarketDataPipeline",
      "ClassifierPipeline",
      "LauncherPipeline",
    ],
    systemHealthReaders: [GnomeAccount.InfraDev, GnomeAccount.InfraProd],
    systemHealthApprovers: [GnomeAccount.InfraProd],
  },
  [Stage.DEV]: {
    ...defaultConfig,
    account: GnomeAccount.InfraDev,

    slackChannelConfigurationName: "gnome-alerts-dev",
    slackChannelId: "C08KX2GAUE4",
  },
  [Stage.STAGING]: {
    ...defaultConfig,
    account: GnomeAccount.InfraStaging,

    slackChannelConfigurationName: "gnome-alerts-staging",
    slackChannelId: "C08KL9PGAQZ",
  },
  [Stage.PROD]: {
    ...defaultConfig,
    account: GnomeAccount.InfraProd,

    slackChannelConfigurationName: "gnome-alerts-prod",
    slackChannelId: "C08KD27QZKN",
  },
}

export const GITHUB_REPO = "gnome-trading-group/gnome-shared-infra";
export const GITHUB_BRANCH = "main";

