import {
  APIGatewayTokenAuthorizerEvent,
  AuthResponse,
  PolicyDocument,
} from "aws-lambda";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, GetCommand } from "@aws-sdk/lib-dynamodb";
import { SSMClient, GetParameterCommand } from "@aws-sdk/client-ssm";
import { verify } from "jsonwebtoken";

const client = new DynamoDBClient({});
const documentClient = DynamoDBDocumentClient.from(client);
const tableName = process.env.TABLE_NAME;
const keyParameterName = process.env.KEY_PARAMETER_NAME;
const ssmClient = new SSMClient();

type UserAuthorizationPayload = {
  userId: string;
  userToken: string;
};

const getParameterFromSSM = async function (): Promise<string> {
  return (
    (
      await ssmClient.send(
        new GetParameterCommand({
          Name: keyParameterName,
          WithDecryption: true,
        })
      )
    ).Parameter?.Value || ""
  );
};

const generatePolicy = function (effect: "Allow" | "Deny", resource: string) {
  const policyDocument = {} as PolicyDocument;
  if (effect && resource) {
    policyDocument.Version = "2012-10-17";
    policyDocument.Statement = [];
    const statementOne: any = {};
    statementOne.Action = "execute-api:Invoke";
    statementOne.Effect = effect;
    statementOne.Resource = resource;
    policyDocument.Statement[0] = statementOne;
  }
  return policyDocument;
};

const decodeAndVerifyBearerToken = async function (
  token: string
): Promise<UserAuthorizationPayload> {
  const secretKey = await getParameterFromSSM();
  const decodedPayload = verify(token, secretKey, { complete: true })
    .payload as UserAuthorizationPayload;
  if (!decodedPayload?.userId) {
    console.error("No user id");
    throw new Error();
  }

  if (!decodedPayload?.userToken) {
    console.error("No user token");
    throw new Error();
  }

  return decodedPayload;
};

const validateUserToken = async function (
  payload: UserAuthorizationPayload
): Promise<boolean> {
  const userItem = (
    await documentClient.send(
      new GetCommand({
        TableName: tableName,
        Key: {
          recordType: "USER",
          recordUniqueInformation: payload.userId,
        },
      })
    )
  ).Item;

  if (!userItem) {
    console.log("User not found");
    throw new Error("User not found");
  }

  if (!userItem.sessionToken) {
    console.log("User not logged in");
    throw new Error("User not logged in");
  }

  return payload.userToken === userItem.sessionToken;
};

export const authorizerHandler = async (
  event: APIGatewayTokenAuthorizerEvent
): Promise<AuthResponse> => {
  console.log("Authorizer function invoked");

  if (!event.authorizationToken) {
    throw new Error("No authorization token");
  }

  try {
    const decodedPayload = await decodeAndVerifyBearerToken(
      event.authorizationToken
    );
    const isUserAuthorized = validateUserToken(decodedPayload);

    if (!isUserAuthorized) throw new Error("User not authorized");

    return {
      policyDocument: generatePolicy("Allow", "*"),
      principalId: decodedPayload.userId,
    };
  } catch (error) {
    throw new Error(`Authorization failed: ${JSON.stringify(error)}`);
  }
};
