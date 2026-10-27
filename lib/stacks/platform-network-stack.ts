import * as cdk from "aws-cdk-lib";
import * as ec2 from "aws-cdk-lib/aws-ec2";
import * as ssm from "aws-cdk-lib/aws-ssm";
import { Construct } from "constructs";
import {
  AERON_PORTS, allPlatformCidrs, platformCidr, PLATFORM_NETWORK_TAG, PLATFORM_SECURITY_GROUP_NAME, PLATFORM_SSM,
  PLATFORM_VPC_NAME, platformZones,
} from "@gnome-trading-group/gnome-shared-cdk";

export interface PlatformNetworkStackProps extends cdk.StackProps {
  // 'dev' or 'prod': which account's address block the region's /16 comes from.
  stage: string;
}

/**
 * The platform's network in one region: sessions, shards, Batch, pipelines and the AMI builder all run here. Public
 * subnets only, with an internet gateway and no NAT, since everything needs the internet and none of it needs to hide
 * from it; the upper half of the /16 is kept for private subnets. Peered with every other region by
 * PlatformPeeringStack.
 */
export class PlatformNetworkStack extends cdk.Stack {
  public readonly vpc: ec2.Vpc;
  public readonly securityGroup: ec2.SecurityGroup;

  constructor(scope: Construct, id: string, props: PlatformNetworkStackProps) {
    super(scope, id, { ...props, crossRegionReferences: true });

    // Subnets are allocated from the bottom of the block, a /20 per zone, as publicSubnetCidr describes.
    this.vpc = new ec2.Vpc(this, "PlatformVpc", {
      vpcName: PLATFORM_VPC_NAME,
      ipAddresses: ec2.IpAddresses.cidr(platformCidr(props.stage, this.region)),
      availabilityZones: platformZones(this.region),
      natGateways: 0,
      subnetConfiguration: [{ name: "public", subnetType: ec2.SubnetType.PUBLIC, cidrMask: 20 }],
    });

    this.securityGroup = new ec2.SecurityGroup(this, "PlatformSecurityGroup", {
      vpc: this.vpc,
      securityGroupName: PLATFORM_SECURITY_GROUP_NAME,
      description: "Platform workloads: all outbound; inbound only Aeron UDP from platform networks",
      allowAllOutbound: true,
    });
    // Security groups can't name groups in other regions, so peered regions are admitted by their CIDRs.
    for (const cidr of allPlatformCidrs(props.stage)) {
      this.securityGroup.addIngressRule(
        ec2.Peer.ipv4(cidr), ec2.Port.udpRange(AERON_PORTS.from, AERON_PORTS.to), `Aeron from ${cidr}`);
    }

    cdk.Tags.of(this.vpc).add(PLATFORM_NETWORK_TAG.key, PLATFORM_NETWORK_TAG.value);
    cdk.Tags.of(this.securityGroup).add(PLATFORM_NETWORK_TAG.key, PLATFORM_NETWORK_TAG.value);

    new ssm.StringParameter(this, "VpcIdParameter", {
      parameterName: PLATFORM_SSM.vpcId,
      stringValue: this.vpc.vpcId,
    });
    new ssm.StringParameter(this, "SubnetIdsParameter", {
      parameterName: PLATFORM_SSM.subnetIds,
      stringValue: this.vpc.publicSubnets.map((s) => s.subnetId).join(","),
    });
    new ssm.StringParameter(this, "SecurityGroupIdParameter", {
      parameterName: PLATFORM_SSM.securityGroupId,
      stringValue: this.securityGroup.securityGroupId,
    });
  }

  // The zones are named in the region map rather than looked up, so the pipeline synthesizes without credentials; the
  // VPC checks its zones against this list.
  get availabilityZones(): string[] {
    return platformZones(this.region);
  }

  /** The public route tables, which every peering adds a route to. */
  get routeTableIds(): string[] {
    return this.vpc.publicSubnets.map((s) => s.routeTable.routeTableId);
  }
}
