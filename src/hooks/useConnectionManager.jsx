
import { useState, useCallback, useRef, useEffect } from 'react';
import { ICE_SERVERS } from '../config/webrtcConfig';

// Use the deployed edge function for signaling
const SIGNALING_SERVER_URL = 'wss://wide-tiger-20.deno.dev/';

export const useConnectionManager = ({
	onConnectionChange,
	onDataChannelOpen,
	onMessage,
	onFileChunk,
	onPeerDisconnected
}) => {
	const [connectionStatus, setConnectionStatus] = useState('Disconnected');
	const [isConnecting, setIsConnecting] = useState(false);
	const [isWaitingForConnection, setIsWaitingForConnection] = useState(false);
	const connectionRef = useRef(null);
	const signalingSocketRef = useRef(null);
	const roomIdRef = useRef(null);
	const roleRef = useRef(null);
	let retryAttempts = 0;

	const retryConnection = useCallback((roomId) => {
		const delay = Math.min(1000 * 2 ** retryAttempts, 30000); // max 30s
		retryAttempts++;

		setTimeout(() => {
			console.warn(`Retrying connection attempt #${retryAttempts}`);
			setupSignalingSocket(roomId);
		}, delay);
	})

	const cleanup = useCallback(() => {
		if (connectionRef.current?.peer) {
			try {
				connectionRef.current.peer.close();
			} catch { }
		}
		if (connectionRef.current?.dataChannel) {
			try {
				connectionRef.current.dataChannel.close();
			} catch { }
		}

		if (signalingSocketRef.current && signalingSocketRef.current.readyState !== WebSocket.CLOSED) {
			try {
				signalingSocketRef.current.close();
			} catch { }
		}

		connectionRef.current = null;
		signalingSocketRef.current = null;
	})


	// Cleanup function to handle disconnection
	const handleDisconnection = useCallback(() => {
		console.log('Handling disconnection...');
		setConnectionStatus('Disconnected');
		setIsConnecting(false);
		setIsWaitingForConnection(false);
		onConnectionChange(false);

		if (connectionRef.current?.dataChannel) {
			connectionRef.current.dataChannel.close();
		}
		if (connectionRef.current?.peer) {
			connectionRef.current.peer.close();
		}
		connectionRef.current = null;

		if (signalingSocketRef.current) {
			signalingSocketRef.current.close();
			signalingSocketRef.current = null;
		}

		if (onPeerDisconnected) {
			onPeerDisconnected();
		}
	}, [onConnectionChange, onPeerDisconnected]);

	// Setup beforeunload event to handle tab close/reload
	useEffect(() => {
		const handleBeforeUnload = () => {
			console.log('Page unloading, sending disconnection signal...');
			if (connectionRef.current?.dataChannel?.readyState === 'open') {
				try {
					connectionRef.current.dataChannel.send(JSON.stringify({
						type: 'peer-disconnected',
						peerId: 'sender'
					}));
				} catch (error) {
					console.log('Failed to send disconnection message:', error);
				}
			}

			// Close connections
			if (connectionRef.current?.dataChannel) {
				connectionRef.current.dataChannel.close();
			}
			if (connectionRef.current?.peer) {
				connectionRef.current.peer.close();
			}
			if (signalingSocketRef.current) {
				signalingSocketRef.current.close();
			}
		};

		window.addEventListener('beforeunload', handleBeforeUnload);

		return () => {
			window.removeEventListener('beforeunload', handleBeforeUnload);
			handleBeforeUnload();
		};
	}, []);

	const createPeerConnection = useCallback(() => {
		const peer = new RTCPeerConnection({
			iceServers: ICE_SERVERS
		});

		// ICE connection state monitoring
		peer.oniceconnectionstatechange = () => {
			const state = peer.iceConnectionState;
			console.log('ICE Connection State:', state);

			if (state === 'connected' || state === 'completed') {
				setConnectionStatus('Connected');
				setIsConnecting(false);
				setIsWaitingForConnection(false);
				onConnectionChange(true);
			} else if (state === 'disconnected') {
				console.log('ICE connection disconnected - network issue detected');
				setConnectionStatus('Connection lost');
				handleDisconnection();
			} else if (state === 'failed') {
				console.log('ICE connection failed - connection cannot be established');
				setConnectionStatus('Connection failed');
				handleDisconnection();
			} else if (state === 'closed') {
				console.log('ICE connection closed - peer disconnected');
				setConnectionStatus('Peer disconnected');
				handleDisconnection();
			} else if (state === 'checking') {
				setConnectionStatus('Connecting...');
			}
		};

		// Monitor connection state changes
		peer.onconnectionstatechange = () => {
			const state = peer.connectionState;
			console.log('Peer Connection State:', state);

			if (state === 'failed' || state === 'closed' || state === 'disconnected') {
				console.log('Peer connection state indicates disconnection:', state);
				handleDisconnection();
			}
		};

		// Handle ICE candidates
		peer.onicecandidate = (event) => {
			if (event.candidate && signalingSocketRef.current?.readyState === WebSocket.OPEN) {
				console.log('Sending ICE candidate');
				signalingSocketRef.current.send(JSON.stringify({
					type: 'ice-candidate',
					candidate: event.candidate,
					roomId: roomIdRef.current
				}));
			}
		};

		return peer;
	}, [onConnectionChange, handleDisconnection]);

	const setupDataChannel = useCallback((channel) => {
		channel.binaryType = 'arraybuffer';

		channel.onopen = () => {
			console.log('Data channel opened');
			setConnectionStatus('Connected');
			setIsConnecting(false);
			setIsWaitingForConnection(false);
			onConnectionChange(true);
			onDataChannelOpen(channel);
		};

		channel.onclose = () => {
			console.log('Data channel closed by peer');
			setConnectionStatus('Data channel closed');
			handleDisconnection();
		};

		channel.onerror = (error) => {
			console.error('Data channel error:', error);
			setConnectionStatus('Data channel error');
			handleDisconnection();
		};

		channel.onmessage = (event) => {
			if (typeof event.data === 'string') {
				try {
					const message = JSON.parse(event.data);

					if (message.type === 'peer-disconnected') {
						console.log('Received peer disconnection message');
						handleDisconnection();
						return;
					}

					onMessage(message, channel);
				} catch (error) {
					console.error('Error parsing message:', error);
				}
			} else if (event.data instanceof ArrayBuffer) {
				onFileChunk(event.data);
			}
		};

		return channel;
	}, [onDataChannelOpen, onMessage, onFileChunk, onConnectionChange, handleDisconnection]);

	const setupSignalingSocket = useCallback((roomId, role) => {
		console.log(`Setting up signaling socket for ${role} in room:`, roomId);
		let retryCount = 0;
		const maxRetries = 5;
		const baseRetryDelay = 3000;

		const createSocket = () => {
			const socket = new WebSocket(SIGNALING_SERVER_URL);
			signalingSocketRef.current = socket;
			roomIdRef.current = roomId;
			roleRef.current = role;

			socket.onopen = () => {
				console.log('Signaling socket connected');
				retryCount = 0;
				socket.send(JSON.stringify({
					type: 'join-room',
					roomId: roomId,
					role: role
				}));
			};

			socket.onmessage = async (event) => {
				const message = JSON.parse(event.data);
				console.log('Received signaling message:', message);

				const peer = connectionRef.current?.peer;
				if (!peer) return;

				if (message.type === 'error') {
					console.error('Signaling error:', message.message);
					setConnectionStatus('Signaling error');

					if (message.message === 'Receiver already joined') {
						console.warn('Receiver already joined - stopping reconnect attempts.');
						handleDisconnection();
						return;
					} else {
						handleDisconnection();
						attemptReconnect();
						return;
					}
				}

				switch (message.type) {
					case 'offer':
						if (role === 'receiver') {
							console.log('Receiver: Setting remote description from offer');
							await peer.setRemoteDescription(message.offer);

							const answer = await peer.createAnswer();
							await peer.setLocalDescription(answer);

							socket.send(JSON.stringify({
								type: 'answer',
								answer: answer,
								roomId: roomId
							}));

							console.log('Receiver: Sent answer');
						}
						break;

					case 'answer':
						if (role === 'sender') {
							console.log('Sender: Setting remote description from answer');
							await peer.setRemoteDescription(message.answer);
						}
						break;

					case 'ice-candidate':
						console.log('Adding ICE candidate');
						await peer.addIceCandidate(message.candidate);
						break;

					case 'peer-joined':
						if (role === 'sender' && message.peerRole === 'receiver') {
							console.log('Receiver joined, sender creating offer');
							const offer = await peer.createOffer();
							await peer.setLocalDescription(offer);

							socket.send(JSON.stringify({
								type: 'offer',
								offer: offer,
								roomId: roomId
							}));

							console.log('Sender: Sent offer');
						}
						break;

					case 'peer-left':
						console.log('Peer left the room');
						handleDisconnection();
						break;

					default:
						break;
				}
			};

			socket.onerror = (error) => {
				console.error('Signaling socket error:', error);
				setConnectionStatus('Signaling error');
				handleDisconnection();
				retryConnection(roomId);
				cleanup();
				attemptReconnect();
			};

			socket.onclose = () => {
				console.log('Signaling socket closed');
				handleDisconnection();
				retryConnection(roomId);
				cleanup();
				attemptReconnect();
			};

			return socket;
		};

		const attemptReconnect = () => {
			if (retryCount < maxRetries) {
				retryCount++;
				const delay = baseRetryDelay * retryCount;
				console.log(`Attempting reconnect #${retryCount} in ${delay / 1000}s...`);
				setTimeout(() => {
					if (!signalingSocketRef.current || signalingSocketRef.current.readyState === WebSocket.CLOSED) {
						createSocket();
					}
				}, delay);
			} else {
				console.warn('Max reconnect attempts reached. Giving up.');
			}
		};

		return createSocket();
	}, [handleDisconnection]);

	const waitForConnection = useCallback(async () => {
		console.log('Sender waiting for incoming connections...');
		setIsWaitingForConnection(true);
		setConnectionStatus('Waiting for connection');

		try {
			const peer = createPeerConnection();

			// Create data channel as the sender
			const dataChannel = peer.createDataChannel('fileTransfer', {
				ordered: true
			});

			setupDataChannel(dataChannel);

			connectionRef.current = {
				peer,
				dataChannel,
				isInitiator: true
			};

			// Generate room ID for this session
			const roomId = Math.random().toString(36).substr(2, 9);
			setupSignalingSocket(roomId, 'sender');

		} catch (error) {
			console.error('Failed to wait for connection:', error);
			setIsWaitingForConnection(false);
			throw error;
		}
	}, [createPeerConnection, setupDataChannel, setupSignalingSocket]);

	const connect = useCallback(async (remotePeerId) => {
		console.log('Receiver connecting to sender:', remotePeerId);

		if (isConnecting || signalingSocketRef.current || connectionRef.current?.peer) {
			console.warn('[Receiver] Already connecting or connected. Skipping duplicate attempt.');
			return;
		}

		setIsConnecting(true);
		setConnectionStatus('Connecting');

		try {
			const peer = createPeerConnection();

			// Setup incoming data channel
			peer.ondatachannel = (event) => {
				console.log('Received data channel from sender');
				const channel = event.channel;
				setupDataChannel(channel);

				connectionRef.current = {
					...connectionRef.current,
					dataChannel: channel,
					isInitiator: false
				};
			};

			connectionRef.current = {
				peer,
				dataChannel: null,
				isInitiator: false
			};

			// Prevent redundant signaling connections
			// // Use the remotePeerId as the room ID
			// if (connectionRef.current?.peer || signalingSocketRef.current?.readyState === WebSocket.OPEN) {
			// 	console.warn("Already connected. Skipping reconnect.");
			// 	return;
			// }
			setupSignalingSocket(remotePeerId, 'receiver');

		} catch (error) {
			console.error('Connection failed:', error);
			setIsConnecting(false);
			setConnectionStatus('Disconnected');
			throw error;
		}
	}, [isConnecting, createPeerConnection, setupDataChannel, setupSignalingSocket]);


	// Cleanup on unmount
	useEffect(() => {
		return () => {
			if (connectionRef.current?.peer) {
				connectionRef.current.peer.close();
				connectionRef.current.dataChannel?.close();
				connectionRef.current = null;
			}
			if (signalingSocketRef.current) {
				signalingSocketRef.current.close();
				signalingSocketRef.current = null;
			}
		};
	}, []);

	return {
		connectionStatus,
		isConnecting,
		isWaitingForConnection,
		connectionRef,
		waitForConnection,
		connect,
		handleDisconnection
	};
};
