
import { useState, useCallback } from 'react';
import { UsePeerConnectionProps } from '@/types/peer';
import { useFileTransfer } from './useFileTransfer';
import { useConnectionManager } from './useConnectionManager';

export const usePeerConnection = ({
  onFileReceived,
  onProgress,
  onConnectionChange,
  onIncomingFiles
}: UsePeerConnectionProps) => {
  const [localPeerId] = useState(() => Math.random().toString(36).substr(2, 9));
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);

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

  const setFilesForSharing = useCallback((files: File[]) => {
    setSelectedFiles(files);
    setFilesForSharingInternal(files);
    
    // Start waiting for connections when files are ready
    if (!isWaitingForConnection && !connectionRef.current) {
      waitForConnection();
    }
    
    // If we're already connected, send the file list immediately
    if (connectionRef.current?.dataChannel?.readyState === 'open') {
      sendFileList(connectionRef.current.dataChannel);
    }
  }, [isWaitingForConnection, waitForConnection, connectionRef, setFilesForSharingInternal, sendFileList]);

  const requestFiles = useCallback((fileIds: string[]) => {
    if (!connectionRef.current?.dataChannel) {
      throw new Error('No active connection');
    }
    requestFilesInternal(fileIds, connectionRef.current.dataChannel);
  }, [requestFilesInternal, connectionRef]);

  const generateShareLink = useCallback(() => {
    const baseUrl = window.location.origin;
    return `${baseUrl}?peer=${localPeerId}`;
  }, [localPeerId]);

  const disconnect = useCallback(() => {
    handleDisconnection();
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
