import React, { useState, useCallback, useEffect } from 'react';
import { Share2 } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import { usePeerConnection } from '@/hooks/usePeerConnection.jsx';
import { FileSelector } from '@/components/FileSelector';
import { FileReceiver } from '@/components/FileReceiver.jsx';

export const FileTransfer = ({ connectToPeerId }) => {
  const [transferProgress, setTransferProgress] = useState(0);
  const [peerId, setPeerId] = useState('');
  const [isConnected, setIsConnected] = useState(false);
  const [availableFiles, setAvailableFiles] = useState([]);
  const [mode, setMode] = useState('initial');
  const [wasDisconnected, setWasDisconnected] = useState(false);
  const { toast } = useToast();
  
  const { 
    localPeerId, 
    connect, 
    setFilesForSharing,
    requestFiles,
    generateShareLink,
    isConnecting,
    connectionStatus 
  } = usePeerConnection({
    onFileReceived: (files) => {
      toast({
        title: "Files received!",
        description: `${files.length} file(s) downloaded successfully.`,
      });
      setTransferProgress(0);
    },
    onProgress: (progress) => {
      setTransferProgress(progress);
    },
    onConnectionChange: (connected) => {
      const wasConnected = isConnected;
      setIsConnected(connected);
      
      if (wasConnected && !connected) {
        // Connection was lost
        setWasDisconnected(true);
        setAvailableFiles([]);
        setTransferProgress(0);
        
        toast({
          title: "Connection lost",
          description: "The sender has disconnected",
          variant: "destructive",
        });
        
        // Reset to initial mode if we were a receiver
        if (mode === 'receiver') {
          setTimeout(() => {
            setMode('initial');
            setWasDisconnected(false);
          }, 3000);
        }
      }
    },
    onIncomingFiles: (fileList) => {
      console.log('FileTransfer: Received incoming files:', fileList);
      setAvailableFiles(fileList);
      // Only set mode to receiver if we're not already a sender and not in initial mode from URL
      if (mode === 'initial' && !connectToPeerId) {
        setMode('receiver');
      }
      setWasDisconnected(false);
    }
  });

  // Auto-connect if peer ID is provided in URL (receiver mode)
  useEffect(() => {
    if (connectToPeerId && mode === 'initial') {
      console.log('Auto-connecting to peer:', connectToPeerId);
      setPeerId(connectToPeerId);
      setMode('receiver');
      connect(connectToPeerId).catch((error) => {
        console.error('Auto-connection failed:', error);
        toast({
          title: "Auto-connection failed",
          description: "Could not connect to the specified peer",
          variant: "destructive",
        });
      });
    }
  }, [connectToPeerId, mode, connect, toast]);

  const handleConnect = useCallback(async () => {
    if (peerId.trim()) {
      try {
        setMode('receiver');
        setWasDisconnected(false);
        await connect(peerId.trim());
        toast({
          title: "Connecting...",
          description: `Connecting to peer ${peerId}`,
        });
      } catch (error) {
        console.error('Connection failed:', error);
        toast({
          title: "Connection failed",
          description: "Could not connect to the specified peer ID",
          variant: "destructive",
        });
        setMode('initial');
      }
    }
  }, [peerId, connect, toast]);

  const handleFilesSelected = useCallback((files) => {
    console.log('Files selected for sharing:', files.length);
    setFilesForSharing(files);
    // Set mode to sender when files are selected (regardless of current mode, unless we're a receiver from URL)
    if (!connectToPeerId) {
      setMode('sender');
    }
  }, [setFilesForSharing, connectToPeerId]);

  const handleDownloadSelected = useCallback((fileIds) => {
    try {
      requestFiles(fileIds);
    } catch (error) {
      toast({
        title: "Download failed",
        description: "Could not request files",
        variant: "destructive",
      });
    }
  }, [requestFiles, toast]);

  // Show connection status
  useEffect(() => {
    if (isConnected && mode === 'receiver') {
      toast({
        title: "Connected!",
        description: "Successfully connected to sender",
      });
    }
  }, [isConnected, mode, toast]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Peer Pipe Transfer</h1>
          <p className="text-lg text-gray-600">Secure peer-to-peer file sharing</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Your Peer ID Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Share2 className="h-5 w-5" />
                Your Peer ID
              </CardTitle>
              <CardDescription>
                Your unique identifier for this session
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-gray-100 p-3 rounded-lg font-mono text-sm break-all">
                {localPeerId || 'Generating...'}
              </div>
              <div className="text-sm text-gray-600">
                Connection Status: <span className={`font-medium ${
                  connectionStatus === 'Connected' ? 'text-green-600' :
                  connectionStatus === 'Disconnected' && wasDisconnected ? 'text-red-600' :
                  'text-gray-600'
                }`}>{connectionStatus}</span>
              </div>
              {mode === 'sender' && (
                <div className="text-sm text-blue-600">
                  Mode: Waiting for receiver to connect
                </div>
              )}
              {mode === 'receiver' && !wasDisconnected && (
                <div className="text-sm text-green-600">
                  Mode: Connected as receiver
                </div>
              )}
              {wasDisconnected && (
                <div className="text-sm text-red-600">
                  Sender disconnected. Returning to main screen...
                </div>
              )}
            </CardContent>
          </Card>

          {/* Connect to Peer Card */}
          {!connectToPeerId && mode !== 'sender' && !wasDisconnected && (
            <Card>
              <CardHeader>
                <CardTitle>Connect to Peer</CardTitle>
                <CardDescription>
                  Enter a peer ID to connect and receive files
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Input
                  placeholder="Enter peer ID"
                  value={peerId}
                  onChange={(e) => setPeerId(e.target.value)}
                  disabled={isConnecting || isConnected}
                />
                <Button 
                  onClick={handleConnect}
                  disabled={!peerId.trim() || isConnecting || isConnected}
                  className="w-full"
                >
                  {isConnecting ? 'Connecting...' : isConnected ? 'Connected' : 'Connect'}
                </Button>
              </CardContent>
            </Card>
          )}

          {connectToPeerId && !wasDisconnected && (
            <Card>
              <CardHeader>
                <CardTitle>Auto-Connecting</CardTitle>
                <CardDescription>
                  Connecting to peer: {connectToPeerId}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-4">
                  {isConnecting ? (
                    <p className="text-blue-600">Connecting...</p>
                  ) : isConnected ? (
                    <p className="text-green-600">Connected!</p>
                  ) : (
                    <p className="text-red-600">Connection failed</p>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {mode === 'sender' && (
            <Card>
              <CardHeader>
                <CardTitle>Sender Mode</CardTitle>
                <CardDescription>
                  Waiting for receiver to connect
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-4">
                  <p className="text-blue-600">Share your link and wait for connection...</p>
                </div>
              </CardContent>
            </Card>
          )}

          {wasDisconnected && (
            <Card>
              <CardHeader>
                <CardTitle>Connection Lost</CardTitle>
                <CardDescription>
                  The sender has disconnected
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-4">
                  <p className="text-red-600">Connection was lost. Files are no longer available.</p>
                  <p className="text-sm text-gray-500 mt-2">Returning to main screen automatically...</p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Progress Bar */}
        {transferProgress > 0 && (
          <Card>
            <CardContent className="pt-6">
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Transfer Progress</span>
                  <span>{transferProgress}%</span>
                </div>
                <Progress value={transferProgress} />
              </div>
            </CardContent>
          </Card>
        )}

        {/* File Operations */}
        {(mode === 'sender' || mode === 'initial') && !wasDisconnected && (
          <FileSelector 
            onFilesSelected={handleFilesSelected}
            onGenerateLink={generateShareLink}
          />
        )}

        {mode === 'receiver' && !wasDisconnected && (
          <FileReceiver 
            availableFiles={availableFiles}
            onDownloadSelected={handleDownloadSelected}
            isConnected={isConnected}
          />
        )}
      </div>
    </div>
  );
};
