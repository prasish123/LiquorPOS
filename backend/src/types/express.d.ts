import { ValidatedUser } from '../auth/dto/auth.dto';

declare global {
  namespace Express {
    interface Request {
      user?: ValidatedUser;
    }
  }
}

export {};
