export type UserCredentials = {
  email: string;
  password: string;
};

export type VerifyUserAuthenticityPayload = {
  email: string;
  userSessionToken: string;
};

export type User = {
  email: string;
  hashedPassword: string;
  salt: string;
  sessionToken?: string;
  sessionTokenExpiryTimestampMsUtc?: string;
};

export type HashedPasswordVerificationPayload = {
  password: string;
  salt: string;
  hashedPassword: string;
};
