import { IsString, IsNotEmpty } from 'class-validator';

export class LoginDto {
  @IsString()
  @IsNotEmpty()
  username: string;

  @IsString()
  @IsNotEmpty()
  password: string;
}

export interface UserPayload {
  id: string;
  username: string;
  firstName: string;
  lastName: string;
  role: string;
}

export interface JwtPayload {
  username: string;
  sub: string;
  role: string;
  jti: string;
}

export interface LoginResponse {
  access_token: string;
  jti: string;
  user: UserPayload;
}

export interface ValidatedUser {
  id: string;
  username: string;
  role: string;
  jti: string;
}
