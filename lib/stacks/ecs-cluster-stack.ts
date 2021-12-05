import * as cdk from "@aws-cdk/core";
import * as ec2 from "@aws-cdk/aws-ec2";
import * as ecs from "@aws-cdk/aws-ecs";

export interface EcsClusterStackProps extends cdk.StackProps {
  readonly vpc: ec2.IVpc;
}

export class EcsClusterStack extends cdk.Stack {
  readonly cluster: ecs.Cluster;
  constructor(scope: cdk.Construct, id: string, props: EcsClusterStackProps) {
    super(scope, id, props);
    // Creates cluster to run fargate services
    this.cluster = new ecs.Cluster(this, "Cluster", {
      vpc: props.vpc,
    });
  }
}
