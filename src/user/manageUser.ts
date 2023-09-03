import {
  HashedPasswordVerificationPayload,
  User,
  UserCredentials,
  VerifyUserAuthenticityPayload,
} from "./user.types";
import { pbkdf2 } from "crypto";

export async function loginUser(
  userCredentials: UserCredentials
): Promise<string> {
  const { email, password } = userCredentials;
  const areUsersCredentialsCorrect = await checkUserCredentials({
    email,
    password,
  });
  if (!areUsersCredentialsCorrect)
    throw new Error("Users credentials incorrect.");

  return updateUserToken(userCredentials);
}

export async function logoutUser(email: string): Promise<void> {
  return deleteUserToken(email);
}

export async function deleteUser(
  userCredentials: UserCredentials
): Promise<void> {
  const areUsersCredentialsCorrect = await checkUserCredentials(
    userCredentials
  );
  if (!areUsersCredentialsCorrect)
    throw new Error("Users credentials incorrect.");
  return deleteUserFromDatabase(userCredentials.email);
}

export async function isUserAuthentic(
  verifyUserAuthenticityPayload: VerifyUserAuthenticityPayload
): Promise<boolean> {
  const { email, userSessionToken } = verifyUserAuthenticityPayload;

  try {
    const user = await getUser(email);

    const isTokenFromPayloadValid = userSessionToken === user.sessionToken;
    const isTokenExpired = isUserSessionTokenExpired(
      Number(user.sessionTokenExpiryTimestampMsUtc)
    );

    return isTokenFromPayloadValid && !isTokenExpired;
  } catch (error) {
    return false;
  }
}

function isUserSessionTokenExpired(
  sessionTokenExpiryTimestampMsUtc: number
): boolean {
  return Date.now() > sessionTokenExpiryTimestampMsUtc;
}

export async function checkUserCredentials(
  userCredentials: UserCredentials
): Promise<boolean> {
  const { email, password } = userCredentials;
  const user = await getUser(email);
  const { hashedPassword, salt } = user;
  return isHashedPasswordCorrect({
    hashedPassword,
    salt,
    password,
  });
}

export async function getUser(email: string): Promise<User> {}

export async function deleteUserFromDatabase(email: string): Promise<void> {}

export async function deleteUserToken(email: string): Promise<void> {}

export async function updateUserToken(
  userCredentials: UserCredentials
): Promise<string> {}

export async function isHashedPasswordCorrect(
  hashedPasswordVerificationPayload: HashedPasswordVerificationPayload
): Promise<boolean> {
  const { hashedPassword, password, salt } = hashedPasswordVerificationPayload;
  return new Promise((resolve, reject) => {
    pbkdf2(password, salt, 1000, 64, "sha512", (error, derivedKey) => {
      if (error) reject(error);
      resolve(derivedKey.toString("hex") === hashedPassword);
    });
  });
}
