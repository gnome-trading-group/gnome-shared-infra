import * as cdk from 'aws-cdk-lib';
import { Template } from 'aws-cdk-lib/assertions';
import { AERON_PORTS, allPlatformCidrs, platformCidr, publicSubnetCidr } from '@gnome-trading-group/gnome-shared-cdk';
import { addPlatformNetwork } from '../lib/shared-infra-pipeline-stack';

const ACCOUNT = '443370708724';
const REGIONS = ['us-east-1', 'ap-northeast-1', 'eu-west-1'];

function synth() {
  const app = new cdk.App();
  const stage = new cdk.Stage(app, 'Dev', { env: { account: ACCOUNT, region: 'us-east-1' } });
  addPlatformNetwork(stage, ACCOUNT, 'dev');
  const stack = (id: string) => stage.node.findChild(id) as cdk.Stack;
  return {
    network: (region: string) => Template.fromStack(stack(`PlatformNetworkStack-${region}`)),
    peering: (region: string) => Template.fromStack(stack(`PlatformPeeringStack-${region}`)),
  };
}

type Resource = { Properties: Record<string, any> };
const resources = (template: Template, type: string) => Object.values(template.findResources(type)) as Resource[];

describe('the platform network', () => {
  const { network, peering } = synth();

  it.each(REGIONS)('gives %s its /16 with a public /20 per zone, from the bottom', (region) => {
    const template = network(region);
    template.hasResourceProperties('AWS::EC2::VPC', { CidrBlock: platformCidr('dev', region) });
    const subnets = resources(template, 'AWS::EC2::Subnet').map((s) => s.Properties.CidrBlock).sort();
    expect(subnets).toEqual([publicSubnetCidr('dev', region, 0), publicSubnetCidr('dev', region, 1)].sort());
    expect(resources(template, 'AWS::EC2::NatGateway')).toHaveLength(0);
    template.resourceCountIs('AWS::EC2::InternetGateway', 1);
  });

  it('admits only Aeron UDP, and only from platform networks', () => {
    const [group] = resources(network('ap-northeast-1'), 'AWS::EC2::SecurityGroup');
    const ingress = group.Properties.SecurityGroupIngress;
    expect(ingress.map((r: any) => r.CidrIp).sort()).toEqual(allPlatformCidrs('dev').sort());
    for (const rule of ingress) {
      expect(rule).toMatchObject({ IpProtocol: 'udp', FromPort: AERON_PORTS.from, ToPort: AERON_PORTS.to });
    }
  });

  it('tags the VPC, its subnets and the security group so the launcher and lookups find them', () => {
    const template = network('eu-west-1');
    const tagged = (r: Resource) => (r.Properties.Tags ?? []).some((t: any) => t.Key === 'gnome:network' && t.Value === 'platform');
    expect(resources(template, 'AWS::EC2::VPC').every(tagged)).toBe(true);
    expect(resources(template, 'AWS::EC2::Subnet').every(tagged)).toBe(true);
    expect(resources(template, 'AWS::EC2::SecurityGroup').every(tagged)).toBe(true);
  });

  it('publishes the network for callers that find it at run time', () => {
    const names = resources(network('us-east-1'), 'AWS::SSM::Parameter').map((p) => p.Properties.Name).sort();
    expect(names).toEqual([
      '/gnome/platform-network/security-group-id',
      '/gnome/platform-network/subnet-ids',
      '/gnome/platform-network/vpc-id',
    ]);
  });

  it('requests each pair once, from the earlier region in the address plan', () => {
    const counts = REGIONS.map((region) => resources(peering(region), 'AWS::EC2::VPCPeeringConnection').length);
    expect(counts).toEqual([2, 1, 0]);
    const fromTokyo = resources(peering('ap-northeast-1'), 'AWS::EC2::VPCPeeringConnection');
    expect(fromTokyo.map((p) => p.Properties.PeerRegion)).toEqual(['eu-west-1']);
  });

  it.each(REGIONS)('routes %s to both other regions from both its route tables', (region) => {
    const routes = resources(peering(region), 'AWS::EC2::Route');
    const others = REGIONS.filter((r) => r !== region).map((r) => platformCidr('dev', r)).sort();
    const destinations = routes.map((r) => r.Properties.DestinationCidrBlock);
    expect([...new Set(destinations)].sort()).toEqual(others);
    expect(routes).toHaveLength(others.length * 2);
    expect(routes.every((r) => r.Properties.VpcPeeringConnectionId !== undefined)).toBe(true);
  });
});
