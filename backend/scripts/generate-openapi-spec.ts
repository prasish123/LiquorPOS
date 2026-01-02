import { NestFactory } from '@nestjs/core';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from '../src/app.module';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Generate OpenAPI Specification JSON
 * 
 * This script generates the OpenAPI specification file from the NestJS application
 * with all Swagger decorators. The spec is saved to backend/openapi.json
 * 
 * Usage:
 *   npm run build
 *   node dist/scripts/generate-openapi-spec.js
 */
async function generateOpenApiSpec() {
  console.log('🚀 Starting OpenAPI spec generation...');

  // Create a temporary app instance without starting the server
  const app = await NestFactory.create(AppModule, {
    logger: false, // Disable logging for cleaner output
  });

  // Configure Swagger with the same settings as main.ts
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
}

// Run the generator
generateOpenApiSpec().catch((error) => {
  console.error('❌ Failed to generate OpenAPI spec:', error);
  process.exit(1);
});

