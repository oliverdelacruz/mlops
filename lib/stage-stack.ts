import * as cdk from "@aws-cdk/core";
import { Stage, CfnOutput, Construct, StageProps } from "@aws-cdk/core";
import { WorkshopStack } from "./stacks/workshop-stack";
import { VpcStack } from "./stacks/vpc-stack";
import { EcsClusterStack } from "./stacks/ecs-cluster-stack";
import { EcsServiceStack } from "./stacks/ecs-service-stack";
import { RdsStack } from "./stacks/rds-stack";
import { IamStack } from "./stacks/iam-stack";

export class PipelineStage extends Stage {
  public readonly hcViewerUrl: CfnOutput;
  public readonly hcEndpoint: CfnOutput;
  public readonly codebuild: CfnOutput;
  constructor(scope: Construct, id: string, props?: StageProps) {
    super(scope, id, props);

    //Create all the stacks
    const stack = new PipelineStageStack(this, "StageStack", props);
    this.hcEndpoint = stack.service.hcEndpoint;
    this.hcViewerUrl = stack.service.hcViewerUrl;
  }
}

export class PipelineStageStack extends cdk.Stack {
  public readonly service: WorkshopStack;
  constructor(scope: cdk.Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    this.service = new WorkshopStack(this, "WebService", props);
    const vpc = new VpcStack(this, "Vpc", props);
    const cluster = new EcsClusterStack(this, "EcsCluster", { vpc: vpc.vpc, ...props });
    const rds = new RdsStack(this, "Rds", { vpc: vpc.vpc, ...props });
  }
}
