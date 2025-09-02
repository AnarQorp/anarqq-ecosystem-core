import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { readFileSync, writeFileSync, unlinkSync } from 'fs';
import ipfsService from '../services/ipfsService.mjs';
import { uploadToStoracha, downloadFromStoracha } from '../services/ipfsService.mjs';

// Setup environment
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config();

// Test configuration
const TEST_FILE = join(__dirname, 'test-file.txt');
const TEST_CONTENT = 'Hello, Web3.Storage! ' + new Date().toISOString();

async function runTests() {
  console.log('Starting IPFS service tests...');
  
  try {
    // 1. Create test file
    writeFileSync(TEST_FILE, TEST_CONTENT);
    console.log('✅ Created test file');

    // 2. Test file upload
    console.log('\n📤 Testing file upload...');
    const fileData = readFileSync(TEST_FILE);
    const uploadResult = await uploadToStoracha(
      fileData,
      'test-upload.txt',
      'test-space'
    );
    
    console.log('✅ File uploaded successfully');
    console.log('   CID:', uploadResult.cid);
    console.log('   URL:', uploadResult.url);

    // 3. Test file download
    console.log('\n📥 Testing file download...');
    const downloadedData = await downloadFromStoracha(uploadResult.cid);
    const downloadedContent = downloadedData.toString();
    
    console.log('✅ File downloaded successfully');
    console.log('   Content matches:', downloadedContent === TEST_CONTENT);
    
    // 4. Test file info
    console.log('\nℹ️  Testing file info...');
    const fileInfo = await ipfsService.getFileInfo(uploadResult.cid);
    console.log('✅ File info retrieved');
    console.log('   CID:', fileInfo.cid);
    console.log('   Size:', fileInfo.size, 'bytes');
    
    console.log('\n🎉 All tests completed successfully!');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
    process.exit(1);
  } finally {
    // Cleanup
    try { unlinkSync(TEST_FILE); } catch (e) {}
  }
}

// Run tests
runTests().catch(console.error);
