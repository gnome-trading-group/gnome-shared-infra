import * as cdk from "aws-cdk-lib";
import * as dynamodb from "aws-cdk-lib/aws-dynamodb";
import { Construct } from "constructs";
import { SERVICE_ENDPOINTS } from "@gnome-trading-group/gnome-shared-cdk";

/**
 * The `service-endpoints` table: how sessions find shards and order gateways over Aeron. Items are live state that
 * their processes rewrite every few seconds, so the table is recreated rather than kept on a replacement.
 */
export class ServiceEndpointsStack extends cdk.Stack {
  public readonly table: dynamodb.Table;

  constructor(scope: Construct, id: string, props: cdk.StackProps) {
    super(scope, id, props);

    this.table = new dynamodb.Table(this, "ServiceEndpoints", {
      tableName: SERVICE_ENDPOINTS.tableName,
      partitionKey: { name: SERVICE_ENDPOINTS.partitionKey, type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      timeToLiveAttribute: SERVICE_ENDPOINTS.ttlAttribute,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });
  }
}
