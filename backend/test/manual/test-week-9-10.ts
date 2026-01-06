import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ConexxusService } from './integrations/conexxus/conexxus.service';
import { ProductsService } from './products/products.service';
import { PrismaService } from './prisma.service';

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const conexxusService = app.get(ConexxusService);
  const productsService = app.get(ProductsService);
  const prisma = app.get(PrismaService);

  console.log('\n🧪 STARTING WEEK 9-10 VERIFICATION 🧪\n');

  // --- TEST 1: Conexxus Sync ---
  console.log('--- 1. Testing Conexxus Inventory Sync ---');
  try {
    console.log('Running syncInventory()...');
    await conexxusService.syncInventory();

    // Debug: List all products to see what was inserted
    const allProducts = await prisma.product.findMany();
    console.log(`\n📦 DB Content: ${allProducts.length} products found.`);
    allProducts.forEach((p) => console.log(` - SKU: "${p.sku}" | Name: "${p.name}"`));

    // Check for specific items from ItemMaintenance.xml
    // SKU: 012000001345 -> MT DEW DT 20
    const item1 = await prisma.product.findUnique({
      where: { sku: '012000001345' },
    });
    if (item1 && item1.name.includes('MT DEW')) {
      console.log('✅ Conexxus Item 1 Verified: Found MT DEW');
    } else {
      console.error('❌ Conexxus Item 1 Failed: MT DEW not found');
    }

    // SKU: 012000001574 -> AQUAFINA 1LT
    const item2 = await prisma.product.findUnique({
      where: { sku: '012000001574' },
    });
    if (item2 && item2.name.includes('AQUAFINA')) {
      console.log('✅ Conexxus Item 2 Verified: Found AQUAFINA');
    } else {
      console.error('❌ Conexxus Item 2 Failed: AQUAFINA not found');
    }
  } catch (e) {
    console.error('❌ Conexxus Sync Test Failed:', e);
  }

  // --- TEST 2: AI Vector Search (Local) ---
  console.log('\n--- 2. Testing AI Vector Search (Local - Xenova/all-MiniLM-L6-v2) ---');
  try {
    // Should generate embeddings locally without API key
    const query = 'Dew'; // Should match MT DEW
    console.log(`Searching for "${query}"...`);

    const results = await productsService.searchWithAI(query);
    console.log(`Found ${results.length} results.`);

    if (results.length > 0) {
      const firstResult = results[0] as {
        name: string;
        finalScore?: number;
        similarity?: number;
      };
      console.log('Top result:', firstResult.name);
      const foundDew = results.some((r) => (r as { name: string }).name.includes('DEW'));
      if (foundDew) {
        console.log('✅ AI Search Verified: Results contain relevant items.');
      } else {
        console.warn('⚠️ AI Search Warning: "DEW" not found in top results.');
      }

      // Check if finalScore is present (Hybrid logic)
      if ('finalScore' in firstResult || 'similarity' in firstResult) {
        console.log('✅ Hybrid Scoring Verified: Logic applied.');
      } else {
        // Fallback mode might not have scores, which is expected if no key
        console.log(
          'ℹ️ Note: Running in fallback mode (no scores) or no embeddings generated yet.',
        );
      }
    } else {
      console.warn('⚠️ AI Search Warning: No results found.');
    }
  } catch (e) {
    console.error('❌ AI Search Test Failed:', e);
  }

  console.log('\n✅ VERIFICATION COMPLETE');
  await app.close();
}
void bootstrap();
