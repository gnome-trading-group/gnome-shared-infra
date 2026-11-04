import * as cdk from "aws-cdk-lib";
import * as iam from "aws-cdk-lib/aws-iam";
import { Construct } from "constructs";
import { GnomeAccount } from "@gnome-trading-group/gnome-shared-cdk";
import {
  SYSTEM_APPROVALS_LAMBDA_ROLE, SYSTEM_HEALTH_APPROVALS_ROLE, SYSTEM_HEALTH_LAMBDA_ROLE, SYSTEM_HEALTH_PIPELINES_ROLE,
} from "../config";

export interface SystemHealthAccessStackProps extends cdk.StackProps {
  readers: GnomeAccount[];
  approvers: GnomeAccount[];
}

// Lets the controller's System page in other accounts see this account's deploy pipelines and, from the accounts
// trusted to, approve or reject what's waiting. Each role trusts exactly one of the page's Lambda roles, by name, and
// can do only its one job.
export class SystemHealthAccessStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: SystemHealthAccessStackProps) {
    super(scope, id, props);

    const read = this.roleFor("SystemHealthPipelinesReadRole", SYSTEM_HEALTH_PIPELINES_ROLE,
      "Read-only access to deploy pipelines for the controller's System page", SYSTEM_HEALTH_LAMBDA_ROLE, props.readers);
    read.addToPolicy(new iam.PolicyStatement({
      actions: [
        "codepipeline:ListPipelines",
        "codepipeline:GetPipeline",
        "codepipeline:GetPipelineState",
        "codepipeline:GetPipelineExecution",
        "codepipeline:ListPipelineExecutions",
      ],
      resources: ["*"],
    }));

    if (props.approvers.length > 0) {
      const approve = this.roleFor("SystemHealthPipelinesApproveRole", SYSTEM_HEALTH_APPROVALS_ROLE,
        "Approve or reject waiting pipeline approvals from the controller's System page", SYSTEM_APPROVALS_LAMBDA_ROLE,
        props.approvers);
      // PutApprovalResult only acts on approval actions, so this is any pipeline's approvals and nothing else.
      approve.addToPolicy(new iam.PolicyStatement({
        actions: ["codepipeline:PutApprovalResult"],
        resources: [`arn:aws:codepipeline:${this.region}:${this.account}:*`],
      }));
    }
  }

  private roleFor(id: string, roleName: string, description: string, trustedRole: string, accounts: GnomeAccount[]): iam.Role {
    // A condition rather than an ArnPrincipal, so the trust survives the controller recreating its role.
    const allowed = (account: string) => ({ ArnEquals: { "aws:PrincipalArn": `arn:aws:iam::${account}:role/${trustedRole}` } });
    const [first, ...rest] = accounts.map(a => a.accountId);
    const role = new iam.Role(this, id, {
      roleName,
      description,
      assumedBy: new iam.AccountPrincipal(first).withConditions(allowed(first)),
    });
    for (const account of rest) {
      role.assumeRolePolicy!.addStatements(new iam.PolicyStatement({
        actions: ["sts:AssumeRole"],
        principals: [new iam.AccountPrincipal(account)],
        conditions: allowed(account),
      }));
    }
    return role;
  }
}
