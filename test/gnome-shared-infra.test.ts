import * as cdk from 'aws-cdk-lib';
import { Template } from 'aws-cdk-lib/assertions';
import { GnomeAccount } from '@gnome-trading-group/gnome-shared-cdk';
import { SYSTEM_HEALTH_APPROVALS_ROLE, SYSTEM_HEALTH_PIPELINES_ROLE } from '../lib/config';
import { SystemHealthAccessStack } from '../lib/stacks/system-health-access-stack';

test("the System page reads pipelines from dev and prod, and approves only from prod", () => {
  const app = new cdk.App();
  const stack = new SystemHealthAccessStack(app, 'Access', {
    env: GnomeAccount.InfraPipelines.environment,
    readers: [GnomeAccount.InfraDev, GnomeAccount.InfraProd],
    approvers: [GnomeAccount.InfraProd],
  });
  const template = Template.fromStack(stack);
  const roles = Object.values(template.findResources('AWS::IAM::Role')) as { Properties: Record<string, any> }[];
  const role = roles.find(r => r.Properties.RoleName === SYSTEM_HEALTH_PIPELINES_ROLE)!;
  expect(role.Properties.RoleName).toBe(SYSTEM_HEALTH_PIPELINES_ROLE);
  const trusted = role.Properties.AssumeRolePolicyDocument.Statement.map((s: any) => s.Condition.ArnLike['aws:PrincipalArn']);
  expect(trusted).toEqual([
    `arn:aws:iam::${GnomeAccount.InfraDev.accountId}:role/*SystemHealth*`,
    `arn:aws:iam::${GnomeAccount.InfraProd.accountId}:role/*SystemHealth*`,
  ]);
  const policies = Object.values(template.findResources('AWS::IAM::Policy')) as { Properties: Record<string, any> }[];
  const actionsOf = (roleId: string) => policies
    .filter(p => p.Properties.Roles.some((r: any) => r.Ref.startsWith(roleId)))
    .flatMap(p => p.Properties.PolicyDocument.Statement.flatMap((s: any) => [s.Action].flat()));
  expect(actionsOf('SystemHealthPipelinesReadRole').every((a: string) => /^codepipeline:(List|Get)/.test(a))).toBe(true);

  // Approving is a separate role that only prod's System Lambda may assume, and it can do nothing else.
  const approve = roles.find(r => r.Properties.RoleName === SYSTEM_HEALTH_APPROVALS_ROLE)!;
  expect(approve.Properties.AssumeRolePolicyDocument.Statement.map((s: any) => s.Condition.ArnLike['aws:PrincipalArn']))
    .toEqual([`arn:aws:iam::${GnomeAccount.InfraProd.accountId}:role/*SystemHealth*`]);
  expect(actionsOf('SystemHealthPipelinesApproveRole')).toEqual(['codepipeline:PutApprovalResult']);
});
