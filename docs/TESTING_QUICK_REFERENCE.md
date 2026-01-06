# Testing Quick Reference Card

## 🚀 Quick Commands

### Backend Testing

```bash
# Run all tests
npm test

# Run with coverage
npm run test:cov

# Run in watch mode
npm run test:watch

# Run E2E tests
npm run test:e2e

# Run specific test file
npm test -- payment-router.service.spec.ts

# Run tests matching pattern
npm test -- --testPathPattern="orders"

# Debug tests
npm run test:debug -- my-test.spec.ts
```

### Frontend Testing

```bash
# Run Playwright tests
npx playwright test

# Run in headed mode
npx playwright test --headed

# Run in debug mode
npx playwright test --debug

# Run specific test
npx playwright test e2e/checkout.spec.ts

# Show report
npx playwright show-report
```

---

## 📁 File Locations

```
backend/
├── src/
│   └── **/*.spec.ts          # Unit tests
├── test/
│   ├── integration/          # Integration tests
│   └── e2e/                  # E2E tests
└── coverage/                 # Coverage reports

frontend/
└── e2e/
    └── *.spec.ts             # Playwright E2E tests
```

---

## 🧪 Test Template

```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { MyService } from './my-service';

describe('MyService', () => {
  let service: MyService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [MyService],
    }).compile();

    service = module.get<MyService>(MyService);
  });

  it('should do something', () => {
    // Arrange
    const input = 'test';

    // Act
    const result = service.doSomething(input);

    // Assert
    expect(result).toBe('expected');
  });
});
```

---

## 🎭 Mocking

### Mock Service

```typescript
const mockService = {
  method: jest.fn().mockResolvedValue('result'),
};
```

### Mock Prisma

```typescript
const mockPrisma = {
  transaction: {
    findUnique: jest.fn(),
    create: jest.fn(),
  },
};
```

### Mock HTTP Request

```typescript
const mockRequest = {
  user: { id: 'user-1' },
  headers: { authorization: 'Bearer token' },
};
```

---

## ✅ Common Assertions

```typescript
// Equality
expect(value).toBe(expected);
expect(value).toEqual(expected);

// Truthiness
expect(value).toBeTruthy();
expect(value).toBeFalsy();
expect(value).toBeDefined();
expect(value).toBeNull();

// Numbers
expect(value).toBeGreaterThan(10);
expect(value).toBeLessThan(100);
expect(value).toBeCloseTo(10.5, 1);

// Strings
expect(string).toContain('substring');
expect(string).toMatch(/pattern/);

// Arrays
expect(array).toHaveLength(5);
expect(array).toContain(item);

// Objects
expect(object).toHaveProperty('key');
expect(object).toMatchObject({ key: 'value' });

// Functions
expect(fn).toHaveBeenCalled();
expect(fn).toHaveBeenCalledWith(arg1, arg2);
expect(fn).toHaveBeenCalledTimes(3);

// Promises
await expect(promise).resolves.toBe(value);
await expect(promise).rejects.toThrow(Error);

// Exceptions
expect(() => fn()).toThrow();
expect(() => fn()).toThrow(Error);
expect(() => fn()).toThrow('message');
```

---

## 🔧 Debugging

### Debug in VS Code

1. Set breakpoint in test file
2. Run: `npm run test:debug -- my-test.spec.ts`
3. Open `chrome://inspect` in Chrome
4. Click "inspect"
5. Debugger will pause at breakpoint

### Debug Playwright

```bash
# Open Playwright Inspector
npx playwright test --debug

# Pause on specific line
await page.pause();
```

### View Test Output

```bash
# Verbose output
npm test -- --verbose

# Show console logs
npm test -- --silent=false
```

---

## 📊 Coverage

### View Coverage Report

```bash
npm run test:cov
open coverage/lcov-report/index.html
```

### Coverage Targets

- Overall: **50%**
- Critical Modules: **90%+**
- New Code: **80%+**

---

## 🎯 Test Naming

### Good Names

```typescript
it('should return user when ID exists')
it('should throw error when user not found')
it('should calculate total with tax')
it('should handle empty cart')
```

### Bad Names

```typescript
it('test user')          // Too vague
it('works')              // Not descriptive
it('test1')              // No context
```

---

## 🚦 Test Status

### Current Metrics (Jan 5, 2026)

- **Coverage:** 43.16%
- **Tests:** 584 total
- **Pass Rate:** 86.3%
- **Quality Score:** 81.8%

### Module Coverage

| Module | Coverage | Status |
|--------|----------|--------|
| Payment Router | 94.38% | 🟢 |
| Receipt Service | 100% | 🟢 |
| Orders Service | 100% | 🟢 |
| Compliance | 100% | 🟢 |
| Inventory | 100% | 🟢 |

---

## 🆘 Troubleshooting

### Test Timeout

```typescript
jest.setTimeout(10000); // 10 seconds
```

### Database Connection Error

```bash
# Check PostgreSQL
pg_isready

# Restart
brew services restart postgresql
```

### Redis Connection Error

```bash
# Check Redis
redis-cli ping

# Start
brew services start redis
```

### Port Already in Use

```bash
# Find process
lsof -i :3000

# Kill process
kill -9 <PID>
```

---

## 📚 Resources

- **Testing Guide:** `docs/TESTING_GUIDE.md`
- **E2E Flows:** `docs/E2E_TEST_FLOWS.md`
- **Onboarding:** `docs/NEW_TESTS_ONBOARDING.md`
- **Postman:** `docs/postman/POS-API.postman_collection.json`

### External Links

- [Jest Docs](https://jestjs.io/docs/getting-started)
- [Playwright Docs](https://playwright.dev/docs/intro)
- [NestJS Testing](https://docs.nestjs.com/fundamentals/testing)

---

## 💬 Support

- **Slack:** #pos-testing
- **Email:** qa-team@company.com
- **Wiki:** https://wiki.company.com/pos/testing

---

**Last Updated:** January 5, 2026

