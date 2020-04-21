import cloudfront = require('@aws-cdk/aws-cloudfront');
import route53 = require('@aws-cdk/aws-route53');
import s3 = require('@aws-cdk/aws-s3');
import s3deploy = require('@aws-cdk/aws-s3-deployment');
import acm = require('@aws-cdk/aws-certificatemanager');
import cdk = require('@aws-cdk/core');
import targets = require('@aws-cdk/aws-route53-targets/lib');
import { Construct } from '@aws-cdk/core';

export interface StaticSiteProps {
    domainName: string,
    siteSubDomain: string,
    zoneId: string,
    cnames: string[]
}

/**
 * Static site infrastructure, which deploys site content to an S3 bucket.
 *
 * The site redirects from HTTP to HTTPS, using a CloudFront distribution,
 * and ACM cert. DNS manipulation is disabled for this instance since that is being
 * managed elsewhere for now.
 */
export class StaticSite extends Construct {
    constructor(parent: Construct, name: string, props: StaticSiteProps) {
        super(parent, name);

        const zone = route53.HostedZone.fromHostedZoneAttributes(this, 'public-zone', { hostedZoneId: props.zoneId, zoneName: props.domainName });
        const siteDomain = props.siteSubDomain + '.' + props.domainName;
        new cdk.CfnOutput(this, 'Site', { value: 'https://' + siteDomain });

        

        // Include the siteDomain as a CNAME if it isn't specified
        const cnames = props.cnames;
        if (!cnames.includes(siteDomain)) cnames.push(siteDomain);

        // Origin Access Identity
        const cfOai = new cloudfront.OriginAccessIdentity(this, 'OriginAccessIdentity');

        // Content bucket
        const siteBucket = new s3.Bucket(this, 'SiteBucket', {
            bucketName: siteDomain,
            websiteIndexDocument: 'index.html',
            websiteErrorDocument: 'error.html',
            publicReadAccess: false,
            removalPolicy: cdk.RemovalPolicy.DESTROY
        });
        new cdk.CfnOutput(this, 'Bucket', { value: siteBucket.bucketName });

        /* TLS certificate for our CFN distro
        * This uses the non-automated validation method and may require setting up DNS records manually.
        * The ACM certificate CFN resource shuold pause while you do this and eventaully continue once records resolve.
        */
        const certificateArn = new acm.Certificate(this, 'SiteCertificate', {
            domainName: siteDomain,
            subjectAlternativeNames: props.cnames,
            validationMethod: acm.ValidationMethod.DNS
        }).certificateArn;
        new cdk.CfnOutput(this, 'Certificate', { value: certificateArn });

        // CloudFront distribution that provides HTTPS
        const distribution = new cloudfront.CloudFrontWebDistribution(this, 'SiteDistribution', {
            priceClass: cloudfront.PriceClass.PRICE_CLASS_100,
            aliasConfiguration: {
                acmCertRef: certificateArn,
                names: cnames, //Should already contain the full name
                sslMethod: cloudfront.SSLMethod.SNI,
                securityPolicy: cloudfront.SecurityPolicyProtocol.TLS_V1_2_2018
            },
            originConfigs: [
                {
                    s3OriginSource: {
                        s3BucketSource: siteBucket,
                        originAccessIdentity: cfOai
                    },
                    behaviors: [{ isDefaultBehavior: true }],
                }
            ]
        });
        new cdk.CfnOutput(this, 'DistributionId', { value: distribution.distributionId });

        // TODO: Remove this
        // Deploy site contents to S3 bucket
        new s3deploy.BucketDeployment(this, 'DeployWithInvalidation', {
            sources: [s3deploy.Source.asset('./site-contents')],
            destinationBucket: siteBucket,
            distribution,
            distributionPaths: ['/*'],
        });

        //Alias Records
        new route53.ARecord(this, 'ARecord', {
            recordName: siteDomain,
            zone,
            target: route53.RecordTarget.fromAlias(new targets.CloudFrontTarget(distribution))
        });
        new route53.AaaaRecord(this, 'AAAARecord', {
            recordName: siteDomain,
            zone,
            target: route53.RecordTarget.fromAlias(new targets.CloudFrontTarget(distribution))
        });
    }
}