
import { useState, useEffect, useCallback, useRef } from 'react';

interface UsePeerConnectionProps {
  onFileReceived: (files: File[]) => void;
  onProgress: (progress: number) => void;
  onConnectionChange: (connected: boolean) => void;
  onIncomingFiles: (fileList: { name: string; size: number; id: string }[]) => void;
}

interface PeerConnection {
  peer: RTCPeerConnection;
  dataChannel: RTCDataChannel | null;
  isInitiator: boolean;
}

export const usePeerConnection = ({
  onFileReceived,
  onProgress,
  onConnectionChange,
  onIncomingFiles
}: UsePeerConnectionProps) => {
  const [localPeerId] = useState(() => Math.random().toString(36).substr(2, 9));
  const [isConnecting, setIsConnecting] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState('Disconnected');
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const connectionRef = useRef<PeerConnection | null>(null);
  const fileTransferRef = useRef<{
    chunks: ArrayBuffer[];
    fileName: string;
    fileSize: number;
    receivedSize: number;
  } | null>(null);
  const pendingFilesRef = useRef<{ name: string; size: number; id: string; file: File }[]>([]);

  const createPeerConnection = useCallback(() => {
    const peer = new RTCPeerConnection({
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' }
      ]
    });

    peer.oniceconnectionstatechange = () => {
      console.log('ICE Connection State:', peer.iceConnectionState);
      setConnectionStatus(peer.iceConnectionState);
      const isConnected = peer.iceConnectionState === 'connected' || peer.iceConnectionState === 'completed';
      onConnectionChange(isConnected);
      
      if (isConnected && pendingFilesRef.current.length > 0) {
        // Send file list when connection is established
        const fileList = pendingFilesRef.current.map(f => ({ name: f.name, size: f.size, id: f.id }));
        onIncomingFiles(fileList);
      }
    };

    return peer;
  }, [onConnectionChange, onIncomingFiles]);

  const setupDataChannel = useCallback((channel: RTCDataChannel) => {
    channel.binaryType = 'arraybuffer';
    
    channel.onopen = () => {
      console.log('Data channel opened');
      setConnectionStatus('Connected');
      
      // Send file list if we have files ready
      if (pendingFilesRef.current.length > 0) {
        const fileList = pendingFilesRef.current.map(f => ({ name: f.name, size: f.size, id: f.id }));
        channel.send(JSON.stringify({
          type: 'file-list',
          files: fileList
        }));
      }
    };

    channel.onclose = () => {
      console.log('Data channel closed');
      setConnectionStatus('Disconnected');
    };

    channel.onmessage = (event) => {
      if (typeof event.data === 'string') {
        try {
          const message = JSON.parse(event.data);
          
          if (message.type === 'file-list') {
            onIncomingFiles(message.files);
          } else if (message.type === 'file-request') {
            // Send requested files
            const requestedFiles = pendingFilesRef.current.filter(f => 
              message.fileIds.includes(f.id)
            );
            requestedFiles.forEach(fileData => {
              sendSingleFile(fileData.file, fileData.id);
            });
          } else if (message.type === 'file-start') {
            console.log('Starting file transfer:', message.fileName);
            fileTransferRef.current = {
              chunks: [],
              fileName: message.fileName,
              fileSize: message.fileSize,
              receivedSize: 0
            };
          } else if (message.type === 'file-end') {
            console.log('File transfer completed');
            if (fileTransferRef.current) {
              const blob = new Blob(fileTransferRef.current.chunks);
              const file = new File([blob], fileTransferRef.current.fileName);
              
              // Auto-download the file
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = fileTransferRef.current.fileName;
              a.click();
              URL.revokeObjectURL(url);
              
              onFileReceived([file]);
              fileTransferRef.current = null;
            }
          }
        } catch (error) {
          console.error('Error parsing message:', error);
        }
      } else if (event.data instanceof ArrayBuffer) {
        // File chunk received
        if (fileTransferRef.current) {
          fileTransferRef.current.chunks.push(event.data);
          fileTransferRef.current.receivedSize += event.data.byteLength;
          
          const progress = (fileTransferRef.current.receivedSize / fileTransferRef.current.fileSize) * 100;
          onProgress(Math.round(progress));
        }
      }
    };

    return channel;
  }, [onFileReceived, onProgress, onIncomingFiles]);

  const sendSingleFile = useCallback(async (file: File, fileId: string) => {
    if (!connectionRef.current?.dataChannel || connectionRef.current.dataChannel.readyState !== 'open') {
      throw new Error('No active connection');
    }

    const channel = connectionRef.current.dataChannel;
    const chunkSize = 16384; // 16KB chunks
    
    // Send file metadata
    channel.send(JSON.stringify({
      type: 'file-start',
      fileName: file.name,
      fileSize: file.size,
      fileId: fileId
    }));

    // Send file in chunks
    const reader = new FileReader();
    let offset = 0;

    const sendChunk = () => {
      const slice = file.slice(offset, offset + chunkSize);
      reader.onload = (event) => {
        if (event.target?.result && channel.readyState === 'open') {
          channel.send(event.target.result as ArrayBuffer);
          offset += chunkSize;
          
          const progress = Math.min((offset / file.size) * 100, 100);
          onProgress(Math.round(progress));
          
          if (offset < file.size) {
            setTimeout(sendChunk, 10);
          } else {
            // Send completion message
            channel.send(JSON.stringify({ type: 'file-end', fileId: fileId }));
          }
        }
      };
      reader.readAsArrayBuffer(slice);
    };

    sendChunk();
  }, [onProgress]);

  const connect = useCallback(async (remotePeerId: string) => {
    setIsConnecting(true);
    
    try {
      const peer = createPeerConnection();
      const dataChannel = peer.createDataChannel('fileTransfer');
      setupDataChannel(dataChannel);
      
      connectionRef.current = {
        peer,
        dataChannel,
        isInitiator: true
      };

      // Simulate WebRTC connection for demo purposes
      // In production, you would use a signaling server
      setTimeout(() => {
        setIsConnecting(false);
        setConnectionStatus('Connected');
        onConnectionChange(true);
        
        // If we have files ready, send the list
        if (pendingFilesRef.current.length > 0) {
          const fileList = pendingFilesRef.current.map(f => ({ name: f.name, size: f.size, id: f.id }));
          dataChannel.send(JSON.stringify({
            type: 'file-list',
            files: fileList
          }));
        }
      }, 2000);
      
    } catch (error) {
      console.error('Connection failed:', error);
      setIsConnecting(false);
      throw error;
    }
  }, [createPeerConnection, setupDataChannel, onConnectionChange]);

  const setFilesForSharing = useCallback((files: File[]) => {
    setSelectedFiles(files);
    pendingFilesRef.current = files.map(file => ({
      name: file.name,
      size: file.size,
      id: Math.random().toString(36).substr(2, 9),
      file
    }));
  }, []);

  const requestFiles = useCallback((fileIds: string[]) => {
    if (!connectionRef.current?.dataChannel || connectionRef.current.dataChannel.readyState !== 'open') {
      throw new Error('No active connection');
    }

    connectionRef.current.dataChannel.send(JSON.stringify({
      type: 'file-request',
      fileIds: fileIds
    }));
  }, []);

  const generateShareLink = useCallback(() => {
    const baseUrl = window.location.origin;
    return `${baseUrl}?peer=${localPeerId}`;
  }, [localPeerId]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (connectionRef.current?.peer) {
        connectionRef.current.peer.close();
      }
    };
  }, []);

  return {
    localPeerId,
    connect,
    setFilesForSharing,
    requestFiles,
    generateShareLink,
    isConnecting,
    connectionStatus,
    selectedFiles
  };
};
