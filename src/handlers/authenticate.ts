import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { loginUser } from "../user/manageUser";

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
    const token = await loginUser({ email, password });
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
