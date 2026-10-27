import * as cdk from "aws-cdk-lib";
import * as ec2 from "aws-cdk-lib/aws-ec2";
import { Construct } from "constructs";
import { platformCidr, PLATFORM_REGIONS } from "@gnome-trading-group/gnome-shared-cdk";
import { PlatformNetworkStack } from "./platform-network-stack";

export interface PlatformPeeringStackProps extends cdk.StackProps {
  stage: string;
  // Every region's network, by region.
  networks: Record<string, PlatformNetworkStack>;
  // The peering stacks of the regions before this one in the address plan, which requested peerings to it.
  earlier: PlatformPeeringStack[];
}

/**
 * One region's side of the full mesh: it requests a peering to every region after it in the address plan (so each
 * pair is requested once), and routes to every other region's /16 over the pair's peering, whichever side asked.
 * Peerings within one account are accepted by CloudFormation, across regions too.
 */
export class PlatformPeeringStack extends cdk.Stack {
  private readonly requested = new Map<string, string>();

  constructor(scope: Construct, id: string, props: PlatformPeeringStackProps) {
    super(scope, id, { ...props, crossRegionReferences: true });
    const here = props.networks[this.region];
    const index = PLATFORM_REGIONS[this.region];

    for (const [peer, peerIndex] of Object.entries(PLATFORM_REGIONS)) {
      if (peerIndex <= index) {
        continue;
      }
      const peering = new ec2.CfnVPCPeeringConnection(this, `PeeringTo-${peer}`, {
        vpcId: here.vpc.vpcId,
        peerVpcId: props.networks[peer].vpc.vpcId,
        peerRegion: peer,
        tags: [{ key: "Name", value: `gnome-platform ${this.region} <-> ${peer}` }],
      });
      this.requested.set(peer, peering.ref);
      this.routeTo(here, props.stage, peer, peering.ref);
    }
    for (const earlier of props.earlier) {
      this.routeTo(here, props.stage, earlier.region, earlier.peeringIdTo(this.region));
    }
  }

  /** The peering this region requested to {@code region}, a later one in the address plan. */
  peeringIdTo(region: string): string {
    const id = this.requested.get(region);
    if (id === undefined) throw new Error(`${this.region} requested no peering to ${region}`);
    return id;
  }

  private routeTo(here: PlatformNetworkStack, stage: string, peer: string, peeringId: string) {
    here.routeTableIds.forEach((routeTableId, i) => {
      new ec2.CfnRoute(this, `RouteTo-${peer}-${i}`, {
        routeTableId,
        destinationCidrBlock: platformCidr(stage, peer),
        vpcPeeringConnectionId: peeringId,
      });
    });
  }
}
