
import { useRef, useCallback } from 'react';

export const useFileTransfer = ({ onFileReceived, onProgress, onIncomingFiles }) => {
  const fileTransferRef = useRef(null);
  const pendingFilesRef = useRef([]);

  const clearFileState = useCallback(() => {
    console.log('Clearing file transfer state...');
    fileTransferRef.current = null;
    pendingFilesRef.current = [];
    onIncomingFiles([]);
    onProgress(0);
  }, [onIncomingFiles, onProgress]);

  const handleMessage = useCallback((message, channel) => {
    console.log('[RECEIVE] Message:', message);

    if (message.type === 'file-list') {
      console.log('[RECEIVE] Incoming file list:', message.files);
      onIncomingFiles(message.files || []);
    }

    else if (message.type === 'file-request') {
      console.log('[RECEIVE] Request for files:', message.fileIds);
      const requestedFiles = pendingFilesRef.current.filter(f =>
        message.fileIds?.includes(f.id)
      );
      requestedFiles.forEach(fileData => {
        sendSingleFile(fileData.file, fileData.id, channel);
      });
    }

    else if (message.type === 'file-start') {
      console.log(`[RECEIVER] Starting to receive file: ${message.fileName}, size: ${message.fileSize}`);
      fileTransferRef.current = {
        chunks: [],
        fileName: message.fileName || '',
        fileSize: message.fileSize || 0,
        receivedSize: 0
      };
    }

    else if (message.type === 'file-end') {
      const fileData = fileTransferRef.current;
      if (fileData) {
        console.log(`[RECEIVER][${fileData.fileName}] Transfer complete. Received ${fileData.receivedSize}/${fileData.fileSize} bytes`);

        const blob = new Blob(fileData.chunks);
        const file = new File([blob], fileData.fileName);

        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = fileData.fileName;
        a.click();
        URL.revokeObjectURL(url);

        console.log(`[RECEIVE][${fileData.fileName}] File reconstructed and download triggered.`);

        onFileReceived([file]);
        fileTransferRef.current = null;
      } else {
        console.warn('[RECEIVE] file-end received but no active file transfer.');
      }
    }
  }, [onFileReceived, onIncomingFiles, sendSingleFile]);

  const handleFileChunk = useCallback((data) => {
    if (fileTransferRef.current) {
      fileTransferRef.current.chunks.push(data);
      fileTransferRef.current.receivedSize += data.byteLength;

      const progress = (fileTransferRef.current.receivedSize / fileTransferRef.current.fileSize) * 100;
      console.log(`[RECEIVER] Received chunk: ${data.byteLength} bytes, total received: ${fileTransferRef.current.receivedSize}/${fileTransferRef.current.fileSize}`);

      onProgress(Math.round(progress));
    }
  }, [onProgress]);

  const sendSingleFile = useCallback(async (file, fileId, channel) => {
    if (!channel || channel.readyState !== 'open') {
      console.error(`[SEND][${file.name}] No active connection.`);
      throw new Error('No active connection');
    }

    const chunkSize = 16384; // 16KB chunks
    const totalChunks = Math.ceil(file.size / chunkSize);
    let offset = 0;
    let chunkIndex = 0;

    console.log(`[SEND][${file.name}] Starting transfer. Size: ${file.size} bytes, Total Chunks: ${totalChunks}`);

    // Send file metadata
    channel.send(JSON.stringify({
      type: 'file-start',
      fileName: file.name,
      fileSize: file.size,
      fileId: fileId
    }));

    const reader = new FileReader();

    reader.onerror = (err) => {
      console.error(`[SEND][${file.name}] Read error at offset ${offset}:`, err);
    };

    const sendChunk = async () => {
      const slice = file.slice(offset, offset + chunkSize);
      let retryCount = 0;

      const trySend = () => {
        const reader = new FileReader();

        reader.onload = async (event) => {
          const chunk = event.target?.result;

          if (!chunk || channel.readyState !== 'open') {
            console.warn(`[SEND][${file.name}] Chunk read failed or channel not open. Aborting.`);
            return;
          }

          try {
            channel.send(chunk);

            offset += chunkSize;
            chunkIndex++;

            console.log(`[SEND][${file.name}] Chunk ${chunkIndex}/${totalChunks} sent. Offset: ${offset}`);

            const progress = Math.min((offset / file.size) * 100, 100);
            onProgress(Math.round(progress));

            if (offset < file.size) {
              // Send next chunk
              sendChunk();
            } else {
              console.log(`[SEND][${file.name}] All chunks sent. Sending file-end.`);
              channel.send(JSON.stringify({ type: 'file-end', fileId: fileId }));
            }
          } catch (err) {
            retryCount++;
            console.error(`[SEND][${file.name}] Failed to send chunk at offset ${offset}. Retry ${retryCount}/5`, err);

            if (retryCount < 5) {
              setTimeout(() => trySend(), 100); // Retry after short delay
            } else {
              console.error(`[SEND][${file.name}] Chunk failed after ${retryCount} retries. Aborting transfer.`);
              channel.send(JSON.stringify({ type: 'file-error', fileId }));
            }
          }
        };

        reader.onerror = (e) => {
          console.error(`[SEND][${file.name}] FileReader error at offset ${offset}:`, e);
          channel.send(JSON.stringify({ type: 'file-error', fileId }));
        };

        reader.readAsArrayBuffer(slice);
      };

      trySend();
    };

    sendChunk();
  }, [onProgress]);

  const setFilesForSharing = useCallback((files) => {
    pendingFilesRef.current = files.map(file => ({
      name: file.name,
      size: file.size,
      id: Math.random().toString(36).substr(2, 9),
      file
    }));

    console.log('Files set for sharing:', pendingFilesRef.current.length);
  }, []);

  const sendFileList = useCallback((channel) => {
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

  const requestFiles = useCallback((fileIds, channel) => {
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
    pendingFilesRef,
    clearFileState
  };
};
