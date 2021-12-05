import * as cdk from "@aws-cdk/core";
import * as ec2 from "@aws-cdk/aws-ec2";
import * as ecs from "@aws-cdk/aws-ecs";
import * as ecr from "@aws-cdk/aws-ecr";
import * as route53 from "@aws-cdk/aws-route53";
import * as route53Targets from "@aws-cdk/aws-route53-targets";
import * as ecsPatterns from "@aws-cdk/aws-ecs-patterns";
import * as iam from "@aws-cdk/aws-iam";
import * as elb from "@aws-cdk/aws-elasticloadbalancingv2";
import * as apigateway from "@aws-cdk/aws-apigateway";
import * as acm from "@aws-cdk/aws-certificatemanager";

export interface SecureNetworkLoadBalancedTaskImageOptions
  extends ecsPatterns.NetworkLoadBalancedTaskImageOptions,
    ecs.ContainerDefinitionOptions {
  readonly executionRole?: iam.Role;
  readonly taskRole?: iam.Role;
}

export interface EcsServiceStackProps extends cdk.StackProps {
  readonly ecsCluster: ecs.Cluster;
  readonly ecsRole: iam.Role;
  readonly ecrRepository: ecr.Repository;
  readonly privateHostedZone: route53.PrivateHostedZone;
  readonly privateCertificate: acm.DnsValidatedCertificate;
  readonly stackName?: string;
  readonly domainName: string;
}

export interface PortConfig {
  name: string;
  containerPort: number;
  hostPort: number;
  listenerPort: number;
  protocol: elb.Protocol;
}

export class EcsServiceStack extends cdk.Stack {
  /**
   * The desired number of instantiations of the task definition to keep running on the service.
   */
  public readonly desiredCount: number = 1;

  /**
   * The Network Load Balancer for the service.
   */
  public get loadBalancer(): elb.NetworkLoadBalancer {
    if (!this._networkLoadBalancer) {
      throw new Error(
        ".loadBalancer can only be accessed if the class was constructed with an owned, not imported, load balancer"
      );
    }
    return this._networkLoadBalancer;
  }

  /**
   * The listener for the service.
   */
  public readonly listener: elb.NetworkListener;

  /**
   * The target group for the service.
   */
  public readonly targetGroup: elb.NetworkTargetGroup;

  /**
   * The cluster that hosts the service.
   */
  public readonly cluster: ecs.ICluster;

  /**
   * Instance of a load balancer(NLB)
   */
  private readonly _networkLoadBalancer: elb.NetworkLoadBalancer;

  /**
   * Configuration for private or internet facing load balancer
   */
  public readonly assignPublicIp: false | true = false;

  /**
   * The Fargate service in this construct.
   */
  public readonly service: ecs.FargateService;

  /**
   * The Fargate task definition in this construct.
   */
  public readonly taskDefinition: ecs.FargateTaskDefinition;

  /**
   * Security group for the ECS service
   */
  public readonly loadBalancerOutput: cdk.CfnOutput;

  /**
   * Security group for the ECS service
   */
  public readonly ecsSecurityGroup: ec2.SecurityGroup;

  /**
   * Private hosted zone for the load balancers
   */
  public readonly privateHostedZone: route53.PrivateHostedZone;

  /**
   * VPC link to be used for the API gateway
   */
  public readonly vpcLink: apigateway.VpcLink;

  /**
   * Private link service endpoint
   */
  readonly vpcEndpointService: ec2.VpcEndpointService;

  /**
   * Multi-targets for the networkload balancers
   */
  protected listeners = new Array<elb.NetworkListener>();
  protected targetGroups = new Array<elb.NetworkTargetGroup>();

  /**
   * TO DO hard coded configuration
   */
  public portMapping = new Array<PortConfig>();
  public domain: string;

  constructor(scope: cdk.Construct, id: string, props: EcsServiceStackProps) {
    super(scope, id, props);

    // Control behaviour for prod environment
    this.domain = props.domainName;

    // Set number of tasks per service
    this.desiredCount = 1;

    // Add properties to the class
    this.cluster = props.ecsCluster;

    // Configuration for listers, host port and container port
    this.portMapping = [
      {
        name: "Secure",
        containerPort: 8443,
        hostPort: 8443,
        listenerPort: 443,
        protocol: elb.Protocol.TCP,
      },
    ];

    // Create Load balancer
    this._networkLoadBalancer = new elb.NetworkLoadBalancer(this, "SecureNLB", {
      vpc: props.ecsCluster.vpc,
      internetFacing: true,
    });

    // Adds secure listener, target group and health check
    for (const [i, el] of this.portMapping.entries()) {
      this.listeners.push(
        this._networkLoadBalancer.addListener(`${el.name}-Listener`, {
          port: el.listenerPort,
          protocol: el.protocol,
        })
      );
    }

    // Add Alias record
    const aRecord = new route53.ARecord(this, "DNS", {
      zone: props.privateHostedZone,
      recordName: this.domain,
      target: route53.RecordTarget.fromAlias(new route53Targets.LoadBalancerTarget(this._networkLoadBalancer)),
    });

    // Add output DNS
    new cdk.CfnOutput(this, "LoadBalancerDNS", {
      value: this._networkLoadBalancer.loadBalancerDnsName,
    });

    // Definition task definition
    this.taskDefinition = new ecs.FargateTaskDefinition(this, "TaskDef", {
      memoryLimitMiB: 4096,
      cpu: 2048,
      taskRole: props.ecsRole,
    });

    // Create log driver if logging is enabled
    const logDriver = this.createAWSLogDriver(this.node.id);

    // Select your service name package for CDORelay
    const serviceName = "FlaskBackend";

    // Define environment variables
    const ecsServiceEnv: { [key: string]: string } = {};
    ecsServiceEnv["APPLICATION_NAME"] = serviceName;

    // Create a default container
    const containerName = "web";
    const container = this.taskDefinition.addContainer(containerName, {
      image: ecs.ContainerImage.fromEcrRepository(props.ecrRepository),
      logging: logDriver,
      memoryLimitMiB: 8192,
      readonlyRootFilesystem: false,
      user: "root",
      environment: ecsServiceEnv,
    });
    container.addPortMappings(...this.createPortMapping(this.portMapping));

    // Adds the security group
    this.ecsSecurityGroup = new ec2.SecurityGroup(this, "ECS Security Group", {
      vpc: props.ecsCluster.vpc,
    });
    this.ecsSecurityGroup.addIngressRule(ec2.Peer.ipv4(props.ecsCluster.vpc.vpcCidrBlock), ec2.Port.tcpRange(0, 65535));

    // Create service
    this.service = new ecs.FargateService(this, "Service", {
      desiredCount: this.desiredCount,
      cluster: props.ecsCluster,
      taskDefinition: this.taskDefinition,
      securityGroups: [this.ecsSecurityGroup as any],
      platformVersion: ecs.FargatePlatformVersion.VERSION1_4,
    });

    // Registers target groups in the ECS service
    [this.targetGroup, this.listener] = this.registerECSTargets(this.service, container);

    // Adds tasks to the sevice, security groups and the target groups
    this.service.connections.addSecurityGroup(this.ecsSecurityGroup as any);

    // Add the VPC Link
    this.vpcLink = new apigateway.VpcLink(this, "ServiceFargateVpcLink", {
      targets: [this._networkLoadBalancer],
    });

    // Add LoadBalancer output
    this.loadBalancerOutput = new cdk.CfnOutput(this, "LoadBalanceDNS", {
      value: this._networkLoadBalancer.loadBalancerDnsName,
    });
  }

  /**
   * Returns the default cluster.
   */
  protected getDefaultCluster(scope: cdk.Construct, vpc?: ec2.IVpc): ecs.Cluster {
    // magic string to avoid collision with user-defined constructs
    const DEFAULT_CLUSTER_ID = `EcsDefaultClusterMnL3mNNYN${vpc ? vpc.node.id : ""}`;
    const stack = cdk.Stack.of(scope);
    return (
      (stack.node.tryFindChild(DEFAULT_CLUSTER_ID) as ecs.Cluster) ||
      new ecs.Cluster(stack, DEFAULT_CLUSTER_ID, { vpc })
    );
  }

  protected createAWSLogDriver(prefix: string): ecs.AwsLogDriver {
    return new ecs.AwsLogDriver({ streamPrefix: prefix });
  }

  /**
   * Adds service as a target of the target group.
   */
  protected addServiceAsTarget(service: ecs.BaseService): void {
    this.targetGroup.addTarget(service);
  }

  protected createPortMapping(arrMap: Array<PortConfig>): ecs.PortMapping[] {
    let portMapping: ecs.PortMapping[] = [];
    const res = arrMap.map((el) => {
      portMapping.push({ containerPort: el.containerPort, hostPort: el.hostPort });
    });
    return portMapping;
  }

  protected registerECSTargets(
    service: ecs.BaseService,
    container: ecs.ContainerDefinition
  ): [elb.NetworkTargetGroup, elb.NetworkListener] {
    for (const [i, el] of this.portMapping.entries()) {
      this.targetGroups.push(
        this.listeners[i].addTargets(`${el.name}-ECSTargetGroup-${container.containerName}${el.containerPort}`, {
          port: el.hostPort,
          protocol: el.protocol,
          targets: [
            service.loadBalancerTarget({
              containerName: container.containerName,
              containerPort: el.containerPort,
            }),
          ],
        })
      );
      this.targetGroups[i].configureHealthCheck({
        port: el.hostPort.toString(),
        protocol: el.listenerPort === 443 ? elb.Protocol.HTTPS : elb.Protocol.TCP,
        path: el.listenerPort === 443 ? "/sping" : undefined,
      });
      this.targetGroups[i].setAttribute("deregistration_delay.timeout_seconds", "60");
    }
    if (this.targetGroups.length === 0) {
      throw new Error("At least one target group should be specified.");
    }
    return [this.targetGroups[0], this.listeners[0]];
  }

  private setDomainName(stage: string, domainName: string) {
    if (stage === "prod") {
      this.domain = domainName;
    } else {
      this.domain = stage + "." + domainName;
    }
  }
}
