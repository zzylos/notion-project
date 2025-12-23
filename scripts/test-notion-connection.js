#!/usr/bin/env node

/**
 * Notion API Connection Test Script
 *
 * Usage:
 *   node scripts/test-notion-connection.js <API_KEY> <DATABASE_ID>
 *
 * Example:
 *   node scripts/test-notion-connection.js secret_abc123 abc123def456
 */

const NOTION_API_BASE = 'https://api.notion.com/v1';

async function testConnection(apiKey, databaseId) {
  console.log('\n🔍 Notion API Connection Test\n');
  console.log('='.repeat(50));

  // Validate inputs
  if (!apiKey || !databaseId) {
    console.error('❌ Error: Both API key and Database ID are required\n');
    console.log('Usage: node scripts/test-notion-connection.js <API_KEY> <DATABASE_ID>\n');
    process.exit(1);
  }

  console.log(`📝 API Key: ${apiKey.substring(0, 10)}...${apiKey.substring(apiKey.length - 4)}`);
  console.log(`📝 Database ID: ${databaseId}`);
  console.log('='.repeat(50));

  // Test 1: Check API key validity by fetching user info
  console.log('\n📋 Test 1: Validating API Key...');
  try {
    const userResponse = await fetch(`${NOTION_API_BASE}/users/me`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Notion-Version': '2022-06-28',
      },
    });

    if (userResponse.ok) {
      const userData = await userResponse.json();
      console.log('   ✅ API Key is valid!');
      console.log(`   👤 Bot Name: ${userData.name || 'Unknown'}`);
      console.log(`   🤖 Bot ID: ${userData.id}`);
      if (userData.bot?.owner?.type === 'workspace') {
        console.log(`   🏢 Workspace: ${userData.bot.owner.workspace ? 'Connected' : 'Unknown'}`);
      }
    } else {
      const errorText = await userResponse.text();
      console.log('   ❌ API Key validation failed!');
      console.log(`   📛 Status: ${userResponse.status}`);
      console.log(`   📛 Error: ${errorText}`);

      if (userResponse.status === 401) {
        console.log('\n   💡 Tip: The API key appears to be invalid or expired.');
        console.log('   💡 Make sure you copied the full "Internal Integration Token" from:');
        console.log('   💡 https://www.notion.so/my-integrations');
      }
      return false;
    }
  } catch (error) {
    console.log('   ❌ Network error while validating API key');
    console.log(`   📛 Error: ${error.message}`);
    return false;
  }

  // Test 2: Check database access
  console.log('\n📋 Test 2: Checking Database Access...');
  try {
    const dbResponse = await fetch(`${NOTION_API_BASE}/databases/${databaseId}`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Notion-Version': '2022-06-28',
      },
    });

    if (dbResponse.ok) {
      const dbData = await dbResponse.json();
      const dbTitle = dbData.title?.[0]?.plain_text || 'Untitled';
      console.log('   ✅ Database access confirmed!');
      console.log(`   📊 Database Name: ${dbTitle}`);
      console.log(`   🔗 URL: ${dbData.url}`);

      // List properties
      const properties = Object.keys(dbData.properties || {});
      console.log(`   📝 Properties (${properties.length}):`);
      properties.forEach(prop => {
        const propData = dbData.properties[prop];
        console.log(`      - ${prop} (${propData.type})`);
      });
    } else {
      const errorText = await dbResponse.text();
      let errorJson;
      try {
        errorJson = JSON.parse(errorText);
      } catch {
        errorJson = { message: errorText };
      }

      console.log('   ❌ Database access failed!');
      console.log(`   📛 Status: ${dbResponse.status}`);
      console.log(`   📛 Error: ${errorJson.message || errorText}`);

      if (dbResponse.status === 404) {
        console.log('\n   💡 Tip: Database not found. This usually means:');
        console.log('   💡 1. The database ID is incorrect');
        console.log('   💡 2. The integration has NOT been added to the database');
        console.log('   💡');
        console.log('   💡 To fix: Open the database in Notion, click "..." menu,');
        console.log('   💡 then "Add connections" and select your integration.');
      } else if (dbResponse.status === 403) {
        console.log('\n   💡 Tip: Access forbidden. The integration does not have');
        console.log('   💡 permission to access this database.');
        console.log('   💡');
        console.log('   💡 For team workspaces, make sure:');
        console.log('   💡 1. The integration is installed in the workspace');
        console.log('   💡 2. The database is shared with the integration');
        console.log('   💡 3. You have admin access to share with integrations');
      }
      return false;
    }
  } catch (error) {
    console.log('   ❌ Network error while checking database');
    console.log(`   📛 Error: ${error.message}`);
    return false;
  }

  // Test 3: Try to query the database
  console.log('\n📋 Test 3: Querying Database...');
  try {
    const queryResponse = await fetch(`${NOTION_API_BASE}/databases/${databaseId}/query`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Notion-Version': '2022-06-28',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ page_size: 5 }),
    });

    if (queryResponse.ok) {
      const queryData = await queryResponse.json();
      console.log('   ✅ Database query successful!');
      console.log(`   📊 Total items fetched: ${queryData.results.length}`);
      console.log(`   📊 Has more items: ${queryData.has_more}`);

      if (queryData.results.length > 0) {
        console.log('\n   📄 Sample items:');
        queryData.results.slice(0, 3).forEach((page, index) => {
          // Find title property
          let title = 'Untitled';
          for (const prop of Object.values(page.properties)) {
            if (prop.type === 'title' && prop.title?.length > 0) {
              title = prop.title.map(t => t.plain_text).join('');
              break;
            }
          }
          console.log(`      ${index + 1}. ${title}`);
        });
      }
    } else {
      const errorText = await queryResponse.text();
      console.log('   ❌ Database query failed!');
      console.log(`   📛 Status: ${queryResponse.status}`);
      console.log(`   📛 Error: ${errorText}`);
      return false;
    }
  } catch (error) {
    console.log('   ❌ Network error while querying database');
    console.log(`   📛 Error: ${error.message}`);
    return false;
  }

  // All tests passed
  console.log('\n' + '='.repeat(50));
  console.log('✅ All tests passed! Your API key and database ID are valid.');
  console.log('='.repeat(50) + '\n');

  return true;
}

// Get arguments from command line
const args = process.argv.slice(2);
const apiKey = args[0];
const databaseId = args[1];

testConnection(apiKey, databaseId).then(success => {
  process.exit(success ? 0 : 1);
});
