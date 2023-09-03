import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  DynamoDBDocumentClient,
  ScanCommand,
  PutCommand,
} from "@aws-sdk/lib-dynamodb";
const client = new DynamoDBClient({});
const ddbDocClient = DynamoDBDocumentClient.from(client);

const exportItemsTableName = "expenses-test";
const importItemsTableName = "prod";

const migrateDatabaseHandler = async () => {
  var params = {
    TableName: exportItemsTableName,
  };

  try {
    var data = await ddbDocClient.send(new ScanCommand(params));
    console.log(
      `Retrieved all items from database: ${JSON.stringify(data.Items)}`
    );
  } catch (err) {
    console.log("Error", err);
  }

  for await (const item of data.Items) {
    console.log(`item: ${JSON.stringify(item)}`);

    var params = {
      TableName: importItemsTableName,
      Item: { ...item },
    };

    try {
      const data = await ddbDocClient.send(new PutCommand(params));
      console.log("Success - item added or updated", data);
    } catch (err) {
      console.log("Error", err);
    }
  }
};

migrateDatabaseHandler().then(() =>
  console.log("Migrated completed successfully.")
);
