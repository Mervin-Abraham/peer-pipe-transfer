
import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Download } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

interface FileInfo {
  name: string;
  size: number;
  id: string;
}

interface FileReceiverProps {
  availableFiles: FileInfo[];
  onDownloadSelected: (fileIds: string[]) => void;
  isConnected: boolean;
}

export const FileReceiver = ({ availableFiles, onDownloadSelected, isConnected }: FileReceiverProps) => {
  const [selectedFileIds, setSelectedFileIds] = useState<string[]>([]);
  const { toast } = useToast();

  const handleFileToggle = (fileId: string, checked: boolean) => {
    if (checked) {
      setSelectedFileIds(prev => [...prev, fileId]);
    } else {
      setSelectedFileIds(prev => prev.filter(id => id !== fileId));
    }
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedFileIds(availableFiles.map(f => f.id));
    } else {
      setSelectedFileIds([]);
    }
  };

  const handleDownload = () => {
    if (selectedFileIds.length === 0) {
      toast({
        title: "No files selected",
        description: "Please select files to download",
        variant: "destructive",
      });
      return;
    }

    onDownloadSelected(selectedFileIds);
    toast({
      title: "Download started",
      description: `Downloading ${selectedFileIds.length} file(s)`,
    });
  };

  if (!isConnected) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Download className="h-5 w-5" />
            Available Files
          </CardTitle>
          <CardDescription>
            Connect to see available files
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-gray-500 text-center">Waiting for connection...</p>
        </CardContent>
      </Card>
    );
  }

  if (availableFiles.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Download className="h-5 w-5" />
            Available Files
          </CardTitle>
          <CardDescription>
            No files available for download
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-gray-500 text-center">No files shared yet</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Download className="h-5 w-5" />
          Available Files ({availableFiles.length})
        </CardTitle>
        <CardDescription>
          Select files to download
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center space-x-2">
          <Checkbox
            id="select-all"
            checked={selectedFileIds.length === availableFiles.length}
            onCheckedChange={handleSelectAll}
          />
          <label htmlFor="select-all" className="text-sm font-medium">
            Select All
          </label>
        </div>

        <div className="space-y-2 max-h-60 overflow-y-auto">
          {availableFiles.map((file) => (
            <div key={file.id} className="flex items-center justify-between p-2 bg-gray-50 rounded">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id={file.id}
                  checked={selectedFileIds.includes(file.id)}
                  onCheckedChange={(checked) => handleFileToggle(file.id, checked as boolean)}
                />
                <label htmlFor={file.id} className="text-sm font-medium cursor-pointer">
                  {file.name}
                </label>
              </div>
              <span className="text-xs text-gray-500">
                {(file.size / 1024 / 1024).toFixed(2)} MB
              </span>
            </div>
          ))}
        </div>

        <Button 
          onClick={handleDownload}
          disabled={selectedFileIds.length === 0}
          className="w-full"
        >
          <Download className="h-4 w-4 mr-2" />
          Download Selected ({selectedFileIds.length})
        </Button>
      </CardContent>
    </Card>
  );
};
