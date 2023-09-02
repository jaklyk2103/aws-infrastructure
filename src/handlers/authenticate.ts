import { APIGatewayProxyEvent, APIGatewayProxyResult, APIGatewayTokenAuthorizerEvent, AuthResponse, PolicyDocument } from 'aws-lambda';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, GetCommand } from '@aws-sdk/lib-dynamodb';
import { SSMClient, GetParameterCommand } from '@aws-sdk/client-ssm';

const client = new DynamoDBClient({});
const documentClient = DynamoDBDocumentClient.from(client);
const tableName = process.env.TABLE_NAME;
const keyParameterName = process.env.KEY_PARAMETER_NAME;
const ssmClient = new SSMClient();

export const authenticateHandler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  console.log('Authenticate function invoked');

  return {
    statusCode: 200,
    body: ''
  }
};
