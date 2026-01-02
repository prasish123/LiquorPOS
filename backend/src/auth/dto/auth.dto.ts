import { IsString, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class LoginDto {
  @ApiProperty({
    description: 'Username for authentication',
    example: 'john.doe',
    type: String,
  })
  @IsString()
  @IsNotEmpty()
  username: string;

  @ApiProperty({
    description: 'Password for authentication',
    example: 'SecurePassword123!',
    type: String,
  })
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
