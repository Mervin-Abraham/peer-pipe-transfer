
import { useState, useCallback, useRef, useEffect } from 'react';
import { PeerConnection } from '@/types/peer';
import { MockDataChannel } from '@/utils/mockDataChannel';

interface UseConnectionManagerProps {
  onConnectionChange: (connected: boolean) => void;
  onDataChannelOpen: (channel: any) => void;
  onMessage: (data: any, channel: any) => void;
  onFileChunk: (data: ArrayBuffer) => void;
}

export const useConnectionManager = ({ 
  onConnectionChange, 
  onDataChannelOpen,
  onMessage,
  onFileChunk
}: UseConnectionManagerProps) => {
  const [connectionStatus, setConnectionStatus] = useState('Disconnected');
  const [isConnecting, setIsConnecting] = useState(false);
  const [isWaitingForConnection, setIsWaitingForConnection] = useState(false);
  const connectionRef = useRef<PeerConnection | null>(null);

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
    };

    return peer;
  }, [onConnectionChange]);

  const setupDataChannel = useCallback((channel: MockDataChannel) => {
    channel.binaryType = 'arraybuffer';
    
    channel.onopen = () => {
      console.log('Data channel opened');
      setConnectionStatus('Connected');
      setIsConnecting(false);
      setIsWaitingForConnection(false);
      onDataChannelOpen(channel);
    };

    channel.onclose = () => {
      console.log('Data channel closed');
      setConnectionStatus('Disconnected');
      setIsConnecting(false);
      setIsWaitingForConnection(false);
    };

    channel.onmessage = (event) => {
      if (typeof event.data === 'string') {
        try {
          const message = JSON.parse(event.data);
          onMessage(message, channel);
        } catch (error) {
          console.error('Error parsing message:', error);
        }
      } else if (event.data instanceof ArrayBuffer) {
        onFileChunk(event.data);
      }
    };

    return channel;
  }, [onDataChannelOpen, onMessage, onFileChunk]);

  const waitForConnection = useCallback(async () => {
    console.log('Sender waiting for incoming connections...');
    setIsWaitingForConnection(true);
    setConnectionStatus('Waiting for connection');
    
    try {
      const peer = createPeerConnection();
      const mockChannel = new MockDataChannel();
      setupDataChannel(mockChannel);
      
      connectionRef.current = {
        peer,
        dataChannel: mockChannel as any,
        isInitiator: false
      };

      // Simulate connection establishment
      setTimeout(() => {
        console.log('Simulating connection established for sender');
        peer.dispatchEvent(new Event('iceconnectionstatechange'));
        
        // Open the data channel
        setTimeout(() => {
          console.log('Opening sender data channel');
          mockChannel.simulateOpen();
        }, 500);
      }, 1000);
      
    } catch (error) {
      console.error('Failed to wait for connection:', error);
      setIsWaitingForConnection(false);
      throw error;
    }
  }, [createPeerConnection, setupDataChannel]);

  const connect = useCallback(async (remotePeerId: string) => {
    console.log('Receiver connecting to sender:', remotePeerId);
    setIsConnecting(true);
    
    try {
      const peer = createPeerConnection();
      const mockChannel = new MockDataChannel();
      setupDataChannel(mockChannel);
      
      connectionRef.current = {
        peer,
        dataChannel: mockChannel as any,
        isInitiator: true
      };

      // Simulate WebRTC connection for demo purposes
      setTimeout(() => {
        console.log('Simulating connection established for receiver');
        setConnectionStatus('Connected');
        onConnectionChange(true);
        
        // Open the data channel
        setTimeout(() => {
          console.log('Opening receiver data channel');
          mockChannel.simulateOpen();
        }, 500);
      }, 1500);
      
    } catch (error) {
      console.error('Connection failed:', error);
      setIsConnecting(false);
      throw error;
    }
  }, [createPeerConnection, setupDataChannel, onConnectionChange]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (connectionRef.current?.peer) {
        connectionRef.current.peer.close();
      }
    };
  }, []);

  return {
    connectionStatus: isWaitingForConnection ? 'Waiting for connection' : connectionStatus,
    isConnecting,
    isWaitingForConnection,
    connectionRef,
    waitForConnection,
    connect
  };
};
