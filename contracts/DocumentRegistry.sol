
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

/**
 * @title DocumentRegistry
 * @dev Contrato para registrar documentos de forma inmutable en Pi Network Testnet
 * @author AnarQ&Q Ecosystem
 */
contract DocumentRegistry {
    
    // Evento emitido cuando se registra un documento
    event DocumentRegistered(
        bytes32 indexed documentHash, 
        address indexed sender, 
        string ipfsHash,
        uint256 timestamp
    );
    
    // Estructura para almacenar registros de documentos
    struct Record {
        address sender;
        string ipfsHash;
        uint256 timestamp;
        bool exists;
    }
    
    // Mapeo de hash de documento a registro
    mapping(bytes32 => Record) public documents;
    
    // Contador total de documentos registrados
    uint256 public totalDocuments;
    
    /**
     * @dev Registra un nuevo documento en la blockchain
     * @param documentHash Hash SHA-256 del documento
     * @param ipfsHash Hash IPFS donde está almacenado el documento
     */
    function registerDocument(bytes32 documentHash, string memory ipfsHash) external {
        require(!documents[documentHash].exists, "Document already registered");
        require(bytes(ipfsHash).length > 0, "IPFS hash cannot be empty");
        
        documents[documentHash] = Record({
            sender: msg.sender,
            ipfsHash: ipfsHash,
            timestamp: block.timestamp,
            exists: true
        });
        
        totalDocuments++;
        
        emit DocumentRegistered(documentHash, msg.sender, ipfsHash, block.timestamp);
    }
    
    /**
     * @dev Obtiene la información de un documento registrado
     * @param documentHash Hash del documento a consultar
     * @return sender Dirección que registró el documento
     * @return ipfsHash Hash IPFS del documento
     * @return timestamp Momento del registro
     * @return exists Si el documento existe
     */
    function getRecord(bytes32 documentHash) 
        external 
        view 
        returns (address sender, string memory ipfsHash, uint256 timestamp, bool exists) 
    {
        Record memory record = documents[documentHash];
        return (record.sender, record.ipfsHash, record.timestamp, record.exists);
    }
    
    /**
     * @dev Verifica si un documento está registrado
     * @param documentHash Hash del documento
     * @return Si el documento existe en el registro
     */
    function isDocumentRegistered(bytes32 documentHash) external view returns (bool) {
        return documents[documentHash].exists;
    }
    
    /**
     * @dev Obtiene el número total de documentos registrados
     * @return Cantidad total de documentos
     */
    function getTotalDocuments() external view returns (uint256) {
        return totalDocuments;
    }
}
