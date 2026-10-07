import * as cdk from "aws-cdk-lib";
import * as iam from "aws-cdk-lib/aws-iam";
import { Construct } from "constructs";
import { GnomeAccount } from "@gnome-trading-group/gnome-shared-cdk";
import { SYSTEM_HEALTH_APPROVALS_ROLE, SYSTEM_HEALTH_PIPELINES_ROLE } from "../config";

export interface SystemHealthAccessStackProps extends cdk.StackProps {
  readers: GnomeAccount[];
  approvers: GnomeAccount[];
}

// Lets the controller's System page in other accounts see this account's deploy pipelines and, from the accounts
// trusted to, approve or reject what's waiting. Only the page's own Lambdas may assume these roles (their role names
// carry their stack's, ControllerSystemHealthStack), and each role can do only its one job.
export class SystemHealthAccessStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: SystemHealthAccessStackProps) {
    super(scope, id, props);

    const read = this.roleFor("SystemHealthPipelinesReadRole", SYSTEM_HEALTH_PIPELINES_ROLE,
      "Read-only access to deploy pipelines for the controller's System page", props.readers);
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
        "Approve or reject waiting pipeline approvals from the controller's System page", props.approvers);
      // PutApprovalResult only acts on approval actions, so this is any pipeline's approvals and nothing else.
      approve.addToPolicy(new iam.PolicyStatement({
        actions: ["codepipeline:PutApprovalResult"],
        resources: [`arn:aws:codepipeline:${this.region}:${this.account}:*`],
      }));
    }
  }

  private roleFor(id: string, roleName: string, description: string, accounts: GnomeAccount[]): iam.Role {
    const allowed = (account: string) => ({ ArnLike: { "aws:PrincipalArn": `arn:aws:iam::${account}:role/*SystemHealth*` } });
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
