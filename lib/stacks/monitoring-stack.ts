import * as cdk from "aws-cdk-lib";
import * as sns from 'aws-cdk-lib/aws-sns';
import * as codestarnotifications from 'aws-cdk-lib/aws-codestarnotifications';
import * as codepipeline from 'aws-cdk-lib/aws-codepipeline';
import { Construct } from 'constructs';
import { SharedInfraConfig } from "../config";

export interface MonitoringStackProps extends cdk.StackProps {
  config: SharedInfraConfig;
  slackSnsTopic: sns.Topic;
}

export class MonitoringStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: MonitoringStackProps) {
    super(scope, id, props);

    for (const pipelineName of props.config.pipelines) {
      const pipeline = codepipeline.Pipeline.fromPipelineArn(
        this,
        `${pipelineName}Reference`,
        `arn:aws:codepipeline:${props.config.account.region}:${props.config.account.accountId}:${pipelineName}`,
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
        targets: [props.slackSnsTopic],
      });
    }
  }
}