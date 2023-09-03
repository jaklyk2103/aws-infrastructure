import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import UserService from "../user/user.service";

import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";
import UserRepository from "../user/user.repository";

const client = new DynamoDBClient({});
const documentClient = DynamoDBDocumentClient.from(client);
const tableName = String(process.env.TABLE_NAME);

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
    const userRepository = new UserRepository(documentClient, tableName);
    const userService = new UserService(userRepository);
    const token = await userService.logInUser({ email, password });
    return {
      statusCode: 200,
      body: token,
    };
  } catch (error) {
    console.error(`Failed to authenticate. Error: ${JSON.stringify(error)}`);
    return {
      statusCode: 400,
      body: "",
    };
  }
};
