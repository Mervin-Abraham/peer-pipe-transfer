
import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Upload, Share2, Copy, Check, File } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

interface FileSelectorProps {
  onFilesSelected: (files: File[]) => void;
  onGenerateLink: () => string;
}

export const FileSelector = ({ onFilesSelected, onGenerateLink }: FileSelectorProps) => {
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [shareLink, setShareLink] = useState<string>('');
  const [copiedToClipboard, setCopiedToClipboard] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const { toast } = useToast();

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    setSelectedFiles(files);
    onFilesSelected(files);
  };

  const handleDragOver = (event: React.DragEvent) => {
    event.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const handleDrop = (event: React.DragEvent) => {
    event.preventDefault();
    setIsDragOver(false);
    const files = Array.from(event.dataTransfer.files);
    setSelectedFiles(files);
    onFilesSelected(files);
  };

  const handleGenerateLink = () => {
    if (selectedFiles.length === 0) {
      toast({
        title: "No files selected",
        description: "Please select files first",
        variant: "destructive",
      });
      return;
    }

    const link = onGenerateLink();
    setShareLink(link);
    toast({
      title: "Share link generated!",
      description: "Share this link with the person you want to send files to",
    });
  };

  const copyLinkToClipboard = async () => {
    if (shareLink) {
      try {
        await navigator.clipboard.writeText(shareLink);
        setCopiedToClipboard(true);
        toast({
          title: "Copied!",
          description: "Share link has been copied to clipboard",
        });
        setTimeout(() => setCopiedToClipboard(false), 2000);
      } catch (error) {
        toast({
          title: "Copy failed",
          description: "Could not copy link to clipboard",
          variant: "destructive",
        });
      }
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <Card className="shadow-lg border-0 bg-white/70 backdrop-blur-sm">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-gray-800">
          <Upload className="h-5 w-5 text-blue-600" />
          Select Files to Share
        </CardTitle>
        <CardDescription className="text-gray-600">
          Choose files and generate a share link for secure transfer
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div
          className={`border-2 border-dashed rounded-xl p-8 text-center transition-all duration-200 ${isDragOver
              ? 'border-blue-400 bg-blue-50'
              : selectedFiles.length > 0
                ? 'border-green-300 bg-green-50'
                : 'border-gray-300 bg-gray-50 hover:border-gray-400 hover:bg-gray-100'
            }`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          <input
            type="file"
            onChange={handleFileSelect}
            className="hidden"
            id="file-input-selector"
            multiple
          />
          <label htmlFor="file-input-selector" className="cursor-pointer">
            <Upload className={`h-16 w-16 mx-auto mb-4 ${selectedFiles.length > 0 ? 'text-green-500' : 'text-gray-400'
              }`} />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              {selectedFiles.length > 0
                ? `${selectedFiles.length} file(s) selected`
                : isDragOver
                  ? 'Drop files here'
                  : 'Choose files to share'
              }
            </h3>
            <p className="text-gray-500">
              {isDragOver
                ? 'Release to select files'
                : 'Click to browse or drag and drop files here'
              }
            </p>
          </label>
        </div>

        {selectedFiles.length > 0 && (
          <div className="space-y-3">
            <h4 className="font-semibold text-gray-800 flex items-center gap-2">
              <File className="h-4 w-4" />
              Selected Files:
            </h4>
            <div className="max-h-40 overflow-y-auto space-y-2">
              {selectedFiles.map((file, index) => (
                <div key={index} className="flex items-center justify-between bg-white p-3 rounded-lg border border-gray-200 shadow-sm">
                  <div className="flex items-center gap-3">
                    <File className="h-4 w-4 text-blue-600" />
                    <span className="font-medium text-gray-800">{file.name}</span>
                  </div>
                  <span className="text-sm text-gray-500 bg-gray-100 px-2 py-1 rounded">
                    {formatFileSize(file.size)}
                  </span>
                </div>
              ))}
            </div>
            <div className="text-sm text-gray-600 bg-blue-50 p-3 rounded-lg border border-blue-200">
              <strong>Total:</strong> {selectedFiles.length} file(s) • {formatFileSize(
                selectedFiles.reduce((total, file) => total + file.size, 0)
              )}
            </div>
          </div>
        )}

        <Button
          onClick={handleGenerateLink}
          disabled={selectedFiles.length === 0}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3"
          size="lg"
        >
          <Share2 className="h-5 w-5 mr-2" />
          Generate Share Link
        </Button>

        {shareLink && (
          <div className="space-y-3 p-4 bg-gradient-to-r from-green-50 to-blue-50 rounded-lg border border-green-200">
            <h4 className="font-semibold text-gray-800">Your Share Link:</h4>
            <div className="bg-white p-3 rounded-lg border border-gray-200 font-mono text-sm break-all">
              {shareLink}
            </div>
            <Button
              onClick={copyLinkToClipboard}
              className="w-full"
              variant="outline"
              size="lg"
            >
              {copiedToClipboard ? (
                <>
                  <Check className="h-4 w-4 mr-2 text-green-600" />
                  Copied to Clipboard!
                </>
              ) : (
                <>
                  <Copy className="h-4 w-4 mr-2" />
                  Copy Share Link
                </>
              )}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
