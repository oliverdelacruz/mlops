import { Stage, CfnOutput, Construct, StageProps } from "@aws-cdk/core";
import { WorkshopStack } from "./stacks/workshop-stack";
import { VpcStack } from "./stacks/vpc-stack";
import { EcsClusterStack } from "./stacks/ecs-cluster-stack";
import { EcsServiceStack } from "./stacks/ecs-service-stack";
import { IamStack } from "./stacks/iam-stack";

export class PipelineStage extends Stage {
  public readonly hcViewerUrl: CfnOutput;
  public readonly hcEndpoint: CfnOutput;
  public readonly codebuild: CfnOutput;

  constructor(scope: Construct, id: string, props?: StageProps) {
    super(scope, id, props);

    const service = new WorkshopStack(this, "WebService", props);
    const vpc = new VpcStack(this, "Vpc", props);
    // const cluster = new EcsClusterStack(this, "EcsCluster", {vpc: vpc.vpc, ...props });

    this.hcEndpoint = service.hcEndpoint;
    this.hcViewerUrl = service.hcViewerUrl;
  }
}
