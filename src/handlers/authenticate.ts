import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import UserService from "../user/user.service";

import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";
import UserRepository from "../user/user.repository";
import { SSMClient } from "@aws-sdk/client-ssm";
import ParameterRepository from "../systemParameters/parameter.repository";

const client = new DynamoDBClient({});
const documentClient = DynamoDBDocumentClient.from(client);
const tableName = String(process.env.TABLE_NAME);
const keyParameterName = String(process.env.KEY_PARAMETER_NAME);
const ssmClient = new SSMClient();

export const authenticateHandler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  console.log("Authenticate function invoked");

  const { email, password } = JSON.parse(event?.body || "");

  if (!email || !password) {
    console.error("No email or password");
    return {
      statusCode: 400,
      body: "",
    };
  }

  try {
    const tokenSecretKey = await getTokenSecretKey();

    const userRepository = new UserRepository(documentClient, tableName);
    const userService = new UserService(userRepository, tokenSecretKey);
    const token = await userService.logInUser({ email, password });
    return {
      statusCode: 200,
      body: '',
      headers: {
        "Access-Control-Allow-Headers" : "Content-Type, Accept",
        "Access-Control-Allow-Origin": "http://localhost:3000",
        "Access-Control-Allow-Methods": "OPTIONS,POST,GET",
        "Set-Cookie": `authorizationToken=${token};`
      }
    };
  } catch (error) {
    console.error(`Failed to authenticate. Error: ${JSON.stringify(error)}`);
    return {
      statusCode: 400,
      body: "",
    };
  }
};


async function getTokenSecretKey(): Promise<string> {
  const parameterRepository = new ParameterRepository(ssmClient);
  try {
   const tokenSecretKey = await parameterRepository.getParameterValue(keyParameterName, true);
   if(!tokenSecretKey) {
     throw new Error("");
   }
   return tokenSecretKey;
  } catch(error) {
    console.error("Could not get token key");
    throw error;
  }
    
}