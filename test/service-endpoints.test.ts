import * as cdk from "aws-cdk-lib";
import { Template } from "aws-cdk-lib/assertions";
import { ServiceEndpointsStack } from "../lib/stacks/service-endpoints-stack";

describe("ServiceEndpointsStack", () => {
  it("keys items by service id and expires the ones nobody refreshes", () => {
    const app = new cdk.App();
    const stack = new ServiceEndpointsStack(app, "ServiceEndpoints", {
      env: { account: "123456789012", region: "us-east-1" },
    });

    Template.fromStack(stack).hasResourceProperties("AWS::DynamoDB::Table", {
      TableName: "service-endpoints",
      KeySchema: [{ AttributeName: "service_id", KeyType: "HASH" }],
      BillingMode: "PAY_PER_REQUEST",
      TimeToLiveSpecification: { AttributeName: "expires_at", Enabled: true },
    });
  });
});
