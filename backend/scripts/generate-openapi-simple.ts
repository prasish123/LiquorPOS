import { NestFactory } from '@nestjs/core';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Simplified OpenAPI Spec Generator
 * 
 * This generates the OpenAPI spec by creating a minimal app module
 * that only includes the controllers we've documented.
 */

// Import only the documented controllers
import { AuthController } from '../src/auth/auth.controller';
import { OrdersController } from '../src/orders/orders.controller';
import { ProductsController } from '../src/products/products.controller';
import { InventoryController } from '../src/inventory/inventory.controller';
import { CustomersController } from '../src/customers/customers.controller';
import { HealthController } from '../src/health/health.controller';
import { ConexxusController } from '../src/integrations/conexxus/conexxus.controller';
import { LocationsController } from '../src/locations/locations.controller';
import { Module } from '@nestjs/common';

// Create a minimal module with just the controllers
@Module({
  controllers: [
    AuthController,
    OrdersController,
    ProductsController,
    InventoryController,
    CustomersController,
    HealthController,
    ConexxusController,
    LocationsController,
  ],
  providers: [],
})
class DocsModule {}

async function generateOpenApiSpec() {
  console.log('🚀 Starting OpenAPI spec generation...');

  try {
    // Create a temporary app instance
    const app = await NestFactory.create(DocsModule, {
      logger: false,
    });

    // Configure Swagger
    const config = new DocumentBuilder()
      .setTitle('POS-Omni Liquor POS API')
      .setDescription(
        'REST API for POS-Omni liquor store point-of-sale system. ' +
        'Supports order processing, inventory management, customer management, and external integrations.'
      )
      .setVersion('1.0.0')
      .setContact(
        'POS-Omni Support',
        'https://github.com/pos-omni/liquor-pos',
        'support@pos-omni.example.com'
      )
      .setLicense('MIT', 'https://opensource.org/licenses/MIT')
      .addTag('auth', 'Authentication and authorization')
      .addTag('orders', 'Order processing and management')
      .addTag('products', 'Product catalog and search')
      .addTag('inventory', 'Inventory tracking and management')
      .addTag('customers', 'Customer management')
      .addTag('health', 'Health check endpoints')
      .addTag('integrations', 'External system integrations')
      .addTag('locations', 'Store location management')
      .addBearerAuth(
        {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'Enter JWT token',
        },
        'JWT'
      )
      .addCookieAuth('csrf-token', {
        type: 'apiKey',
        in: 'cookie',
        name: 'csrf-token',
        description: 'CSRF protection token (automatically set)',
      })
      .addApiKey(
        {
          type: 'apiKey',
          in: 'header',
          name: 'x-csrf-token',
          description: 'CSRF token from cookie (required for POST/PUT/PATCH/DELETE)',
        },
        'CSRF'
      )
      .addServer('http://localhost:3000', 'Local Development')
      .addServer('https://api.pos-omni.example.com', 'Production')
      .build();

    // Generate the OpenAPI document
    const document = SwaggerModule.createDocument(app, config);

    // Save to file
    const outputPath = path.join(__dirname, '../../openapi.json');
    fs.writeFileSync(outputPath, JSON.stringify(document, null, 2));

    console.log(`✅ OpenAPI spec generated successfully!`);
    console.log(`📄 File saved to: ${outputPath}`);
    console.log(`📊 Endpoints documented: ${Object.keys(document.paths).length}`);
    
    // Print summary
    const tags = document.tags?.map((tag: any) => tag.name) || [];
    console.log(`🏷️  Tags: ${tags.join(', ')}`);

    // Close the app
    await app.close();
    
    console.log('✨ Done!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Failed to generate OpenAPI spec:', error);
    process.exit(1);
  }
}

// Run the generator
generateOpenApiSpec();

