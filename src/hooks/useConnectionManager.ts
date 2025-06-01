
import { useState, useCallback, useRef, useEffect } from 'react';
import { PeerConnection } from '@/types/peer';
import { MockDataChannel } from '@/utils/mockDataChannel';

interface UseConnectionManagerProps {
  onConnectionChange: (connected: boolean) => void;
  onDataChannelOpen: (channel: any) => void;
  onMessage: (data: any, channel: any) => void;
  onFileChunk: (data: ArrayBuffer) => void;
  onPeerDisconnected?: () => void;
}

export const useConnectionManager = ({ 
  onConnectionChange, 
  onDataChannelOpen,
  onMessage,
  onFileChunk,
  onPeerDisconnected
}: UseConnectionManagerProps) => {
  const [connectionStatus, setConnectionStatus] = useState('Disconnected');
  const [isConnecting, setIsConnecting] = useState(false);
  const [isWaitingForConnection, setIsWaitingForConnection] = useState(false);
  const connectionRef = useRef<PeerConnection | null>(null);

  // Cleanup function to handle disconnection
  const handleDisconnection = useCallback(() => {
    console.log('Handling disconnection...');
    setConnectionStatus('Disconnected');
    setIsConnecting(false);
    setIsWaitingForConnection(false);
    onConnectionChange(false);
    
    if (connectionRef.current?.dataChannel) {
      connectionRef.current.dataChannel.close();
    }
    connectionRef.current = null;
    
    if (onPeerDisconnected) {
      onPeerDisconnected();
    }
  }, [onConnectionChange, onPeerDisconnected]);

  // Setup beforeunload event to handle tab close/reload
  useEffect(() => {
    const handleBeforeUnload = () => {
      console.log('Page unloading, sending disconnection signal...');
      if (connectionRef.current?.dataChannel?.readyState === 'open') {
        try {
          connectionRef.current.dataChannel.send(JSON.stringify({
            type: 'peer-disconnected',
            peerId: 'sender'
          }));
        } catch (error) {
          console.log('Failed to send disconnection message:', error);
        }
      }
      
      // Close connection
      if (connectionRef.current?.dataChannel) {
        connectionRef.current.dataChannel.close();
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      // Cleanup on component unmount
      handleBeforeUnload();
    };
  }, []);

  const createPeerConnection = useCallback(() => {
    const peer = new RTCPeerConnection({
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' }
      ]
    });

    peer.oniceconnectionstatechange = () => {
      console.log('ICE Connection State:', peer.iceConnectionState);
      if (peer.iceConnectionState === 'connected' || peer.iceConnectionState === 'completed') {
        setConnectionStatus('Connected');
        setIsConnecting(false);
        setIsWaitingForConnection(false);
        onConnectionChange(true);
      } else if (peer.iceConnectionState === 'disconnected' || peer.iceConnectionState === 'failed' || peer.iceConnectionState === 'closed') {
        console.log('ICE connection lost, handling disconnection');
        handleDisconnection();
      }
    };

    return peer;
  }, [onConnectionChange, handleDisconnection]);

  const setupDataChannel = useCallback((channel: MockDataChannel) => {
    channel.binaryType = 'arraybuffer';
    
    channel.onopen = () => {
      console.log('Data channel opened');
      setConnectionStatus('Connected');
      setIsConnecting(false);
      setIsWaitingForConnection(false);
      onConnectionChange(true);
      onDataChannelOpen(channel);
    };

    channel.onclose = () => {
      console.log('Data channel closed');
      handleDisconnection();
    };

    channel.onmessage = (event) => {
      if (typeof event.data === 'string') {
        try {
          const message = JSON.parse(event.data);
          
          // Handle peer disconnection messages
          if (message.type === 'peer-disconnected') {
            console.log('Received peer disconnection message');
            handleDisconnection();
            return;
          }
          
          onMessage(message, channel);
        } catch (error) {
          console.error('Error parsing message:', error);
        }
      } else if (event.data instanceof ArrayBuffer) {
        onFileChunk(event.data);
      }
    };

    return channel;
  }, [onDataChannelOpen, onMessage, onFileChunk, onConnectionChange, handleDisconnection]);

  const waitForConnection = useCallback(async () => {
    console.log('Sender waiting for incoming connections...');
    setIsWaitingForConnection(true);
    setConnectionStatus('Waiting for connection');
    
    try {
      const peer = createPeerConnection();
      const mockChannel = new MockDataChannel('sender');
      setupDataChannel(mockChannel);
      
      connectionRef.current = {
        peer,
        dataChannel: mockChannel as any,
        isInitiator: false
      };

      // Simulate connection establishment
      setTimeout(() => {
        console.log('Simulating connection established for sender');
        // Update ICE connection state to trigger the event handler
        Object.defineProperty(peer, 'iceConnectionState', {
          value: 'connected',
          writable: true
        });
        peer.dispatchEvent(new Event('iceconnectionstatechange'));
        
        // Open the data channel
        setTimeout(() => {
          console.log('Opening sender data channel');
          mockChannel.simulateOpen();
        }, 100);
      }, 500);
      
    } catch (error) {
      console.error('Failed to wait for connection:', error);
      setIsWaitingForConnection(false);
      throw error;
    }
  }, [createPeerConnection, setupDataChannel]);

  const connect = useCallback(async (remotePeerId: string) => {
    console.log('Receiver connecting to sender:', remotePeerId);
    setIsConnecting(true);
    setConnectionStatus('Connecting');
    
    try {
      const peer = createPeerConnection();
      const mockChannel = new MockDataChannel('receiver');
      setupDataChannel(mockChannel);
      
      connectionRef.current = {
        peer,
        dataChannel: mockChannel as any,
        isInitiator: true
      };

      // Simulate WebRTC connection for demo purposes
      setTimeout(() => {
        console.log('Simulating connection established for receiver');
        // Update ICE connection state to trigger the event handler
        Object.defineProperty(peer, 'iceConnectionState', {
          value: 'connected',
          writable: true
        });
        peer.dispatchEvent(new Event('iceconnectionstatechange'));
        
        // Open the data channel
        setTimeout(() => {
          console.log('Opening receiver data channel');
          mockChannel.simulateOpen();
        }, 100);
      }, 1000);
      
    } catch (error) {
      console.error('Connection failed:', error);
      setIsConnecting(false);
      setConnectionStatus('Disconnected');
      throw error;
    }
  }, [createPeerConnection, setupDataChannel]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (connectionRef.current?.peer) {
        connectionRef.current.peer.close();
      }
    };
  }, []);

  return {
    connectionStatus,
    isConnecting,
    isWaitingForConnection,
    connectionRef,
    waitForConnection,
    connect,
    handleDisconnection
  };
};
