
import { useState, useCallback, useRef, useEffect } from 'react';
import { PeerConnection } from '@/types/peer';

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
    if (connectionRef.current?.peer) {
      connectionRef.current.peer.close();
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
      if (connectionRef.current?.peer) {
        connectionRef.current.peer.close();
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

    // Enhanced ICE connection state monitoring for silent disconnections
    peer.oniceconnectionstatechange = () => {
      const state = peer.iceConnectionState;
      console.log('ICE Connection State:', state);
      
      if (state === 'connected' || state === 'completed') {
        setConnectionStatus('Connected');
        setIsConnecting(false);
        setIsWaitingForConnection(false);
        onConnectionChange(true);
      } else if (state === 'disconnected') {
        console.log('ICE connection disconnected - network issue detected');
        setConnectionStatus('Peer connection lost');
        handleDisconnection();
      } else if (state === 'failed') {
        console.log('ICE connection failed - connection cannot be established');
        setConnectionStatus('Connection failed');
        handleDisconnection();
      } else if (state === 'closed') {
        console.log('ICE connection closed - peer disconnected');
        setConnectionStatus('Peer disconnected');
        handleDisconnection();
      } else if (state === 'checking') {
        setConnectionStatus('Connecting...');
      }
    };

    // Monitor connection state changes for additional robustness
    peer.onconnectionstatechange = () => {
      const state = peer.connectionState;
      console.log('Peer Connection State:', state);
      
      if (state === 'failed' || state === 'closed' || state === 'disconnected') {
        console.log('Peer connection state indicates disconnection:', state);
        handleDisconnection();
      }
    };

    return peer;
  }, [onConnectionChange, handleDisconnection]);

  const setupDataChannel = useCallback((channel: RTCDataChannel) => {
    channel.binaryType = 'arraybuffer';
    
    channel.onopen = () => {
      console.log('Data channel opened');
      setConnectionStatus('Connected');
      setIsConnecting(false);
      setIsWaitingForConnection(false);
      onConnectionChange(true);
      onDataChannelOpen(channel);
    };

    // Enhanced data channel close handler for silent disconnections
    channel.onclose = () => {
      console.log('Data channel closed by peer');
      setConnectionStatus('Sender closed the data channel');
      handleDisconnection();
    };

    // Handle data channel errors
    channel.onerror = (error) => {
      console.error('Data channel error:', error);
      setConnectionStatus('Data channel error');
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
      
      // Create data channel as the initiator
      const dataChannel = peer.createDataChannel('fileTransfer', {
        ordered: true
      });
      
      setupDataChannel(dataChannel);
      
      connectionRef.current = {
        peer,
        dataChannel,
        isInitiator: true
      };

      // TODO: Replace with real signaling server
      // For now, simulate connection establishment
      setTimeout(() => {
        console.log('Simulating connection established for sender');
        // Simulate successful ICE connection
        Object.defineProperty(peer, 'iceConnectionState', {
          value: 'connected',
          writable: true
        });
        peer.dispatchEvent(new Event('iceconnectionstatechange'));
        
        // Open the data channel
        setTimeout(() => {
          console.log('Simulating data channel open for sender');
          const openEvent = new Event('open');
          dataChannel.dispatchEvent(openEvent);
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
      
      // Listen for incoming data channel
      peer.ondatachannel = (event) => {
        console.log('Received data channel from sender');
        const channel = event.channel;
        setupDataChannel(channel);
        
        connectionRef.current = {
          peer,
          dataChannel: channel,
          isInitiator: false
        };
      };

      // TODO: Replace with real signaling server
      // For now, simulate connection establishment
      setTimeout(() => {
        console.log('Simulating connection established for receiver');
        // Simulate successful ICE connection
        Object.defineProperty(peer, 'iceConnectionState', {
          value: 'connected',
          writable: true
        });
        peer.dispatchEvent(new Event('iceconnectionstatechange'));
        
        // Simulate receiving data channel
        setTimeout(() => {
          console.log('Simulating data channel received for receiver');
          const mockChannel = {
            binaryType: 'arraybuffer',
            readyState: 'open',
            send: () => {},
            close: () => {},
            addEventListener: () => {},
            removeEventListener: () => {},
            dispatchEvent: () => true
          } as RTCDataChannel;
          
          const event = new Event('datachannel') as any;
          event.channel = mockChannel;
          peer.dispatchEvent(event);
          
          // Open the data channel
          setTimeout(() => {
            console.log('Simulating data channel open for receiver');
            const openEvent = new Event('open');
            mockChannel.dispatchEvent(openEvent);
          }, 100);
        }, 200);
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
