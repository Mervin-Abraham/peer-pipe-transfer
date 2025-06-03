
import { useState, useCallback, useRef, useEffect } from 'react';
import { useFileTransfer } from './useFileTransfer.jsx';

export const useSimplePeerConnection = ({
  onFileReceived,
  onProgress,
  onConnectionChange,
  onIncomingFiles
}) => {
  const [localPeerId] = useState(() => Math.random().toString(36).substr(2, 9));
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [connectionStatus, setConnectionStatus] = useState('Disconnected');
  const [isConnecting, setIsConnecting] = useState(false);
  const [isWaitingForConnection, setIsWaitingForConnection] = useState(false);
  const connectionRef = useRef(null);

  const {
    handleMessage,
    handleFileChunk,
    setFilesForSharing: setFilesForSharingInternal,
    sendFileList,
    requestFiles: requestFilesInternal,
    pendingFilesRef,
    clearFileState
  } = useFileTransfer({
    onFileReceived,
    onProgress,
    onIncomingFiles
  });

  const createMockConnection = useCallback(() => {
    // Create a mock connection for demo purposes
    const mockChannel = {
      readyState: 'open',
      send: (data) => {
        console.log('Mock send:', data);
        // Simulate receiving the data back for demo
        setTimeout(() => {
          if (typeof data === 'string') {
            try {
              const message = JSON.parse(data);
              handleMessage(message, mockChannel);
            } catch (error) {
              console.error('Error parsing mock message:', error);
            }
          }
        }, 100);
      },
      close: () => {
        console.log('Mock channel closed');
      }
    };

    return {
      peer: { close: () => console.log('Mock peer closed') },
      dataChannel: mockChannel
    };
  }, [handleMessage]);

  const handlePeerDisconnected = useCallback(() => {
    console.log('Peer disconnected, clearing file state...');
    clearFileState();
    setConnectionStatus('Disconnected');
    onConnectionChange(false);
  }, [clearFileState, onConnectionChange]);

  const setFilesForSharing = useCallback((files) => {
    setSelectedFiles(files);
    setFilesForSharingInternal(files);
    
    // Start waiting for connections when files are ready
    if (!isWaitingForConnection && !connectionRef.current) {
      setIsWaitingForConnection(true);
      setConnectionStatus('Waiting for connection');
      
      // Create mock connection immediately for demo
      setTimeout(() => {
        connectionRef.current = createMockConnection();
        setConnectionStatus('Connected');
        setIsWaitingForConnection(false);
        onConnectionChange(true);
        
        // Send file list immediately
        sendFileList(connectionRef.current.dataChannel);
      }, 1000);
    }
    
    // If we're already connected, send the file list immediately
    if (connectionRef.current?.dataChannel?.readyState === 'open') {
      sendFileList(connectionRef.current.dataChannel);
    }
  }, [isWaitingForConnection, createMockConnection, setFilesForSharingInternal, sendFileList, onConnectionChange]);

  const connect = useCallback(async (peerId) => {
    setIsConnecting(true);
    setConnectionStatus('Connecting');
    
    try {
      // Simulate connection delay
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      connectionRef.current = createMockConnection();
      setConnectionStatus('Connected');
      setIsConnecting(false);
      onConnectionChange(true);
      
      console.log('Mock connection established to:', peerId);
    } catch (error) {
      console.error('Mock connection failed:', error);
      setIsConnecting(false);
      setConnectionStatus('Disconnected');
      throw error;
    }
  }, [createMockConnection, onConnectionChange]);

  const requestFiles = useCallback((fileIds) => {
    if (!connectionRef.current?.dataChannel) {
      throw new Error('No active connection');
    }
    requestFilesInternal(fileIds, connectionRef.current.dataChannel);
  }, [requestFilesInternal]);

  const generateShareLink = useCallback(() => {
    const baseUrl = window.location.origin;
    return `${baseUrl}?peer=${localPeerId}`;
  }, [localPeerId]);

  const disconnect = useCallback(() => {
    if (connectionRef.current?.dataChannel) {
      connectionRef.current.dataChannel.close();
    }
    if (connectionRef.current?.peer) {
      connectionRef.current.peer.close();
    }
    connectionRef.current = null;
    handlePeerDisconnected();
  }, [handlePeerDisconnected]);

  return {
    localPeerId,
    connect,
    disconnect,
    setFilesForSharing,
    requestFiles,
    generateShareLink,
    isConnecting,
    connectionStatus,
    selectedFiles
  };
};
