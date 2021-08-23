import { expect as expectCDK, matchTemplate, MatchStyle } from '@aws-cdk/assert';
import * as cdk from '@aws-cdk/core';
import * as MlOps from '../lib/ml_ops-stack';

test('Empty Stack', () => {
    const app = new cdk.App();
    // WHEN
    const stack = new MlOps.MlOpsStack(app, 'MyTestStack');
    // THEN
    expectCDK(stack).to(matchTemplate({
      "Resources": {}
    }, MatchStyle.EXACT))
});
