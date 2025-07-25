import {
  DeleteCommand,
  DeleteCommandOutput,
  DynamoDBDocumentClient,
  GetCommand,
  PutCommand,
  PutCommandOutput,
  UpdateCommand,
  UpdateCommandOutput,
} from "@aws-sdk/lib-dynamodb";
import { User } from "./user.types";

export default class UserRepository {
  constructor(
    private databaseClient: DynamoDBDocumentClient,
    private tableName: string
  ) {}

  async addUser(user: User): Promise<PutCommandOutput> {
    const putCommand = new PutCommand({
      TableName: this.tableName,
      Item: {
        recordType: "USER",
        recordUniqueInformation: user.email,
        ...user,
      },
    });

    return this.databaseClient.send(putCommand);
  }

  async getUserByEmail(email: string): Promise<User> {
    const getCommand = new GetCommand({
      Key: {
        recordType: "USER",
        recordUniqueInformation: email,
      },
      TableName: this.tableName,
    });
    const user = (await this.databaseClient.send(getCommand))
      .Item as User | null;

    if (!user) {
      throw new Error("User not found");
    }

    if (!user.email || !user.hashedPassword || !user.salt) {
      throw new Error("User auth data incomplete");
    }

    return user;
  }

  async deleteUserByEmail(email: string): Promise<DeleteCommandOutput> {
    const deleteCommand = new DeleteCommand({
      Key: {
        recordType: "USER",
        recordUniqueInformation: email,
      },
      TableName: this.tableName,
    });

    return this.databaseClient.send(deleteCommand);
  }

  async removeUserAttributes(
    email: string,
    userAttributesToDelete: (keyof User)[]
  ): Promise<UpdateCommandOutput> {
    const updateCommand = new UpdateCommand({
      Key: {
        recordType: "USER",
        recordUniqueInformation: email,
      },
      TableName: this.tableName,
      UpdateExpression: `REMOVE ${userAttributesToDelete.join(",")}`,
    });

    return this.databaseClient.send(updateCommand);
  }

  async updateUser(newUser: User): Promise<PutCommandOutput> {
    const putCommand = new PutCommand({
      TableName: this.tableName,
      Item: {
        recordType: "USER",
        recordUniqueInformation: newUser.email,
        ...newUser,
      },
    });

    return this.databaseClient.send(putCommand);
  }

  async updateUserAttributes(
    email: string,
    userAttributes: Partial<User>
  ): Promise<UpdateCommandOutput> {
    const keys = Object.keys(userAttributes);
    const valuesAsObject = this.createAttributesValuesObjectFromArray(Object.values(userAttributes));

    const updateExpressionDynamicPart = keys.map((key, index) => `${keys[index]} = :v${index}`).join(', ');
    const updateExpression = `SET ${updateExpressionDynamicPart}`;
    
    const updateCommand = new UpdateCommand({
      Key: {
        recordType: "USER",
        recordUniqueInformation: email,
      },
      TableName: this.tableName,
      UpdateExpression: updateExpression,
      ExpressionAttributeValues: valuesAsObject,
    });
    return this.databaseClient.send(updateCommand);
  }

  private createAttributesValuesObjectFromArray(values: string[]): Record<string, string>  {
    return Object.values(values).reduce((acc, attribute, index) => {
      acc = {
        ...acc,
        [`:v${index}`]: attribute
      }
      return acc;
    }, {});
  }
}
