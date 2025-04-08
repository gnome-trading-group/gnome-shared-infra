#!/usr/bin/env node
import * as cdk from 'aws-cdk-lib';
import { GnomeSharedInfraStack } from '../lib/gnome-shared-infra-stack';
import { GnomeAccount } from '@gnome-trading-group/gnome-shared-cdk';

const app = new cdk.App();
new GnomeSharedInfraStack(app, 'GnomeSharedInfraStack', {
  env: GnomeAccount.InfraPipelines,
});
