import IPFSService from '../services/ipfsService.mjs';
import fs from 'fs';
import { fileURLToPath } from 'url';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function testIPFSService() {
  try {
    console.log('🚀 Starting IPFS service test...');
    
    // Initialize the IPFS service
    const ipfsService = new IPFSService();
    
    // Test space creation
    console.log('\n🔧 Testing space creation...');
    const testUserId = 'test-user-' + Date.now();
    const space = await ipfsService.createSpaceForUser(testUserId, {
      name: 'Test Space',
      description: 'Test space for IPFS service',
      isPrivate: true,
      replication: 3
    });
    
    console.log('✅ Space created:', {
      id: space.id,
      name: space.name,
      isPrivate: space.isPrivate
    });
    
    // Test file upload
    console.log('\n📤 Testing file upload...');
    const testFilePath = path.join(__dirname, 'test-upload.txt');
    fs.writeFileSync(testFilePath, 'Hello, IPFS! This is a test file.');
    
    const uploadResult = await ipfsService.uploadFile(fs.readFileSync(testFilePath), {
      filename: 'test-upload.txt',
      contentType: 'text/plain',
      spaceDID: space.id,
      metadata: {
        test: true,
        uploadedBy: testUserId
      }
    });
    
    console.log('✅ File uploaded:', {
      cid: uploadResult.cid,
      size: uploadResult.size,
      url: uploadResult.url
    });
    
    // Test file info
    console.log('\nℹ️  Testing file info...');
    const fileInfo = await ipfsService.getFileInfo(uploadResult.cid, {
      spaceDID: space.id,
      includeMetadata: true
    });
    
    console.log('✅ File info:', {
      cid: fileInfo.cid,
      size: fileInfo.size,
      metadata: fileInfo.metadata
    });
    
    // Test file download
    console.log('\n📥 Testing file download...');
    const { data } = await ipfsService.downloadFile(uploadResult.cid, {
      spaceDID: space.id
    });
    
    console.log('✅ File downloaded. Content:', data.toString().substring(0, 100) + '...');
    
    console.log('\n🎉 All IPFS service tests completed successfully!');
    
  } catch (error) {
    console.error('❌ Error in IPFS service test:', error);
    process.exit(1);
  }
}

testIPFSService();
