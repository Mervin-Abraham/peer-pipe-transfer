
import React, { useState, useCallback, useEffect } from 'react';
import { Share2, Wifi, WifiOff } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { useSimplePeerConnection } from '@/hooks/useSimplePeerConnection.jsx';
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
  } = useSimplePeerConnection({
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
        setWasDisconnected(true);
        setAvailableFiles([]);
        setTransferProgress(0);
        
        toast({
          title: "Connection lost",
          description: "The sender has disconnected",
          variant: "destructive",
        });
        
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

  useEffect(() => {
    if (isConnected && mode === 'receiver') {
      toast({
        title: "Connected!",
        description: "Successfully connected to sender",
      });
    }
  }, [isConnected, mode, toast]);

  const getConnectionBadge = () => {
    switch (connectionStatus) {
      case 'Connected':
        return <Badge variant="default" className="bg-green-500 hover:bg-green-600"><Wifi className="w-3 h-3 mr-1" />Connected</Badge>;
      case 'Connecting':
        return <Badge variant="secondary"><Wifi className="w-3 h-3 mr-1" />Connecting...</Badge>;
      case 'Waiting for connection':
        return <Badge variant="outline"><Wifi className="w-3 h-3 mr-1" />Waiting</Badge>;
      default:
        return <Badge variant="destructive"><WifiOff className="w-3 h-3 mr-1" />Offline</Badge>;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 p-4">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Header */}
        <div className="text-center space-y-4">
          <div className="flex items-center justify-center space-x-2">
            <Share2 className="h-8 w-8 text-blue-600" />
            <h1 className="text-5xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              Peer Pipe Transfer
            </h1>
          </div>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Secure peer-to-peer file sharing with no servers, no limits, just direct connections
          </p>
          <div className="flex justify-center">
            {getConnectionBadge()}
          </div>
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Your Peer ID Card */}
          <Card className="shadow-lg border-0 bg-white/70 backdrop-blur-sm">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-2 text-gray-800">
                <Share2 className="h-5 w-5 text-blue-600" />
                Your Peer ID
              </CardTitle>
              <CardDescription className="text-gray-600">
                Your unique identifier for this session
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-4 rounded-lg border border-blue-200">
                <code className="text-lg font-mono font-bold text-blue-800 break-all">
                  {localPeerId || 'Generating...'}
                </code>
              </div>
              
              <div className="flex flex-wrap gap-2">
                {mode === 'sender' && (
                  <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                    📤 Sender Mode
                  </Badge>
                )}
                {mode === 'receiver' && !wasDisconnected && (
                  <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                    📥 Receiver Mode
                  </Badge>
                )}
                {wasDisconnected && (
                  <Badge variant="destructive">
                    ⚠️ Disconnected
                  </Badge>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Connect to Peer Card */}
          {!connectToPeerId && mode !== 'sender' && !wasDisconnected && (
            <Card className="shadow-lg border-0 bg-white/70 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="text-gray-800">Connect to Peer</CardTitle>
                <CardDescription className="text-gray-600">
                  Enter a peer ID to connect and receive files
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Input
                  placeholder="Enter peer ID (e.g., abc123def)"
                  value={peerId}
                  onChange={(e) => setPeerId(e.target.value)}
                  disabled={isConnecting || isConnected}
                  className="bg-white/80 border-gray-200 focus:border-blue-500"
                />
                <Button 
                  onClick={handleConnect}
                  disabled={!peerId.trim() || isConnecting || isConnected}
                  className="w-full bg-blue-600 hover:bg-blue-700"
                  size="lg"
                >
                  {isConnecting ? (
                    <>
                      <Wifi className="w-4 h-4 mr-2 animate-pulse" />
                      Connecting...
                    </>
                  ) : isConnected ? (
                    <>
                      <Wifi className="w-4 h-4 mr-2" />
                      Connected
                    </>
                  ) : (
                    <>
                      <Wifi className="w-4 h-4 mr-2" />
                      Connect
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Auto-Connect Card */}
          {connectToPeerId && !wasDisconnected && (
            <Card className="shadow-lg border-0 bg-white/70 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="text-gray-800">Auto-Connecting</CardTitle>
                <CardDescription className="text-gray-600">
                  Connecting to peer: <code className="bg-gray-100 px-2 py-1 rounded">{connectToPeerId}</code>
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-6">
                  {isConnecting ? (
                    <div className="space-y-2">
                      <Wifi className="w-8 h-8 mx-auto text-blue-600 animate-pulse" />
                      <p className="text-blue-600 font-medium">Connecting...</p>
                    </div>
                  ) : isConnected ? (
                    <div className="space-y-2">
                      <Wifi className="w-8 h-8 mx-auto text-green-600" />
                      <p className="text-green-600 font-medium">Connected!</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <WifiOff className="w-8 h-8 mx-auto text-red-600" />
                      <p className="text-red-600 font-medium">Connection failed</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Sender Mode Card */}
          {mode === 'sender' && (
            <Card className="shadow-lg border-0 bg-white/70 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="text-gray-800">Sender Mode Active</CardTitle>
                <CardDescription className="text-gray-600">
                  Share your link and wait for receivers to connect
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-6 space-y-4">
                  <div className="w-16 h-16 mx-auto bg-blue-100 rounded-full flex items-center justify-center">
                    <Share2 className="w-8 h-8 text-blue-600" />
                  </div>
                  <p className="text-blue-600 font-medium">Ready to share files!</p>
                  <p className="text-sm text-gray-500">Copy your share link below and send it to recipients</p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Progress Bar */}
        {transferProgress > 0 && (
          <Card className="shadow-lg border-0 bg-white/70 backdrop-blur-sm">
            <CardContent className="pt-6">
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-gray-700">Transfer Progress</span>
                  <span className="text-sm font-bold text-blue-600">{transferProgress}%</span>
                </div>
                <Progress value={transferProgress} className="h-3" />
              </div>
            </CardContent>
          </Card>
        )}

        {/* File Operations */}
        <div className="space-y-6">
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

        {/* Connection Lost Message */}
        {wasDisconnected && (
          <Card className="shadow-lg border-0 bg-red-50/70 backdrop-blur-sm border-red-200">
            <CardContent className="pt-6">
              <div className="text-center py-6 space-y-4">
                <WifiOff className="w-16 h-16 mx-auto text-red-500" />
                <div>
                  <h3 className="text-lg font-semibold text-red-800">Connection Lost</h3>
                  <p className="text-red-600">The sender has disconnected. Files are no longer available.</p>
                  <p className="text-sm text-red-500 mt-2">Returning to main screen automatically...</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};
