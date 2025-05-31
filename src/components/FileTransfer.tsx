
import React, { useState, useCallback, useEffect } from 'react';
import { Share2 } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/components/ui/use-toast';
import { usePeerConnection } from '@/hooks/usePeerConnection';
import { FileSelector } from '@/components/FileSelector';
import { FileReceiver } from '@/components/FileReceiver';

interface FileTransferProps {
  connectToPeerId?: string | null;
}

interface FileInfo {
  name: string;
  size: number;
  id: string;
}

export const FileTransfer = ({ connectToPeerId }: FileTransferProps) => {
  const [transferProgress, setTransferProgress] = useState(0);
  const [peerId, setPeerId] = useState('');
  const [isConnected, setIsConnected] = useState(false);
  const [availableFiles, setAvailableFiles] = useState<FileInfo[]>([]);
  const [mode, setMode] = useState<'sender' | 'receiver'>('sender');
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
    onFileReceived: (files: File[]) => {
      toast({
        title: "Files received!",
        description: `${files.length} file(s) downloaded successfully.`,
      });
      setTransferProgress(0);
    },
    onProgress: (progress: number) => {
      setTransferProgress(progress);
    },
    onConnectionChange: (connected: boolean) => {
      setIsConnected(connected);
    },
    onIncomingFiles: (fileList: FileInfo[]) => {
      setAvailableFiles(fileList);
      setMode('receiver');
    }
  });

  // Auto-connect if peer ID is provided in URL
  useEffect(() => {
    if (connectToPeerId && !isConnected && !isConnecting) {
      setPeerId(connectToPeerId);
      setMode('receiver');
      connect(connectToPeerId).catch((error) => {
        toast({
          title: "Auto-connection failed",
          description: "Could not connect to the specified peer",
          variant: "destructive",
        });
      });
    }
  }, [connectToPeerId, isConnected, isConnecting, connect, toast]);

  const handleConnect = useCallback(async () => {
    if (peerId.trim()) {
      try {
        await connect(peerId.trim());
        setMode('receiver');
        toast({
          title: "Connected!",
          description: `Connected to peer ${peerId}`,
        });
      } catch (error) {
        toast({
          title: "Connection failed",
          description: "Could not connect to the specified peer ID",
          variant: "destructive",
        });
      }
    }
  }, [peerId, connect, toast]);

  const handleFilesSelected = useCallback((files: File[]) => {
    setFilesForSharing(files);
    setMode('sender');
  }, [setFilesForSharing]);

  const handleDownloadSelected = useCallback((fileIds: string[]) => {
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
                Connection Status: <span className="font-medium">{connectionStatus}</span>
              </div>
            </CardContent>
          </Card>

          {/* Connect to Peer Card */}
          {!connectToPeerId && (
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

          {connectToPeerId && (
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
        {mode === 'sender' && (
          <FileSelector 
            onFilesSelected={handleFilesSelected}
            onGenerateLink={generateShareLink}
          />
        )}

        {mode === 'receiver' && (
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
