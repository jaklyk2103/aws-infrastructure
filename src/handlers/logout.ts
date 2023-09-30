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

export const logoutHandler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  console.log("Log out function invoked");

  const { email } = JSON.parse(event?.body || "");

  if (!email) {
    console.error("No email");
    return {
      statusCode: 400,
      body: "",
    };
  }

  try {
    const userRepository = new UserRepository(documentClient, tableName);
    const userService = new UserService(userRepository, '');
    await userService.logOutUser(email);
    return {
      statusCode: 200,
      body: '',
      headers: {
        "Access-Control-Allow-Headers" : "Content-Type, Accept",
        "Access-Control-Allow-Origin": "http://localhost:3000",
        "Access-Control-Allow-Methods": "OPTIONS,POST,GET",
        "Set-Cookie": `authorizationToken=; expires=Thu, 01 Jan 1970 00:00:00 GMT`
      }
    };
  } catch (error) {
    console.error(`Failed to log out. Error: ${JSON.stringify(error)}`);
    return {
      statusCode: 400,
      body: "",
    };
  }
};
