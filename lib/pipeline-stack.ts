import * as cdk from "@aws-cdk/core";
import * as codecommit from "@aws-cdk/aws-codecommit";
import * as codebuild from "@aws-cdk/aws-codebuild";
import * as codepipeline from "@aws-cdk/aws-codepipeline";
import * as codepipeline_actions from "@aws-cdk/aws-codepipeline-actions";
import { ShellScriptAction, SimpleSynthAction, CdkPipeline } from "@aws-cdk/pipelines";
import { PipelineStage } from "./pipeline-stage";

export class PipelineStack extends cdk.Stack {
  constructor(scope: cdk.Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // Creates a CodeCommit repository called 'cruzolivRepo'
    const repo = new codecommit.Repository(this, "Repo", {
      repositoryName: "cruzolivRepo",
    });

    // Defines the artifact representing the sourcecode
    const sourceArtifact = new codepipeline.Artifact();

    // Defines the artifact representing the cloud assembly
    // (cloudformation template + all other assets)
    const cloudAssemblyArtifact = new codepipeline.Artifact();

    const sourceAction = new codepipeline_actions.CodeCommitSourceAction({
      actionName: "CodeCommit", // Any Git-based source control
      output: sourceArtifact, // Indicates where the artifact is stored
      repository: repo, // Designates the repo to draw code from
    });

    // Builds our source code outlined above into a could assembly artifact
    const synthAction = SimpleSynthAction.standardNpmSynth({
      sourceArtifact, // Where to get source code to build
      cloudAssemblyArtifact, // Where to place built source
      buildCommand: "npm run build", // Language-specific build cmd
    });

    // Defines a projects
    const project = new codebuild.PipelineProject(this, "Project");

    const buildAction = new codepipeline_actions.CodeBuildAction({
      actionName: "CodeBuild",
      project,
      input: sourceArtifact,
      outputs: [new codepipeline.Artifact()], // optional
      executeBatchBuild: false, // optional, defaults to false
      combineBatchBuildArtifacts: false, // optional, defaults to false
    });

    const pipe = new codepipeline.Pipeline(this, "Pipeline", {
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

    // The basic pipeline declaration. This sets the initial structure
    // of our pipeline
    // const pipeline = new CdkPipeline(this, "Pipeline", {
    //   pipelineName: "Pipeline",
    //   cloudAssemblyArtifact,

    //   // Generates the source artifact from the repo we created in the last step
    //   sourceAction: sourceAction,

    //   // Builds our source code outlined above into a could assembly artifact
    //   synthAction: synthAction,
    // });

    // const deploy = new PipelineStage(this, "Deploy");
    // const deployStage = pipeline.addApplicationStage(deploy);
    // deployStage.addActions(
    //   new ShellScriptAction({
    //     actionName: "TestViewerEndpoint",
    //     useOutputs: {
    //       ENDPOINT_URL: pipeline.stackOutput(deploy.hcViewerUrl),
    //     },
    //     commands: ["curl -Ssf $ENDPOINT_URL"],
    //   })
    // );
    // deployStage.addActions(
    //   new ShellScriptAction({
    //     actionName: "TestAPIGatewayEndpoint",
    //     useOutputs: {
    //       ENDPOINT_URL: pipeline.stackOutput(deploy.hcEndpoint),
    //     },
    //     commands: ["curl -Ssf $ENDPOINT_URL/", "curl -Ssf $ENDPOINT_URL/hello", "curl -Ssf $ENDPOINT_URL/test"],
    //   })
    // );
  }
}
