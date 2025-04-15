import * as cdk from 'aws-cdk-lib';
import * as sns from 'aws-cdk-lib/aws-sns';
import * as codestarnotifications from 'aws-cdk-lib/aws-codestarnotifications';
import * as codepipeline from 'aws-cdk-lib/aws-codepipeline';
import { Construct } from 'constructs';
import { SlackBot } from './constructs/slack-bot';
import { GnomeAccount } from '@gnome-trading-group/gnome-shared-cdk';
import { PIPELINES } from './config';

export class GnomeSharedInfraStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const pipelineNotificationTopic = new sns.Topic(this, 'PipelineNotificationsTopic');
    for (const [name, account] of PIPELINES) {
      this.addPipelineNotifications(name, account, pipelineNotificationTopic);
    }

    new SlackBot(this, 'SlackBot', {
      topics: [pipelineNotificationTopic],
    });
  }

  private addPipelineNotifications(
    pipelineName: string,
    account: GnomeAccount,
    topic: sns.ITopic,
  ) {
    const pipeline =  codepipeline.Pipeline.fromPipelineArn(
      this,
      `${pipelineName}Reference`,
      `arn:aws:codepipeline:${account.region}:${account.accountId}:${pipelineName}`,
    );

    new codestarnotifications.NotificationRule(this, `${pipelineName}NotificationRule`, {
      source: pipeline,
      events: [
        'codepipeline-pipeline-pipeline-execution-started',
        'codepipeline-pipeline-pipeline-execution-succeeded',
        'codepipeline-pipeline-pipeline-execution-failed',
        'codepipeline-pipeline-pipeline-execution-canceled',
        'codepipeline-pipeline-pipeline-execution-superseded',
        'codepipeline-pipeline-manual-approval-needed',
      ],
      targets: [topic],
    });
  }
}
