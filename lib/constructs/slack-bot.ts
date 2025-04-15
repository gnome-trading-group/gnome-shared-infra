import * as chatbot from 'aws-cdk-lib/aws-chatbot';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as sns from 'aws-cdk-lib/aws-sns';
import { Construct } from "constructs";

export interface SlackBotProps {
  topics: sns.ITopic[];
}

export class SlackBot extends Construct {

  constructor(scope: Construct, id: string, props: SlackBotProps) {
    super(scope, id);

    const role = new iam.Role(this, 'ChatBotRole', {
      assumedBy: new iam.ServicePrincipal('chatbot.amazonaws.com'),
      description: 'Role for AWS ChatBot',
      managedPolicies: [
        iam.ManagedPolicy.fromAwsManagedPolicyName('CloudWatchReadOnlyAccess'),
        iam.ManagedPolicy.fromAwsManagedPolicyName('AWSCodePipeline_FullAccess'),
      ]
    });

    new chatbot.SlackChannelConfiguration(this, 'SlackChannelConfiguration', {
      slackChannelConfigurationName: "gnome-alerts-pipelines",
      slackWorkspaceId: 'T08K71WNHSR',
      slackChannelId: 'C08MU682NUQ',
      notificationTopics: props.topics,
      role,
    });
  }

}