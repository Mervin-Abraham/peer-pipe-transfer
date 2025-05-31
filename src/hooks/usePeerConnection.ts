
import { useState, useEffect, useCallback, useRef } from 'react';

interface UsePeerConnectionProps {
  onFileReceived: (file: File) => void;
  onProgress: (progress: number) => void;
  onConnectionChange: (connected: boolean) => void;
}

interface PeerConnection {
  peer: RTCPeerConnection;
  dataChannel: RTCDataChannel | null;
  isInitiator: boolean;
}

export const usePeerConnection = ({
  onFileReceived,
  onProgress,
  onConnectionChange
}: UsePeerConnectionProps) => {
  const [localPeerId] = useState(() => Math.random().toString(36).substr(2, 9));
  const [isConnecting, setIsConnecting] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState('Disconnected');
  const connectionRef = useRef<PeerConnection | null>(null);
  const fileTransferRef = useRef<{
    chunks: ArrayBuffer[];
    fileName: string;
    fileSize: number;
    receivedSize: number;
  } | null>(null);

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
      onConnectionChange(peer.iceConnectionState === 'connected' || peer.iceConnectionState === 'completed');
    };

    return peer;
  }, [onConnectionChange]);

  const setupDataChannel = useCallback((channel: RTCDataChannel) => {
    channel.binaryType = 'arraybuffer';
    
    channel.onopen = () => {
      console.log('Data channel opened');
      setConnectionStatus('Connected');
    };

    channel.onclose = () => {
      console.log('Data channel closed');
      setConnectionStatus('Disconnected');
    };

    channel.onmessage = (event) => {
      if (typeof event.data === 'string') {
        try {
          const message = JSON.parse(event.data);
          
          if (message.type === 'file-start') {
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
              
              onFileReceived(file);
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
  }, [onFileReceived, onProgress]);

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

      // For demonstration, we'll simulate a successful connection
      // In a real implementation, you would use a signaling server
      setTimeout(() => {
        setIsConnecting(false);
        setConnectionStatus('Connected');
        onConnectionChange(true);
      }, 2000);
      
    } catch (error) {
      console.error('Connection failed:', error);
      setIsConnecting(false);
      throw error;
    }
  }, [createPeerConnection, setupDataChannel, onConnectionChange]);

  const sendFile = useCallback(async (file: File) => {
    if (!connectionRef.current?.dataChannel || connectionRef.current.dataChannel.readyState !== 'open') {
      throw new Error('No active connection');
    }

    const channel = connectionRef.current.dataChannel;
    const chunkSize = 16384; // 16KB chunks
    
    // Send file metadata
    channel.send(JSON.stringify({
      type: 'file-start',
      fileName: file.name,
      fileSize: file.size
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
            setTimeout(sendChunk, 10); // Small delay to prevent overwhelming
          } else {
            // Send completion message
            channel.send(JSON.stringify({ type: 'file-end' }));
            onProgress(100);
          }
        }
      };
      reader.readAsArrayBuffer(slice);
    };

    sendChunk();
  }, [onProgress]);

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
    sendFile,
    isConnecting,
    connectionStatus
  };
};
