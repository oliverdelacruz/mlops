import { countResources, expect as expectCDK, haveResource } from "@aws-cdk/assert";
import cdk = require("@aws-cdk/core");
import * as lambda from "@aws-cdk/aws-lambda";

import { HitCounter } from "../lib/hitcounter";

test("DynamoDB Table Created", () => {
  const stack = new cdk.Stack();
  // WHEN
  new HitCounter(stack, "MyTestTableConstruct", {
    downstream: new lambda.Function(stack, "TestTableFunction", {
      runtime: lambda.Runtime.NODEJS_10_X,
      handler: "lambda.handler",
      code: lambda.Code.fromInline("test"),
    }),
  });
  // THEN
  expectCDK(stack).to(haveResource("AWS::DynamoDB::Table"));
});

// test("Lambda Has Environment Variables", () => {
//   const stack = new cdk.Stack();
//   // WHEN
//   const lambdaCounter = new HitCounter(stack, "MyTestLambdaConstruct", {
//     downstream: new lambda.Function(stack, "TestLambdaFunction", {
//       runtime: lambda.Runtime.NODEJS_10_X,
//       handler: "lambda.handler",
//       code: lambda.Code.fromInline("test"),
//     }),
//   });
//   // THEN
//   expectCDK(stack).to(
//     haveResource("AWS::Lambda::Function", {
//       Environment: {
//         Variables: {
//           DOWNSTREAM_FUNCTION_NAME: { Ref: ["TestLambdaFunctionC089708A"] },
//           HITS_TABLE_NAME: { Ref: ["MyTestLambdaConstructHits1745ABB3"] },
//         },
//       },
//     })
//   );
// });

test("DynamoDB Table Created With Encryption", () => {
  const stack = new cdk.Stack();
  // WHEN
  new HitCounter(stack, "MyTestEncryptionConstruct", {
    downstream: new lambda.Function(stack, "TestEncryptionFunction", {
      runtime: lambda.Runtime.NODEJS_10_X,
      handler: "lambda.handler",
      code: lambda.Code.fromInline("test"),
    }),
  });
  // THEN
  expectCDK(stack).to(
    haveResource("AWS::DynamoDB::Table", {
      SSESpecification: {
        SSEEnabled: true,
      },
    })
  );
});

test("read capacity can be configured", () => {
  const stack = new cdk.Stack();

  expect(() => {
    new HitCounter(stack, "MyTestReadCapacityConstruct", {
      downstream: new lambda.Function(stack, "TestReadCapacityFunction", {
        runtime: lambda.Runtime.NODEJS_10_X,
        handler: "lambda.handler",
        code: lambda.Code.inline("test"),
      }),
      readCapacity: 3,
    });
  }).toThrowError(/readCapacity must be greater than 5 and lower than 20/);
});
