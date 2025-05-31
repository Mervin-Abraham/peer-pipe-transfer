
import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Upload, Share2, Copy, Check } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

interface FileSelectorProps {
  onFilesSelected: (files: File[]) => void;
  onGenerateLink: () => string;
}

export const FileSelector = ({ onFilesSelected, onGenerateLink }: FileSelectorProps) => {
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [shareLink, setShareLink] = useState<string>('');
  const [copiedToClipboard, setCopiedToClipboard] = useState(false);
  const { toast } = useToast();

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
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

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Upload className="h-5 w-5" />
          Select Files to Share
        </CardTitle>
        <CardDescription>
          Choose files and generate a share link
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
          <input
            type="file"
            onChange={handleFileSelect}
            className="hidden"
            id="file-input-selector"
            multiple
          />
          <label htmlFor="file-input-selector" className="cursor-pointer">
            <Upload className="h-12 w-12 mx-auto text-gray-400 mb-4" />
            <p className="text-lg font-medium text-gray-900">
              {selectedFiles.length > 0 ? `${selectedFiles.length} file(s) selected` : 'Choose files to share'}
            </p>
            <p className="text-sm text-gray-500">
              Click to select multiple files
            </p>
          </label>
        </div>

        {selectedFiles.length > 0 && (
          <div className="space-y-2">
            <h4 className="font-medium">Selected Files:</h4>
            {selectedFiles.map((file, index) => (
              <div key={index} className="flex items-center justify-between bg-gray-50 p-2 rounded">
                <span className="text-sm">{file.name}</span>
                <span className="text-xs text-gray-500">
                  {(file.size / 1024 / 1024).toFixed(2)} MB
                </span>
              </div>
            ))}
          </div>
        )}

        <Button 
          onClick={handleGenerateLink}
          disabled={selectedFiles.length === 0}
          className="w-full"
        >
          <Share2 className="h-4 w-4 mr-2" />
          Generate Share Link
        </Button>

        {shareLink && (
          <div className="space-y-2">
            <div className="bg-gray-100 p-3 rounded-lg font-mono text-sm break-all">
              {shareLink}
            </div>
            <Button 
              onClick={copyLinkToClipboard}
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
