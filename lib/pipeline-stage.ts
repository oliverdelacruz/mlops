import { MlOpsStack } from "./ml_ops-stack";
import { Stage, Construct, StageProps } from "@aws-cdk/core";

export class WorkshopPipelineStage extends Stage {
  constructor(scope: Construct, id: string, props?: StageProps) {
    super(scope, id, props);

    new MlOpsStack(this, "WebService");
  }
}
