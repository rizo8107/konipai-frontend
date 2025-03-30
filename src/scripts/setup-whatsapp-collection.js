/**
 * Script to set up the WhatsApp activities collection in PocketBase
 * 
 * Run this script with Node.js:
 * node setup-whatsapp-collection.js
 * 
 * Make sure to set the POCKETBASE_URL and POCKETBASE_ADMIN_EMAIL/POCKETBASE_ADMIN_PASSWORD
 * environment variables before running this script.
 */

const fetch = require('node-fetch');

// Configuration
const PB_URL = process.env.POCKETBASE_URL || 'https://backend-pocketbase.7za6uc.easypanel.host';
const ADMIN_EMAIL = process.env.POCKETBASE_ADMIN_EMAIL;
const ADMIN_PASSWORD = process.env.POCKETBASE_ADMIN_PASSWORD;

if (!ADMIN_EMAIL || !ADMIN_PASSWORD) {
  console.error('Error: POCKETBASE_ADMIN_EMAIL and POCKETBASE_ADMIN_PASSWORD environment variables must be set');
  process.exit(1);
}

async function main() {
  try {
    // Step 1: Admin authentication
    console.log('Authenticating as admin...');
    const authResponse = await fetch(`${PB_URL}/api/admins/auth-with-password`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        identity: ADMIN_EMAIL,
        password: ADMIN_PASSWORD,
      }),
    });

    if (!authResponse.ok) {
      const error = await authResponse.json();
      throw new Error(`Authentication failed: ${error.message}`);
    }

    const authData = await authResponse.json();
    const adminToken = authData.token;

    console.log('Authentication successful!');

    // Step 2: Create WhatsApp activities collection
    console.log('Creating WhatsApp activities collection...');
    
    const collectionData = {
      name: 'whatsapp_activities',
      type: 'base',
      schema: [
        {
          name: 'order_id',
          type: 'relation',
          required: true,
          options: {
            collectionId: '_pb_users_auth_',  // This will be updated to the actual orders collection ID
            cascadeDelete: false,
            maxSelect: 1,
            displayFields: ['id']
          }
        },
        {
          name: 'recipient',
          type: 'text',
          required: true,
        },
        {
          name: 'template_name',
          type: 'text',
          required: true,
        },
        {
          name: 'message_content',
          type: 'json',
          required: true,
        },
        {
          name: 'status',
          type: 'select',
          required: true,
          options: {
            values: ['sent', 'failed']
          }
        },
        {
          name: 'timestamp',
          type: 'date',
          required: true,
          options: {
            timeOnly: false,
            dateOnly: false
          }
        },
        {
          name: 'error_message',
          type: 'text',
          required: false,
        }
      ]
    };

    // First get the orders collection ID
    const collectionsResponse = await fetch(`${PB_URL}/api/collections`, {
      headers: {
        'Authorization': adminToken
      }
    });

    if (!collectionsResponse.ok) {
      const error = await collectionsResponse.json();
      throw new Error(`Failed to fetch collections: ${error.message}`);
    }

    const collections = await collectionsResponse.json();
    const ordersCollection = collections.items.find(c => c.name === 'orders');
    
    if (!ordersCollection) {
      throw new Error('Orders collection not found');
    }

    // Update the relation to point to the orders collection
    collectionData.schema[0].options.collectionId = ordersCollection.id;

    // Create the collection
    const createResponse = await fetch(`${PB_URL}/api/collections`, {
      method: 'POST',
      headers: {
        'Authorization': adminToken,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(collectionData),
    });

    if (!createResponse.ok) {
      const error = await createResponse.json();
      throw new Error(`Failed to create collection: ${error.message}`);
    }

    console.log('WhatsApp activities collection created successfully!');

    // Step 3: Set up indexes for better performance
    const collection = await createResponse.json();
    console.log('Setting up indexes...');

    // Create index on order_id for faster queries
    const orderIdIndexResponse = await fetch(`${PB_URL}/api/collections/${collection.id}/indexes`, {
      method: 'POST',
      headers: {
        'Authorization': adminToken,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: 'order_id_idx',
        type: 'index',
        options: {
          expression: 'order_id'
        }
      }),
    });

    if (!orderIdIndexResponse.ok) {
      console.warn('Failed to create order_id index, but continuing...');
    } else {
      console.log('Created order_id index');
    }

    // Create index on timestamp for sorting
    const timestampIndexResponse = await fetch(`${PB_URL}/api/collections/${collection.id}/indexes`, {
      method: 'POST',
      headers: {
        'Authorization': adminToken,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: 'timestamp_idx',
        type: 'index',
        options: {
          expression: 'timestamp'
        }
      }),
    });

    if (!timestampIndexResponse.ok) {
      console.warn('Failed to create timestamp index, but continuing...');
    } else {
      console.log('Created timestamp index');
    }

    console.log('\nSetup complete! The WhatsApp activities collection is now ready to use.');
    console.log('You can now restart your application and use the WhatsApp activities feature.');

  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

main();
