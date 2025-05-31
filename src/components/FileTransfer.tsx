
import React, { useState, useCallback } from 'react';
import { Upload, Download, Share2, Copy, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/components/ui/use-toast';
import { usePeerConnection } from '@/hooks/usePeerConnection';

export const FileTransfer = () => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [transferProgress, setTransferProgress] = useState(0);
  const [peerId, setPeerId] = useState('');
  const [isConnected, setIsConnected] = useState(false);
  const [copiedToClipboard, setCopiedToClipboard] = useState(false);
  const { toast } = useToast();
  
  const { 
    localPeerId, 
    connect, 
    sendFile, 
    isConnecting,
    connectionStatus 
  } = usePeerConnection({
    onFileReceived: (file: File) => {
      toast({
        title: "File received!",
        description: `${file.name} has been downloaded successfully.`,
      });
    },
    onProgress: (progress: number) => {
      setTransferProgress(progress);
    },
    onConnectionChange: (connected: boolean) => {
      setIsConnected(connected);
    }
  });

  const handleFileSelect = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      toast({
        title: "File selected",
        description: `${file.name} ready to transfer`,
      });
    }
  }, [toast]);

  const handleConnect = useCallback(async () => {
    if (peerId.trim()) {
      try {
        await connect(peerId.trim());
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

  const handleSendFile = useCallback(async () => {
    if (selectedFile && isConnected) {
      try {
        await sendFile(selectedFile);
        toast({
          title: "File sent!",
          description: `${selectedFile.name} has been sent successfully.`,
        });
        setSelectedFile(null);
        setTransferProgress(0);
      } catch (error) {
        toast({
          title: "Transfer failed",
          description: "Could not send the file",
          variant: "destructive",
        });
      }
    }
  }, [selectedFile, isConnected, sendFile, toast]);

  const copyPeerIdToClipboard = useCallback(async () => {
    if (localPeerId) {
      try {
        await navigator.clipboard.writeText(localPeerId);
        setCopiedToClipboard(true);
        toast({
          title: "Copied!",
          description: "Your peer ID has been copied to clipboard",
        });
        setTimeout(() => setCopiedToClipboard(false), 2000);
      } catch (error) {
        toast({
          title: "Copy failed",
          description: "Could not copy peer ID to clipboard",
          variant: "destructive",
        });
      }
    }
  }, [localPeerId, toast]);

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
                Share this ID with others to receive files
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-gray-100 p-3 rounded-lg font-mono text-sm break-all">
                {localPeerId || 'Generating...'}
              </div>
              <Button 
                onClick={copyPeerIdToClipboard}
                disabled={!localPeerId}
                className="w-full"
                variant="outline"
              >
                {copiedToClipboard ? (
                  <>
                    <Check className="h-4 w-4 mr-2" />
                    Copied!
                  </>
                ) : (
                  <>
                    <Copy className="h-4 w-4 mr-2" />
                    Copy Peer ID
                  </>
                )}
              </Button>
            </CardContent>
          </Card>

          {/* Connect to Peer Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Download className="h-5 w-5" />
                Connect to Peer
              </CardTitle>
              <CardDescription>
                Enter a peer ID to connect and transfer files
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
              {connectionStatus && (
                <p className="text-sm text-gray-600 text-center">
                  Status: {connectionStatus}
                </p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* File Transfer Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Upload className="h-5 w-5" />
              File Transfer
            </CardTitle>
            <CardDescription>
              Select a file to send to your connected peer
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
              <input
                type="file"
                onChange={handleFileSelect}
                className="hidden"
                id="file-input"
                disabled={!isConnected}
              />
              <label 
                htmlFor="file-input" 
                className={`cursor-pointer ${!isConnected ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                <Upload className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                <p className="text-lg font-medium text-gray-900">
                  {selectedFile ? selectedFile.name : 'Choose a file to upload'}
                </p>
                <p className="text-sm text-gray-500">
                  {isConnected ? 'Click to select a file' : 'Connect to a peer first'}
                </p>
              </label>
            </div>

            {selectedFile && (
              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="flex justify-between items-center mb-2">
                  <span className="font-medium">{selectedFile.name}</span>
                  <span className="text-sm text-gray-500">
                    {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                  </span>
                </div>
                {transferProgress > 0 && (
                  <Progress value={transferProgress} className="mb-2" />
                )}
                <Button 
                  onClick={handleSendFile}
                  disabled={!isConnected || transferProgress > 0}
                  className="w-full"
                >
                  {transferProgress > 0 ? `Sending... ${transferProgress}%` : 'Send File'}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
