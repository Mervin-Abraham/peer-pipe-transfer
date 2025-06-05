import { useState, useCallback } from 'react';
import { useFileTransfer } from './useFileTransfer.jsx';
import { useConnectionManager } from './useConnectionManager.jsx';

export const usePeerConnection = ({
  onFileReceived,
  onProgress,
  onConnectionChange,
  onIncomingFiles
}) => {
  const [localPeerId] = useState(() => Math.random().toString(36).substr(2, 9));
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [roomId, setRoomId] = useState(null);

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

  const handlePeerDisconnected = useCallback(() => {
    console.log('Peer disconnected, clearing file state...');
    clearFileState();
    setRoomId(null);
  }, [clearFileState]);

  const {
    connectionStatus,
    isConnecting,
    isWaitingForConnection,
    connectionRef,
    waitForConnection,
    connect,
    handleDisconnection
  } = useConnectionManager({
    onConnectionChange,
    onDataChannelOpen: (channel) => {
      // Send file list immediately when channel opens if we have files
      sendFileList(channel);
    },
    onMessage: handleMessage,
    onFileChunk: handleFileChunk,
    onPeerDisconnected: handlePeerDisconnected
  });

  const setFilesForSharing = useCallback((files) => {
    setSelectedFiles(files);
    setFilesForSharingInternal(files);

    // Start waiting for connections when files are ready
    if (!isWaitingForConnection && !connectionRef.current) {
      waitForConnection().then(() => {
        // Extract room ID from the connection process
        // In a real implementation, this would come from the signaling
        const generatedRoomId = Math.random().toString(36).substr(2, 9);
        setRoomId(generatedRoomId);
      });
    }

    // If we're already connected, send the file list immediately
    if (connectionRef.current?.dataChannel?.readyState === 'open') {
      sendFileList(connectionRef.current.dataChannel);
    }
  }, [isWaitingForConnection, waitForConnection, connectionRef, setFilesForSharingInternal, sendFileList]);

  const requestFiles = useCallback((fileIds) => {
    if (!connectionRef.current?.dataChannel) {
      throw new Error('No active connection');
    }
    requestFilesInternal(fileIds, connectionRef.current.dataChannel);
  }, [requestFilesInternal, connectionRef]);

  const generateShareLink = useCallback(() => {
    const baseUrl = window.location.origin;
    // Use the room ID for sharing instead of local peer ID
    const shareId = roomId || localPeerId;
    return `${baseUrl}?peer=${shareId}`;
  }, [roomId, localPeerId]);

  const disconnect = useCallback(() => {
    handleDisconnection();
    setRoomId(null);
  }, [handleDisconnection]);

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
