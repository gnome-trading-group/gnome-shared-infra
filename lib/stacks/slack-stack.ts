import * as cdk from "aws-cdk-lib";
import * as chatbot from 'aws-cdk-lib/aws-chatbot';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as sns from 'aws-cdk-lib/aws-sns';
import { Construct } from 'constructs';
import { SharedInfraConfig } from "../config";

export interface SlackStackProps extends cdk.StackProps {
  config: SharedInfraConfig;
}

export class SlackStack extends cdk.Stack {

  public readonly slackSnsTopic: sns.Topic;

  constructor(scope: Construct, id: string, props: SlackStackProps) {
    super(scope, id, props);

    this.slackSnsTopic = new sns.Topic(this, 'SlackSnsTopic');

    const role = new iam.Role(this, 'ChatBotRole', {
      assumedBy: new iam.ServicePrincipal('chatbot.amazonaws.com'),
      description: 'Role for AWS ChatBot',
      managedPolicies: [
        iam.ManagedPolicy.fromAwsManagedPolicyName('CloudWatchReadOnlyAccess'),
        iam.ManagedPolicy.fromAwsManagedPolicyName('AWSCodePipeline_FullAccess'),
      ]
    });

    new chatbot.SlackChannelConfiguration(this, 'SlackChannelConfiguration', {
      slackChannelConfigurationName: props.config.slackChannelConfigurationName,
      slackWorkspaceId: props.config.slackWorkspaceId,
      slackChannelId: props.config.slackChannelId,
      notificationTopics: [this.slackSnsTopic],
      role,
    });
  }
}
