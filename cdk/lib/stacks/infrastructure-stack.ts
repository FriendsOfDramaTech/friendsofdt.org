import * as cdk from '@aws-cdk/core';
import { PublicHostedZone } from '@aws-cdk/aws-route53';
import { User, ManagedPolicy, Role, PolicyDocument, AccountPrincipal, Group } from '@aws-cdk/aws-iam'

export interface InfrastructureStackProps extends cdk.StackProps {
    domainName: string
}

export class InfrastructureStack extends cdk.Stack {
    public readonly zone: PublicHostedZone;
    public readonly developerUsers: User[];

    DEVELOPERS = ['mlee', 'hollis', 'thomasco'];

    constructor(scope: cdk.Construct, id: string, props: InfrastructureStackProps) {
        super(scope, id, props);

        //DNS
        this.zone = new PublicHostedZone(this, 'publicZone', {
            zoneName: props.domainName
        });
        new cdk.CfnOutput(this, 'ZoneId', { value: this.zone.hostedZoneId });
        new cdk.CfnOutput(this, 'DNSServers', { value: this.zone.hostedZoneNameServers?.join(',') || "" });

        //Admin access role
        const adminRole = new Role(this, 'AdministratorRole', {
            assumedBy: new AccountPrincipal(this.account),
            description: 'Access to perform dangerous administrator things',
            roleName: 'AdministratorRole',
            path: '/',
            managedPolicies: [ManagedPolicy.fromAwsManagedPolicyName('AdministratorAccess')]
        });


        /*
        * Allow users to add an MFA and the perform self-modification when MFA authenticated.
        * 
        * https://docs.aws.amazon.com/IAM/latest/UserGuide/reference_policies_examples_aws_my-sec-creds-self-manage.html
        */
        const selfUpdatePolicy = new ManagedPolicy(this, 'IAMSelfModifyPolicy', {
            document: PolicyDocument.fromJson({
                "Version": "2012-10-17",
                "Statement": [
                    {
                        "Sid": "AllowViewAccountInfo",
                        "Effect": "Allow",
                        "Action": [
                            "iam:GetAccountPasswordPolicy",
                            "iam:GetAccountSummary",
                            "iam:ListVirtualMFADevices"
                        ],
                        "Resource": "*"
                    },
                    {
                        "Sid": "AllowManageOwnPasswords",
                        "Effect": "Allow",
                        "Action": [
                            "iam:ChangePassword",
                            "iam:GetUser"
                        ],
                        "Resource": "arn:aws:iam::*:user/${aws:username}"
                    },
                    {
                        "Sid": "AllowManageOwnAccessKeys",
                        "Effect": "Allow",
                        "Action": [
                            "iam:CreateAccessKey",
                            "iam:DeleteAccessKey",
                            "iam:ListAccessKeys",
                            "iam:UpdateAccessKey"
                        ],
                        "Resource": "arn:aws:iam::*:user/${aws:username}"
                    },
                    {
                        "Sid": "AllowManageOwnSigningCertificates",
                        "Effect": "Allow",
                        "Action": [
                            "iam:DeleteSigningCertificate",
                            "iam:ListSigningCertificates",
                            "iam:UpdateSigningCertificate",
                            "iam:UploadSigningCertificate"
                        ],
                        "Resource": "arn:aws:iam::*:user/${aws:username}"
                    },
                    {
                        "Sid": "AllowManageOwnSSHPublicKeys",
                        "Effect": "Allow",
                        "Action": [
                            "iam:DeleteSSHPublicKey",
                            "iam:GetSSHPublicKey",
                            "iam:ListSSHPublicKeys",
                            "iam:UpdateSSHPublicKey",
                            "iam:UploadSSHPublicKey"
                        ],
                        "Resource": "arn:aws:iam::*:user/${aws:username}"
                    },
                    {
                        "Sid": "AllowManageOwnGitCredentials",
                        "Effect": "Allow",
                        "Action": [
                            "iam:CreateServiceSpecificCredential",
                            "iam:DeleteServiceSpecificCredential",
                            "iam:ListServiceSpecificCredentials",
                            "iam:ResetServiceSpecificCredential",
                            "iam:UpdateServiceSpecificCredential"
                        ],
                        "Resource": "arn:aws:iam::*:user/${aws:username}"
                    },
                    {
                        "Sid": "AllowManageOwnVirtualMFADevice",
                        "Effect": "Allow",
                        "Action": [
                            "iam:CreateVirtualMFADevice",
                            "iam:DeleteVirtualMFADevice"
                        ],
                        "Resource": "arn:aws:iam::*:mfa/${aws:username}"
                    },
                    {
                        "Sid": "AllowManageOwnUserMFA",
                        "Effect": "Allow",
                        "Action": [
                            "iam:DeactivateMFADevice",
                            "iam:EnableMFADevice",
                            "iam:ListMFADevices",
                            "iam:ResyncMFADevice"
                        ],
                        "Resource": "arn:aws:iam::*:user/${aws:username}"
                    },
                    {
                        "Sid": "AllowSelfFederate",
                        "Effect": "Allow",
                        "Action": [
                            "sts:GetFederationToken"
                        ],
                        "Resource": "arn:aws:sts::*:federated-user/${aws:username}"
                    },
                    {
                        "Sid": "DenyAllExceptListedIfNoMFA",
                        "Effect": "Deny",
                        "NotAction": [
                            "iam:CreateVirtualMFADevice",
                            "iam:EnableMFADevice",
                            "iam:GetUser",
                            "iam:ListMFADevices",
                            "iam:ListVirtualMFADevices",
                            "iam:ResyncMFADevice",
                            "sts:GetSessionToken",
                            "sts:GetFederationToken"
                        ],
                        "Resource": "*",
                        "Condition": {
                            "BoolIfExists": {
                                "aws:MultiFactorAuthPresent": "false"
                            }
                        }
                    }
                ]
            }),
            description: "Allow users to manage their own passwords and MFA but NOTHING else until they are MFA authenticated.",
            managedPolicyName: 'IAMSelfModify',
            path: '/'
        });
        
        //Admin Group
        const adminGroup = new Group(this, 'Admin Group', {
            groupName: "Administrators",
            path: '/',
            managedPolicies: [selfUpdatePolicy, ManagedPolicy.fromAwsManagedPolicyName('ReadOnlyAccess')]
        });
        //Group has inline permissions to access admin role
        adminRole.grant(adminGroup.grantPrincipal, 'sts:assumeRole');
        
        //Admin Users
        this.developerUsers = []
        for (let entry of this.DEVELOPERS) {
            let user = new User(this, entry, {
                userName: entry,
                path: '/',
                groups: [adminGroup]
            });
        }
    }
}