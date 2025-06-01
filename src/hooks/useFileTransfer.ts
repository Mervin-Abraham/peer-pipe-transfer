
import { useRef, useCallback } from 'react';
import { FileTransferState, FileData, MessageData } from '@/types/peer';

interface UseFileTransferProps {
  onFileReceived: (files: File[]) => void;
  onProgress: (progress: number) => void;
  onIncomingFiles: (fileList: { name: string; size: number; id: string }[]) => void;
}

export const useFileTransfer = ({ onFileReceived, onProgress, onIncomingFiles }: UseFileTransferProps) => {
  const fileTransferRef = useRef<FileTransferState | null>(null);
  const pendingFilesRef = useRef<FileData[]>([]);

  const handleMessage = useCallback((message: MessageData, channel: any) => {
    console.log('Received message:', message);
    
    if (message.type === 'file-list') {
      console.log('Received file list:', message.files);
      onIncomingFiles(message.files || []);
    } else if (message.type === 'file-request') {
      console.log('File request received for:', message.fileIds);
      // Send requested files
      const requestedFiles = pendingFilesRef.current.filter(f => 
        message.fileIds?.includes(f.id)
      );
      requestedFiles.forEach(fileData => {
        sendSingleFile(fileData.file, fileData.id, channel);
      });
    } else if (message.type === 'file-start') {
      console.log('Starting file transfer:', message.fileName);
      fileTransferRef.current = {
        chunks: [],
        fileName: message.fileName || '',
        fileSize: message.fileSize || 0,
        receivedSize: 0
      };
    } else if (message.type === 'file-end') {
      console.log('File transfer completed');
      if (fileTransferRef.current) {
        const blob = new Blob(fileTransferRef.current.chunks);
        const file = new File([blob], fileTransferRef.current.fileName);
        
        // Auto-download the file
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = fileTransferRef.current.fileName;
        a.click();
        URL.revokeObjectURL(url);
        
        onFileReceived([file]);
        fileTransferRef.current = null;
      }
    }
  }, [onFileReceived, onIncomingFiles]);

  const handleFileChunk = useCallback((data: ArrayBuffer) => {
    if (fileTransferRef.current) {
      fileTransferRef.current.chunks.push(data);
      fileTransferRef.current.receivedSize += data.byteLength;
      
      const progress = (fileTransferRef.current.receivedSize / fileTransferRef.current.fileSize) * 100;
      onProgress(Math.round(progress));
    }
  }, [onProgress]);

  const sendSingleFile = useCallback(async (file: File, fileId: string, channel: any) => {
    if (!channel || channel.readyState !== 'open') {
      throw new Error('No active connection');
    }

    const chunkSize = 16384; // 16KB chunks
    
    // Send file metadata
    channel.send(JSON.stringify({
      type: 'file-start',
      fileName: file.name,
      fileSize: file.size,
      fileId: fileId
    }));

    // Send file in chunks
    const reader = new FileReader();
    let offset = 0;

    const sendChunk = () => {
      const slice = file.slice(offset, offset + chunkSize);
      reader.onload = (event) => {
        if (event.target?.result && channel.readyState === 'open') {
          channel.send(event.target.result as ArrayBuffer);
          offset += chunkSize;
          
          const progress = Math.min((offset / file.size) * 100, 100);
          onProgress(Math.round(progress));
          
          if (offset < file.size) {
            setTimeout(sendChunk, 10);
          } else {
            // Send completion message
            channel.send(JSON.stringify({ type: 'file-end', fileId: fileId }));
          }
        }
      };
      reader.readAsArrayBuffer(slice);
    };

    sendChunk();
  }, [onProgress]);

  const setFilesForSharing = useCallback((files: File[]) => {
    pendingFilesRef.current = files.map(file => ({
      name: file.name,
      size: file.size,
      id: Math.random().toString(36).substr(2, 9),
      file
    }));
    
    console.log('Files set for sharing:', pendingFilesRef.current.length);
  }, []);

  const sendFileList = useCallback((channel: any) => {
    if (pendingFilesRef.current.length > 0 && channel?.readyState === 'open') {
      const fileList = pendingFilesRef.current.map(f => ({ name: f.name, size: f.size, id: f.id }));
      console.log('Sending file list:', fileList);
      try {
        channel.send(JSON.stringify({
          type: 'file-list',
          files: fileList
        }));
        console.log('File list sent successfully:', fileList);
      } catch (error) {
        console.error('Failed to send file list:', error);
      }
    }
  }, []);

  const requestFiles = useCallback((fileIds: string[], channel: any) => {
    if (!channel || channel.readyState !== 'open') {
      throw new Error('No active connection');
    }

    console.log('Requesting files:', fileIds);
    try {
      channel.send(JSON.stringify({
        type: 'file-request',
        fileIds: fileIds
      }));
    } catch (error) {
      console.error('Failed to request files:', error);
      throw error;
    }
  }, []);

  return {
    handleMessage,
    handleFileChunk,
    setFilesForSharing,
    sendFileList,
    requestFiles,
    pendingFilesRef
  };
};
