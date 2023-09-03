import {
  DeleteCommandOutput,
  PutCommandOutput,
  UpdateCommandOutput,
} from "@aws-sdk/lib-dynamodb";
import {
  HashedPasswordVerificationPayload,
  TokenInformation,
  UserCredentials,
  VerifyUserAuthenticityPayload,
} from "./user.types";
import { pbkdf2, randomBytes } from "crypto";
import UserRepository from "./user.repository";
import { sign } from 'jsonwebtoken';

export default class UserService {
  constructor(private userRepository: UserRepository, private tokenSecretKey: string) {}

  async logInUser(userCredentials: UserCredentials): Promise<string> {
    const { email, password } = userCredentials;
    const areUsersCredentialsCorrect = await this.checkUserCredentials({
      email,
      password,
    });
    if (!areUsersCredentialsCorrect)
      throw new Error("Users credentials incorrect.");

    const { databaseTokenExpiryTimestampMsUtc, tokenForDatabase, tokenForUser } = this.createToken(email, password);
    await this.userRepository.updateUserAttributes(email, {
      sessionToken: tokenForDatabase,
      sessionTokenExpiryTimestampMsUtc: databaseTokenExpiryTimestampMsUtc,
    });
    return tokenForUser;
  }

  async registerUser(
    email: string,
    password: string
  ): Promise<PutCommandOutput> {
    const { hashedPassword, salt } = await this.hashPassword(password);

    return this.userRepository.addUser({
      email,
      hashedPassword,
      salt,
    });
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

  private createToken(email: string, hashedPassword: string): TokenInformation {
    const tokenForDatabase = randomBytes(256).toString("hex");
    const tokenForUser = sign({ 
      userId: email,
      hashedPassword,
      userToken: tokenForDatabase,
    }, this.tokenSecretKey);
    const databaseTokenExpiry = String(Date.now() + 7776000000); // 90 days from now
    return {
      databaseTokenExpiryTimestampMsUtc: databaseTokenExpiry,
      tokenForDatabase,
      tokenForUser
    }
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

  private hashPassword(
    password: string
  ): Promise<{ hashedPassword: string; salt: string }> {
    const salt = randomBytes(16).toString("hex");

    return new Promise((resolve, reject) => {
      pbkdf2(password, salt, 1000, 64, "sha-512", (error, derivedKey) => {
        if (error) reject(error);
        resolve({
          hashedPassword: derivedKey.toString("hex"),
          salt,
        });
      });
    });
  }

  private async isHashedPasswordCorrect(
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
