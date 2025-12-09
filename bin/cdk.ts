#!/usr/bin/env node
import * as cdk from 'aws-cdk-lib';
import { GnomeAccount } from '@gnome-trading-group/gnome-shared-cdk';
import { SharedInfraPipelineStack } from '../lib/shared-infra-pipeline-stack';

const app = new cdk.App();
new SharedInfraPipelineStack(app, 'SharedInfraPipelineStack', {
  env: GnomeAccount.InfraPipelines,
});
