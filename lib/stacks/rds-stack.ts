import * as cdk from "@aws-cdk/core";
import * as ec2 from "@aws-cdk/aws-ec2";
import * as rds from "@aws-cdk/aws-rds";
import * as s3 from "@aws-cdk/aws-s3";

export interface RdsStackProps extends cdk.StackProps {
  readonly vpc: ec2.IVpc;
}

export class RdsStack extends cdk.Stack {
  readonly rds: rds.DatabaseCluster;
  readonly importBucket: s3.Bucket;
  readonly exportBucket: s3.Bucket;
  constructor(scope: cdk.Construct, id: string, props: RdsStackProps) {
    super(scope, id, props);

    // Creates a import database
    this.importBucket = new s3.Bucket(this, "importbucket");
    this.exportBucket = new s3.Bucket(this, "exportbucket");

    // Creates a cluster database with default settings
    this.rds = new rds.DatabaseCluster(this, "Database", {
      engine: rds.DatabaseClusterEngine.auroraPostgres({ version: rds.AuroraPostgresEngineVersion.VER_13_4 }),
      credentials: rds.Credentials.fromGeneratedSecret("MasterPostgresAdmin"), // Optional - will default to 'admin' username and generated password
      instanceProps: {
        vpc: props.vpc,
        // optional , defaults to t3.medium
        instanceType: ec2.InstanceType.of(ec2.InstanceClass.BURSTABLE2, ec2.InstanceSize.MICRO),
        vpcSubnets: {
          subnetType: ec2.SubnetType.PUBLIC,
        },
        publiclyAccessible: true,
        autoMinorVersionUpgrade: true,
        enablePerformanceInsights: true,
      },
      s3ImportBuckets: [this.importBucket],
      s3ExportBuckets: [this.exportBucket],
    });
  }
}
