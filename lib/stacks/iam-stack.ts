import * as cdk from "@aws-cdk/core";
import * as iam from "@aws-cdk/aws-iam";

export class IamStack extends cdk.Stack {
  readonly codeBuildRole: iam.Role;
  constructor(scope: cdk.Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // Create role for CodeBuild
    this.codeBuildRole = new iam.Role(this, `CodeBuilderRole`, {
      assumedBy: new iam.ServicePrincipal("codebuild.amazonaws.com"),
      roleName: `CodeBuilderRole`,
    });

    // Add policy to the CodeBuild role
    const codeBuildPolicy = {
      effect: iam.Effect.ALLOW,
      actions: ["codebuild:*", "s3:*", "ecr:*", "cloudwatch:*"],
      resources: ["*"],
    };
    this.codeBuildRole.addToPolicy(new iam.PolicyStatement(codeBuildPolicy));
  }
}
