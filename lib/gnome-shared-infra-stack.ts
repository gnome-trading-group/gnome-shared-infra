import * as cdk from 'aws-cdk-lib';
import * as sns from 'aws-cdk-lib/aws-sns';
import * as events from 'aws-cdk-lib/aws-events';
import * as targets from 'aws-cdk-lib/aws-events-targets';
import { Construct } from 'constructs';
import { PIPELINES } from './config';
import { SlackBot } from './constructs/slack-bot';

export class GnomeSharedInfraStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const pipelineNotificationTopic = new sns.Topic(this, 'PipelineNotificationsTopic');

    PIPELINES.forEach(pipelineName => {
      // Pipeline-level events (Succeeded, Failed, Started)
      new events.Rule(this, `${pipelineName}ExecutionRule`, {
        eventPattern: {
          source: ['aws.codepipeline'],
          detailType: ['CodePipeline Pipeline Execution State Change'],
          detail: {
            pipeline: [pipelineName],
            state: ['SUCCEEDED', 'FAILED', 'STARTED'],
          },
        },
        targets: [new targets.SnsTopic(pipelineNotificationTopic)],
      });
    
      // Action-level events (Manual Approval)
      new events.Rule(this, `${pipelineName}ApprovalRule`, {
        eventPattern: {
          source: ['aws.codepipeline'],
          detailType: ['CodePipeline Action Execution State Change'],
          detail: {
            pipeline: [pipelineName],
            actionCategory: ['Approval'],
            state: ['STARTED'],
          },
        },
        targets: [new targets.SnsTopic(pipelineNotificationTopic)],
      });
    });

    new SlackBot(this, 'SlackBot', {
      topics: [pipelineNotificationTopic],
    });
  }
}
