import { GetParameterCommand, SSMClient } from "@aws-sdk/client-ssm";

export default class ParameterRepository {
  constructor(private ssmClient: SSMClient) {}

  async getParameterValue(parameterKey: string, withDecryption?: boolean): Promise<string | undefined> {
    const getParameterCommand = new GetParameterCommand({
      Name: parameterKey,
      WithDecryption: withDecryption
    })
    return (await this.ssmClient.send(getParameterCommand)).Parameter?.Value;
  }
}