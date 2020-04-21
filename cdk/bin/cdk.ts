#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from '@aws-cdk/core';
import { WebsiteStack, WebsiteStackProps } from '../lib/stacks/website-stack';
import { InfrastructureStack } from '../lib/stacks/infrastructure-stack';

//Configure Application Settings
const env = { account: '430966316974', region: 'us-east-1' }

//For now we'll use ALIAS records inside of Namecheap to make these pretty
const domain = 'cloud.friendsofdt.org'

//Start CDK
const app = new cdk.App();

//Create stacks
//Shared Resources: DNS, IAM, etc
const globalStack = new InfrastructureStack(app, 'infrastructure', {
    env: env,
    domainName: domain
});

//Staging environment
new WebsiteStack(app, 'staging', {
    env: env,
    siteSubDomain: "www-staging",
    zone: globalStack.zone,
    cnames: ['www-staging.friendsofdt.org']
});

//Production environment
new WebsiteStack(app, 'prod', {
    env: env,
    siteSubDomain: "www",
    cnames: ['friendsofdt.org'],
    zone: globalStack.zone
});
