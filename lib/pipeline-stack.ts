import * as cdk from "@aws-cdk/core";
import * as iam from "@aws-cdk/aws-iam";
import * as codecommit from "@aws-cdk/aws-codecommit";
import * as codebuild from "@aws-cdk/aws-codebuild";
import * as codepipeline from "@aws-cdk/aws-codepipeline";
import * as ecr from "@aws-cdk/aws-ecr";
import * as codepipeline_actions from "@aws-cdk/aws-codepipeline-actions";
import { ShellScriptAction, SimpleSynthAction, CdkPipeline } from "@aws-cdk/pipelines";
import { PipelineStage } from "./pipeline-stage";

export class PipelineStack extends cdk.Stack {
  constructor(scope: cdk.Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // Creates a CodeCommit repository called 'cruzolivRepo'
    const sourceRepository = new codecommit.Repository(this, "SourceRepository", {
      repositoryName: "codecomit-repo",
    });

    // Creates a CodeCommit repository called 'cruzolivRepo'
    const ecrRepository = new ecr.Repository(this, "ContainerRepository", {
      repositoryName: "ecr-repo",
    });

    // Create role for CodeBuild
    const codeBuildRole = new iam.Role(this, `CodeBuilderRole`, {
      assumedBy: new iam.ServicePrincipal("codebuild.amazonaws.com"),
      roleName: `CodeBuilderRole`,
    });

    // Add policy to the CodeBuild role
    const codeBuildPolicy = {
      effect: iam.Effect.ALLOW,
      actions: ["codebuild:*", "s3:*", "ecr:*", "cloudwatch:*"],
      resources: ["*"],
    };
    codeBuildRole.addToPolicy(new iam.PolicyStatement(codeBuildPolicy));

    // Defines the artifact representing the sourcecode
    const sourceArtifact = new codepipeline.Artifact();

    // Defines the artifact representing the cloud assembly
    // (cloudformation template + all other assets)
    const cloudAssemblyArtifact = new codepipeline.Artifact();

    // Defines the action to update any changes in repository
    const sourceAction = new codepipeline_actions.CodeCommitSourceAction({
      actionName: "CodeCommit", // Any Git-based source control
      output: sourceArtifact, // Indicates where the artifact is stored
      repository: sourceRepository, // Designates the repo to draw code from
    });

    // Builds our source code outlined above into a could assembly artifact
    const synthAction = SimpleSynthAction.standardNpmSynth({
      sourceArtifact, // Where to get source code to build
      cloudAssemblyArtifact, // Where to place built source
      buildCommand: "npm run build", // Language-specific build cmd
    });

    // Defines a projects
    const project = new codebuild.PipelineProject(this, "Project", {
      environment: {
        // we need to run Docker
        privileged: true,
      },
      environmentVariables: {
        REPOSITORY_URI: {
          value: ecrRepository.repositoryUri,
        },
        IMAGE_REPO_NAME: {
          value: ecrRepository.repositoryName,
        },
        IMAGE_TAG: {
          value: "latest",
        },
      },
      role: codeBuildRole,
    });

    const buildAction = new codepipeline_actions.CodeBuildAction({
      actionName: "CodeBuild",
      project,
      input: sourceArtifact,
      outputs: [new codepipeline.Artifact()], // optional
      executeBatchBuild: false, // optional, defaults to false
      combineBatchBuildArtifacts: false, // optional, defaults to false
      environmentVariables: {
        REPOSITORY_URI: {
          value: ecrRepository.repositoryUri,
        },
        IMAGE_REPO_NAME: {
          value: ecrRepository.repositoryName,
        },
        IMAGE_TAG: {
          value: "latest",
        },
      },
    });

    const pipeline = new codepipeline.Pipeline(this, "Pipeline", {
      pipelineName: "Pipeline",
      stages: [
        {
          stageName: "Source",
          actions: [sourceAction],
        },
        {
          stageName: "Synth",
          actions: [synthAction],
        },
        {
          stageName: "Build",
          actions: [buildAction],
        },
      ],
    });

    // The CDK pipeline declaration. This sets the initial structure
    // of our pipeline
    const Cdkpipeline = new CdkPipeline(this, "CdkPipeline", {
      codePipeline: pipeline,
      cloudAssemblyArtifact,
    });

    const deploy = new PipelineStage(this, "Deploy");
    const deployStage = Cdkpipeline.addApplicationStage(deploy);
    deployStage.addActions(
      new ShellScriptAction({
        actionName: "TestViewerEndpoint",
        useOutputs: {
          ENDPOINT_URL: Cdkpipeline.stackOutput(deploy.hcViewerUrl),
        },
        commands: ["curl -Ssf $ENDPOINT_URL"],
      })
    );
    deployStage.addActions(
      new ShellScriptAction({
        actionName: "TestAPIGatewayEndpoint",
        useOutputs: {
          ENDPOINT_URL: Cdkpipeline.stackOutput(deploy.hcEndpoint),
        },
        commands: ["curl -Ssf $ENDPOINT_URL/", "curl -Ssf $ENDPOINT_URL/hello", "curl -Ssf $ENDPOINT_URL/test"],
      })
    );
  }
}
