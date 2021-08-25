import { MlOpsStack } from "./ml_ops-stack";
import { VpcStack } from "./vpc-stack";
import { Stage, CfnOutput, Construct, StageProps } from "@aws-cdk/core";

export class WorkshopPipelineStage extends Stage {
  public readonly hcViewerUrl: CfnOutput;
  public readonly hcEndpoint: CfnOutput;
  constructor(scope: Construct, id: string, props?: StageProps) {
    super(scope, id, props);

    const service = new MlOpsStack(this, "WebService");
    const vpc = new VpcStack(this, "VPC");
    this.hcEndpoint = service.hcEndpoint;
    this.hcViewerUrl = service.hcViewerUrl;
  }
}
