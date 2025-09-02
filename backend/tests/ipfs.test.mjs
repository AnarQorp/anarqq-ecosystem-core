import { expect } from 'chai';
import { describe, it, before, after } from 'mocha';
import { v4 as uuidv4 } from 'uuid';
import {
  uploadToIPFS,
  downloadFromIPFS,
  getFileInfo,
  createSpace,
  authorizeSpace,
  getSpaceInfo
} from '../services/ipfsService.mjs';

// Test configuration
const TEST_SPACE_NAME = `test-space-${Date.now()}`;
const TEST_FILE_CONTENT = Buffer.from('Hello, IPFS!');
const TEST_FILE_NAME = 'test.txt';
const TEST_METADATA = { test: true, timestamp: new Date().toISOString() };

// Test variables
let testSpaceId;
let testFileCid;

describe('IPFS Service Integration Tests', function() {
  this.timeout(30000); // Increase timeout for IPFS operations

  // Test space creation
  describe('Space Management', () => {
    it('should create a new space', async () => {
      const space = await createSpace({
        name: TEST_SPACE_NAME,
        description: 'Test space for integration tests',
        isPrivate: true,
        metadata: { test: true }
      });

      expect(space).to.have.property('id');
      expect(space.name).to.equal(TEST_SPACE_NAME);
      expect(space.isPrivate).to.be.true;
      
      testSpaceId = space.id;
    });

    it('should retrieve space information', async () => {
      const space = await getSpaceInfo(testSpaceId);
      expect(space).to.have.property('id', testSpaceId);
      expect(space.name).to.equal(TEST_SPACE_NAME);
    });

    it('should authorize a space', async () => {
      // This is a simplified test - in a real scenario, you would test with a real agent DID
      const agentDID = 'did:test:agent';
      const result = await authorizeSpace(testSpaceId, agentDID, {
        read: true,
        write: true,
        admin: false
      });
      
      expect(result).to.have.property('success', true);
    });
  });

  // Test file operations
  describe('File Operations', () => {
    it('should upload a file to IPFS', async () => {
      const result = await uploadToIPFS(TEST_FILE_CONTENT, {
        filename: TEST_FILE_NAME,
        contentType: 'text/plain',
        metadata: TEST_METADATA,
        spaceDID: testSpaceId
      });

      expect(result).to.have.property('cid');
      expect(result).to.have.property('url');
      expect(result.metadata).to.include(TEST_METADATA);
      
      testFileCid = result.cid;
    });

    it('should retrieve file info', async () => {
      const info = await getFileInfo(testFileCid, { spaceDID: testSpaceId });
      expect(info).to.have.property('cid', testFileCid);
      expect(info).to.have.property('filename', TEST_FILE_NAME);
      expect(info.metadata).to.include(TEST_METADATA);
    });

    it('should download a file from IPFS', async () => {
      const result = await downloadFromIPFS(testFileCid, { 
        spaceDID: testSpaceId 
      });
      
      expect(result).to.have.property('data');
      expect(Buffer.from(result.data).toString()).to.equal(TEST_FILE_CONTENT.toString());
      expect(result.filename).to.equal(TEST_FILE_NAME);
    });
  });

  // Cleanup (optional)
  after(async () => {
    // In a real test environment, you might want to clean up test resources
    console.log('\nTest cleanup:');
    console.log(`- Test space ID: ${testSpaceId}`);
    console.log(`- Test file CID: ${testFileCid}`);
  });
});
