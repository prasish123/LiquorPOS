import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import cookieParser from 'cookie-parser';
import { randomBytes } from 'crypto';

describe('CSRF Protection (e2e)', () => {
  let app: INestApplication;
  let csrfToken: string;
  let csrfCookie: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();

    // Apply same middleware as main.ts
    app.use(cookieParser());

    // CSRF Protection middleware (same as main.ts)
    app.use((req: any, res: any, next: any) => {
      const cookies = req.cookies as Record<string, string> | undefined;
      if (!cookies || !cookies['csrf-token']) {
        const token = randomBytes(32).toString('hex');
        res.cookie('csrf-token', token, {
          httpOnly: false,
          secure: false, // Test environment
          sameSite: 'strict',
        });
      }

      if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) {
        if (req.path.startsWith('/auth/csrf-token')) {
          return next();
        }

        const cookieToken = cookies?.['csrf-token'];
        const headerToken = req.headers['x-csrf-token'] as string | undefined;

        if (!cookieToken || cookieToken !== headerToken) {
          return res.status(403).json({
            message: 'Invalid CSRF token',
            error: 'CSRF_TOKEN_MISMATCH',
          });
        }
      }
      next();
    });

    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: false,
        transform: true,
      }),
    );

    app.enableCors({
      origin: ['http://localhost:5173'],
      credentials: true,
    });

    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('CSRF Token Retrieval', () => {
    it('should get CSRF token from /auth/csrf-token', async () => {
      const response = await request(app.getHttpServer())
        .get('/auth/csrf-token')
        .expect(200);

      expect(response.body).toHaveProperty('csrfToken');
      csrfToken = response.body.csrfToken;

      // Extract CSRF cookie
      const cookies = response.headers['set-cookie'];
      expect(cookies).toBeDefined();
      const csrfCookieHeader = cookies.find((c: string) =>
        c.startsWith('csrf-token='),
      );
      expect(csrfCookieHeader).toBeDefined();
      csrfCookie = csrfCookieHeader.split(';')[0].split('=')[1];
    });

    it('should set csrf-token cookie on first request', async () => {
      const response = await request(app.getHttpServer()).get('/');

      const cookies = response.headers['set-cookie'];
      expect(cookies).toBeDefined();
      const csrfCookieHeader = cookies.find((c: string) =>
        c.startsWith('csrf-token='),
      );
      expect(csrfCookieHeader).toBeDefined();
    });
  });

  describe('CSRF Protection on Login Endpoint', () => {
    it('should reject login request without CSRF token', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          username: 'admin',
          password: 'admin123',
        })
        .expect(403);

      expect(response.body).toHaveProperty('message', 'Invalid CSRF token');
      expect(response.body).toHaveProperty('error', 'CSRF_TOKEN_MISMATCH');
    });

    it('should reject login request with mismatched CSRF token', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/login')
        .set('Cookie', 'csrf-token=valid-token')
        .set('x-csrf-token', 'different-token')
        .send({
          username: 'admin',
          password: 'admin123',
        })
        .expect(403);

      expect(response.body).toHaveProperty('message', 'Invalid CSRF token');
    });

    it('should accept login request with valid CSRF token', async () => {
      // First get a CSRF token
      const tokenResponse = await request(app.getHttpServer()).get(
        '/auth/csrf-token',
      );

      const cookies = tokenResponse.headers['set-cookie'];
      const csrfCookieHeader = cookies.find((c: string) =>
        c.startsWith('csrf-token='),
      );
      const token = csrfCookieHeader.split(';')[0].split('=')[1];

      // Now attempt login with CSRF token
      const response = await request(app.getHttpServer())
        .post('/auth/login')
        .set('Cookie', `csrf-token=${token}`)
        .set('x-csrf-token', token)
        .send({
          username: 'admin',
          password: 'admin123',
        });

      // Should not be 403 (CSRF error)
      // May be 401 (invalid credentials) or 200 (success) depending on test data
      expect(response.status).not.toBe(403);
    });
  });

  describe('CSRF Protection on State-Changing Endpoints', () => {
    let authToken: string;

    beforeAll(async () => {
      // Get CSRF token
      const tokenResponse = await request(app.getHttpServer()).get(
        '/auth/csrf-token',
      );
      const cookies = tokenResponse.headers['set-cookie'];
      const csrfCookieHeader = cookies.find((c: string) =>
        c.startsWith('csrf-token='),
      );
      csrfToken = csrfCookieHeader.split(';')[0].split('=')[1];

      // Login to get auth token
      const loginResponse = await request(app.getHttpServer())
        .post('/auth/login')
        .set('Cookie', `csrf-token=${csrfToken}`)
        .set('x-csrf-token', csrfToken)
        .send({
          username: 'admin',
          password: 'admin123',
        });

      if (loginResponse.status === 200) {
        const authCookies = loginResponse.headers['set-cookie'];
        const authCookieHeader = authCookies.find((c: string) =>
          c.startsWith('access_token='),
        );
        authToken = authCookieHeader.split(';')[0].split('=')[1];
      }
    });

    it('should reject POST /orders without CSRF token', async () => {
      const response = await request(app.getHttpServer())
        .post('/orders')
        .set('Cookie', `access_token=${authToken}`)
        .send({
          locationId: 'loc-1',
          items: [],
          paymentMethod: 'CASH',
        })
        .expect(403);

      expect(response.body).toHaveProperty('message', 'Invalid CSRF token');
    });

    it('should accept POST /orders with valid CSRF token', async () => {
      const response = await request(app.getHttpServer())
        .post('/orders')
        .set('Cookie', `access_token=${authToken}; csrf-token=${csrfToken}`)
        .set('x-csrf-token', csrfToken)
        .send({
          locationId: 'loc-1',
          terminalId: 'term-1',
          employeeId: 'emp-1',
          items: [
            {
              productId: 'prod-1',
              quantity: 1,
              price: 10.0,
            },
          ],
          paymentMethod: 'CASH',
          idempotencyKey: `test-${Date.now()}`,
        });

      // Should not be 403 (CSRF error)
      expect(response.status).not.toBe(403);
    });

    it('should allow GET requests without CSRF token', async () => {
      const response = await request(app.getHttpServer())
        .get('/orders')
        .set('Cookie', `access_token=${authToken}`);

      // Should not be 403 (CSRF error)
      expect(response.status).not.toBe(403);
    });
  });

  describe('CSRF Token Cookie Properties', () => {
    it('should set csrf-token cookie with correct properties', async () => {
      const response = await request(app.getHttpServer()).get(
        '/auth/csrf-token',
      );

      const cookies = response.headers['set-cookie'];
      const csrfCookieHeader = cookies.find((c: string) =>
        c.startsWith('csrf-token='),
      );

      expect(csrfCookieHeader).toContain('SameSite=Strict');
      // httpOnly should be false so JavaScript can read it
      expect(csrfCookieHeader).not.toContain('HttpOnly');
    });
  });
});
