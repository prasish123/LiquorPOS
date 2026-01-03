# Embedded Database Evaluation for POS Terminals

## Options Comparison

### 1. SQLite (Standard)

**Pros:**
- ✅ **Battle-tested** - Used by billions of devices (iOS, Android, browsers)
- ✅ **Zero configuration** - Single file database
- ✅ **Fast** - Optimized for embedded use cases
- ✅ **Small footprint** - ~600KB library
- ✅ **ACID compliant** - Full transaction support
- ✅ **Wide support** - Every language has bindings

**Cons:**
- ⚠️ **No built-in replication** - Must implement sync manually
- ⚠️ **Limited concurrency** - Single writer at a time
- ⚠️ **No network access** - File-based only

**Use Case:** Perfect for POS terminals (single writer, local storage)

---

### 2. libSQL (Turso)

**Pros:**
- ✅ **SQLite-compatible** - Drop-in replacement
- ✅ **Built-in replication** - Native sync to remote database
- ✅ **Edge computing** - Designed for distributed systems
- ✅ **WebAssembly support** - Runs in browser
- ✅ **Modern features** - Vector search, JSON functions

**Cons:**
- ⚠️ **Newer** - Less battle-tested than SQLite (launched 2022)
- ⚠️ **Vendor dependency** - Turso-specific features
- ⚠️ **Complexity** - More moving parts than vanilla SQLite

**Use Case:** Great for distributed POS systems with built-in sync

---

### 3. postgres-sqlite Extension (PGlite)

**Pros:**
- ✅ **PostgreSQL compatibility** - Use Postgres syntax/features
- ✅ **Runs in browser** - WASM-based
- ✅ **Extensions** - pgvector, full-text search
- ✅ **Familiar** - Same as cloud database

**Cons:**
- ⚠️ **Larger footprint** - ~3MB vs 600KB for SQLite
- ⚠️ **Slower** - More overhead than SQLite
- ⚠️ **Experimental** - Still in development
- ⚠️ **No native replication** - Must implement sync

**Use Case:** When you need PostgreSQL features locally

---

## Recommendation: **libSQL** 🏆

### Why libSQL for POS Terminals?

1. **Built-in Sync** - Critical for our 3-tier architecture
   ```typescript
   // libSQL automatically syncs to remote database
   const db = new Database('pos-terminal.db', {
     syncUrl: 'http://store-server.local:8080',
     syncInterval: 5000, // 5 seconds
   });
   
   // No manual sync code needed!
   ```

2. **SQLite Compatibility** - Easy migration path
   - Same SQL syntax
   - Same file format
   - Same performance characteristics

3. **Modern Features**
   - Vector search (for AI product search)
   - JSON functions (for flexible schemas)
   - Embedded replicas (automatic failover)

4. **Edge-First Design** - Built for POS use cases
   - Offline-first
   - Automatic conflict resolution
   - Real-time sync

### Architecture with libSQL

```
┌─────────────────────────────────────────────────────────────┐
│  POS Terminal (Browser/Electron)                            │
│  ┌───────────────────────────────────────────────────────┐  │
│  │  libSQL (Embedded)                                    │  │
│  │  • Local database file                                │  │
│  │  • Automatic sync to store server                     │  │
│  │  • Conflict resolution built-in                       │  │
│  └───────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                         ↓ (automatic sync every 5s)
┌─────────────────────────────────────────────────────────────┐
│  Store Server (libSQL Server)                               │
│  • Receives syncs from all POS terminals                    │
│  • Aggregates transactions                                  │
│  • Replicates to cloud PostgreSQL                           │
└─────────────────────────────────────────────────────────────┘
                         ↓ (PostgreSQL replication)
┌─────────────────────────────────────────────────────────────┐
│  Cloud Database (PostgreSQL + pgvector)                     │
│  • Multi-store aggregation                                  │
│  • Analytics, AI features                                   │
└─────────────────────────────────────────────────────────────┘
```

### Implementation Example

```typescript
// POS Terminal (libSQL)
import { createClient } from '@libsql/client';

const db = createClient({
  url: 'file:pos-terminal.db',
  syncUrl: 'http://store-server.local:8080', // Store server
  syncInterval: 5000, // Sync every 5 seconds
  authToken: process.env.SYNC_TOKEN,
});

// Create transaction (automatically synced)
await db.execute({
  sql: 'INSERT INTO transactions (id, total, items) VALUES (?, ?, ?)',
  args: [txId, total, JSON.stringify(items)],
});

// libSQL automatically syncs to store server!
```

```typescript
// Store Server (libSQL Server)
import { createServer } from '@libsql/server';

const server = createServer({
  dbPath: 'store.db',
  port: 8080,
  // Replicate to cloud PostgreSQL
  replicaUrl: process.env.CLOUD_DB_URL,
});

server.listen();
```

---

## Fallback: Standard SQLite

If libSQL proves too new/risky, fall back to **standard SQLite** with manual sync:

```typescript
// Manual sync with SQLite
import Database from 'better-sqlite3';

const db = new Database('pos-terminal.db');

// Sync service (manual implementation)
setInterval(async () => {
  const pending = db.prepare('SELECT * FROM transactions WHERE synced = 0').all();
  
  for (const tx of pending) {
    await fetch('http://store-server.local:3000/sync', {
      method: 'POST',
      body: JSON.stringify(tx),
    });
    
    db.prepare('UPDATE transactions SET synced = 1 WHERE id = ?').run(tx.id);
  }
}, 5000);
```

**Trade-off:** More code, but proven technology.

---

## Decision Matrix

| Criteria | SQLite | libSQL | PGlite |
|----------|--------|--------|--------|
| **Reliability** | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐ |
| **Performance** | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ |
| **Built-in Sync** | ❌ | ✅ | ❌ |
| **Footprint** | 600KB | 800KB | 3MB |
| **PostgreSQL Compat** | ❌ | ❌ | ✅ |
| **Maturity** | 20+ years | 2 years | <1 year |
| **Vendor Lock-in** | None | Turso | None |

---

## Final Recommendation

**Start with libSQL, fallback to SQLite if needed.**

**Phase 1 MVP:** Use libSQL for built-in sync  
**If issues arise:** Switch to standard SQLite (easy migration)

**Why this approach:**
- ✅ libSQL is SQLite-compatible (easy to switch)
- ✅ Built-in sync saves development time
- ✅ Modern features (vector search, JSON)
- ✅ Designed for our exact use case (edge POS)

**Risk Mitigation:**
- Test libSQL thoroughly in pilot phase
- Keep SQLite as backup plan
- Both use same SQL syntax (minimal code changes)
