import * as cdk from 'aws-cdk-lib';
import { LambdaIntegration, RestApi } from 'aws-cdk-lib/aws-apigateway';
import { AttributeType, Table } from 'aws-cdk-lib/aws-dynamodb';
import { ManagedPolicy, Role, ServicePrincipal } from 'aws-cdk-lib/aws-iam';
import { Code, Function, Runtime } from 'aws-cdk-lib/aws-lambda';
import { Construct } from 'constructs';
import path = require('path');
// import * as sqs from 'aws-cdk-lib/aws-sqs';

export class SonicwareCrudStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const lambdaRole = new Role(this, 'LambdaBasicRole', {
      roleName: 'lambda-basic-execution-role',
      assumedBy: new ServicePrincipal('lambda.amazonaws.com'),
    });
    lambdaRole.addManagedPolicy(ManagedPolicy.fromAwsManagedPolicyName('service-role/AWSLambdaBasicExecutionRole'));
    lambdaRole.addManagedPolicy(ManagedPolicy.fromAwsManagedPolicyName('AmazonDynamoDBFullAccess'));

    const api = new RestApi(this, 'SonicwareContactApi', {
      restApiName: 'sonicware-contact-api',
      description: 'sonicware.pro contact api',
      deploy: true
    });

    const table = new Table(this, 'Contact', {
      tableName: 'sonicware-contact-data-table',
      partitionKey: { name: 'id', type: AttributeType.STRING }
    });

    const createMessageLambda = new Function(this, 'CreateMessageLambda', {
      code: Code.fromAsset(path.join(__dirname, './functions/create-message')),
      runtime: Runtime.NODEJS_16_X,
      description: "Create message lambda",
      functionName: "create-message-lambda",
      handler: "index.createHandler",
      timeout: cdk.Duration.seconds(30),
      role: lambdaRole,
      memorySize: 128,
      environment: {
        "TABLE_NAME": table.tableName,
      }
    });

    const listMessagesLambda = new Function(this, 'ListMessagesLambda', {
      code: Code.fromAsset(path.join(__dirname, './functions/list-messages')),
      runtime: Runtime.NODEJS_16_X,
      description: "List messages lambda",
      functionName: "list-messages-lambda",
      handler: "index.listHandler",
      timeout: cdk.Duration.seconds(30),
      role: lambdaRole,
      memorySize: 128,
      environment: {
        "TABLE_NAME": table.tableName,
      }
    });

    const messageServiceResource = api.root.addResource('message');

    messageServiceResource.addMethod('POST', new LambdaIntegration(createMessageLambda), {
      apiKeyRequired: false
    });

    messageServiceResource.addMethod('GET', new LambdaIntegration(listMessagesLambda), {
      apiKeyRequired: false
    });
  }
}
