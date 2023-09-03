import {
  DeleteCommandOutput,
  UpdateCommandOutput,
} from "@aws-sdk/lib-dynamodb";
import {
  HashedPasswordVerificationPayload,
  UserCredentials,
  VerifyUserAuthenticityPayload,
} from "./user.types";
import { pbkdf2 } from "crypto";
import UserRepository from "./user.repository";

export default class UserService {
  constructor(private userRepository: UserRepository) {}

  async logInUser(userCredentials: UserCredentials): Promise<string> {
    const { email, password } = userCredentials;
    const areUsersCredentialsCorrect = await this.checkUserCredentials({
      email,
      password,
    });
    if (!areUsersCredentialsCorrect)
      throw new Error("Users credentials incorrect.");

    const token = "asd";
    const tokenExpiry = Date.now() + 1000;
    await this.userRepository.updateUserAttributes(email, {
      sessionToken: token,
      sessionTokenExpiryTimestampMsUtc: String(tokenExpiry),
    });
    return token;
  }

  async logOutUser(email: string): Promise<UpdateCommandOutput> {
    return this.userRepository.removeUserAttributes(email, [
      "sessionToken",
      "sessionTokenExpiryTimestampMsUtc",
    ]);
  }

  async deleteUser(
    userCredentials: UserCredentials
  ): Promise<DeleteCommandOutput> {
    const areUsersCredentialsCorrect = await this.checkUserCredentials(
      userCredentials
    );
    if (!areUsersCredentialsCorrect)
      throw new Error("Users credentials incorrect.");
    return this.userRepository.deleteUserByEmail(userCredentials.email);
  }

  private async isUserAuthentic(
    verifyUserAuthenticityPayload: VerifyUserAuthenticityPayload
  ): Promise<boolean> {
    const { email, userSessionToken } = verifyUserAuthenticityPayload;

    try {
      const user = await this.userRepository.getUserByEmail(email);

      const isTokenFromPayloadValid = userSessionToken === user.sessionToken;
      const isTokenExpired = this.isUserSessionTokenExpired(
        Number(user.sessionTokenExpiryTimestampMsUtc)
      );

      return isTokenFromPayloadValid && !isTokenExpired;
    } catch (error) {
      return false;
    }
  }

  private isUserSessionTokenExpired(
    sessionTokenExpiryTimestampMsUtc: number
  ): boolean {
    return Date.now() > sessionTokenExpiryTimestampMsUtc;
  }

  private async checkUserCredentials(
    userCredentials: UserCredentials
  ): Promise<boolean> {
    const { email, password } = userCredentials;
    const user = await this.userRepository.getUserByEmail(email);
    const { hashedPassword, salt } = user;
    return this.isHashedPasswordCorrect({
      hashedPassword,
      salt,
      password,
    });
  }

  async isHashedPasswordCorrect(
    hashedPasswordVerificationPayload: HashedPasswordVerificationPayload
  ): Promise<boolean> {
    const { hashedPassword, password, salt } =
      hashedPasswordVerificationPayload;
    return new Promise((resolve, reject) => {
      pbkdf2(password, salt, 1000, 64, "sha512", (error, derivedKey) => {
        if (error) reject(error);
        resolve(derivedKey.toString("hex") === hashedPassword);
      });
    });
  }
}
