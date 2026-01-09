import { GnomeAccount, Stage } from "@gnome-trading-group/gnome-shared-cdk";

export interface SharedInfraConfig {
  account: GnomeAccount;

  // Slack settings
  slackWorkspaceId: string;
  slackChannelConfigurationName: string;
  slackChannelId: string;

  // Pipelines to monitor
  pipelines: string[];
}

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
    ],
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

