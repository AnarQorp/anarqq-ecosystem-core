import axios from 'axios';
import MockAdapter from 'axios-mock-adapter';
import * as ipfsService from '../ipfsService';
import { getAuthToken } from '../../lib/auth';

// Mock the auth module
jest.mock('../../lib/auth', () => ({
  getAuthToken: jest.fn(),
}));

// Mock axios
const mockAxios = new MockAdapter(axios);

// Test data
const MOCK_TOKEN = 'test-token';
const MOCK_SPACE_DID = 'did:space:test';
const MOCK_AGENT_DID = 'did:agent:test';
const MOCK_DELEGATION = 'test-delegation';
const MOCK_CID = 'bafybeidfgvc5fzdyzmy5e7j3k5x2kw5y2v4q3j5q3j5q3j5q3j5q3j5q3j5';

// Mock file
const createMockFile = (name: string, type: string, size: number): File => {
  const blob = new Blob(['a'.repeat(size)], { type });
  return new File([blob], name, { type });
};

describe('IPFS Service', () => {
  beforeEach(() => {
    // Reset all mocks before each test
    jest.clearAllMocks();
    mockAxios.reset();
    
    // Mock getAuthToken to return a token
    (getAuthToken as jest.Mock).mockReturnValue(MOCK_TOKEN);
  });

  describe('uploadFile', () => {
    it('should upload a file successfully', async () => {
      const mockFile = createMockFile('test.txt', 'text/plain', 10);
      const mockResponse = {
        cid: MOCK_CID,
        filename: 'test.txt',
        mimeType: 'text/plain',
        size: 10,
        uploadedAt: new Date().toISOString(),
      };

      mockAxios.onPost('/api/ipfs/upload').reply(200, mockResponse);

      const result = await ipfsService.uploadFile(mockFile, {
        spaceDID: MOCK_SPACE_DID,
        metadata: { key: 'value' },
        encrypt: true,
        onProgress: jest.fn(),
      });

      expect(result).toEqual(mockResponse);
      expect(mockAxios.history.post[0].headers['Authorization']).toBe(`Bearer ${MOCK_TOKEN}`);
    });
  });

  describe('downloadFile', () => {
    it('should download a file successfully', async () => {
      const mockData = new ArrayBuffer(10);
      const mockHeaders = {
        'content-disposition': 'attachment; filename="test.txt"',
        'content-type': 'text/plain',
      };

      mockAxios.onGet(`/api/ipfs/download/${MOCK_CID}`)
        .reply(200, mockData, mockHeaders);

      const result = await ipfsService.downloadFile(MOCK_CID, {
        spaceDID: MOCK_SPACE_DID,
        decrypt: true,
      });

      expect(result.filename).toBe('test.txt');
      expect(result.contentType).toBe('text/plain');
      expect(result.data).toEqual(mockData);
    });
  });

  describe('getFileInfo', () => {
    it('should get file info successfully', async () => {
      const mockInfo = {
        cid: MOCK_CID,
        name: 'test.txt',
        size: 10,
        isStored: true,
        deals: [],
        pins: [],
      };

      mockAxios.onGet(`/api/ipfs/info/${MOCK_CID}`)
        .reply(200, mockInfo);

      const result = await ipfsService.getFileInfo(MOCK_CID, MOCK_SPACE_DID);
      expect(result).toEqual(mockInfo);
    });
  });

  describe('createSpace', () => {
    it('should create a space successfully', async () => {
      const mockSpace = {
        spaceDID: MOCK_SPACE_DID,
        agentDID: MOCK_AGENT_DID,
      };

      mockAxios.onPost('/api/ipfs/space')
        .reply(200, mockSpace);

      const result = await ipfsService.createSpace('test-space');
      expect(result).toEqual(mockSpace);
    });
  });

  describe('authorizeSpace', () => {
    it('should authorize a space successfully', async () => {
      mockAxios.onPost('/api/ipfs/authorize')
        .reply(200);

      await expect(ipfsService.authorizeSpace(
        MOCK_SPACE_DID,
        MOCK_AGENT_DID,
        MOCK_DELEGATION
      )).resolves.not.toThrow();
    });
  });

  describe('updateFileMetadata', () => {
    it('should update file metadata successfully', async () => {
      const mockMetadata = { key: 'new-value' };
      const mockResponse = {
        cid: MOCK_CID,
        metadata: mockMetadata,
      };

      mockAxios.onPatch(`/api/ipfs/metadata/${MOCK_CID}`)
        .reply(200, mockResponse);

      const result = await ipfsService.updateFileMetadata(
        MOCK_CID,
        mockMetadata,
        MOCK_SPACE_DID
      );

      expect(result).toEqual(mockResponse);
    });
  });

  describe('deleteFile', () => {
    it('should delete a file successfully', async () => {
      mockAxios.onDelete(`/api/ipfs/delete/${MOCK_CID}`)
        .reply(200);

      await expect(ipfsService.deleteFile(MOCK_CID, MOCK_SPACE_DID))
        .resolves.not.toThrow();
    });
  });
});
