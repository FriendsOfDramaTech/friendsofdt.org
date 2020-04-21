import * as cdk from '@aws-cdk/core';
import { StaticSite, StaticSiteProps } from '../constructs/static-site-construct'
import { PublicHostedZone } from '@aws-cdk/aws-route53'

/**
* Config options for the website stack
*/
export interface WebsiteStackProps extends cdk.StackProps {
    siteSubDomain: string,
    zone: PublicHostedZone,
    cnames: string[]
}

/**
* Define a stack that hosts the website
*/
export class WebsiteStack extends cdk.Stack {
    constructor(scope: cdk.Construct, id: string, props: WebsiteStackProps) {
        super(scope, id, props);

        const zoneId = props.zone.hostedZoneId
        const domainName = props.zone.zoneName;

        /**
        * StaticSite makes all of the request-path elements: S3+CFN+DNS+ACM
        **/
        const staticSite = new StaticSite(this, 'WebsiteStaticSite', {
            zoneId: zoneId,
            domainName: domainName,
            siteSubDomain: props.siteSubDomain,
            cnames: props.cnames
        });
    }
}
