
export interface UsePeerConnectionProps {
  onFileReceived: (files: File[]) => void;
  onProgress: (progress: number) => void;
  onConnectionChange: (connected: boolean) => void;
  onIncomingFiles: (fileList: { name: string; size: number; id: string }[]) => void;
}

export interface PeerConnection {
  peer: RTCPeerConnection;
  dataChannel: RTCDataChannel | null;
  isInitiator: boolean;
}

export interface FileData {
  name: string;
  size: number;
  id: string;
  file: File;
}

export interface FileTransferState {
  chunks: ArrayBuffer[];
  fileName: string;
  fileSize: number;
  receivedSize: number;
}

export interface MessageData {
  type: 'file-list' | 'file-request' | 'file-start' | 'file-end';
  files?: { name: string; size: number; id: string }[];
  fileIds?: string[];
  fileName?: string;
  fileSize?: number;
  fileId?: string;
}
