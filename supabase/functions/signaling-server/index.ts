
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

interface Room {
  sender?: WebSocket;
  receiver?: WebSocket;
  senderReady: boolean;
  receiverReady: boolean;
}

const rooms = new Map<string, Room>();

function broadcastToRoom(roomId: string, message: any, excludeSocket?: WebSocket) {
  const room = rooms.get(roomId);
  if (!room) return;
  
  const messageStr = JSON.stringify(message);
  
  if (room.sender && room.sender !== excludeSocket && room.sender.readyState === WebSocket.OPEN) {
    room.sender.send(messageStr);
  }
  
  if (room.receiver && room.receiver !== excludeSocket && room.receiver.readyState === WebSocket.OPEN) {
    room.receiver.send(messageStr);
  }
}

function cleanupSocket(socket: WebSocket, roomId: string) {
  const room = rooms.get(roomId);
  if (!room) return;
  
  if (room.sender === socket) {
    room.sender = undefined;
    room.senderReady = false;
    broadcastToRoom(roomId, { type: 'peer-left', peerRole: 'sender' });
  } else if (room.receiver === socket) {
    room.receiver = undefined;
    room.receiverReady = false;
    broadcastToRoom(roomId, { type: 'peer-left', peerRole: 'receiver' });
  }
  
  // Clean up empty rooms
  if (!room.sender && !room.receiver) {
    rooms.delete(roomId);
  }
}

serve((req) => {
  const upgrade = req.headers.get("upgrade") || "";
  if (upgrade.toLowerCase() !== "websocket") {
    return new Response("Expected WebSocket", { status: 426 });
  }

  const { socket, response } = Deno.upgradeWebSocket(req);
  let currentRoomId: string | null = null;

  socket.onopen = () => {
    console.log("WebSocket connection established");
  };

  socket.onmessage = (event) => {
    try {
      const message = JSON.parse(event.data);
      console.log("Received message:", message);

      switch (message.type) {
        case 'join-room':
          const { roomId, role } = message;
          currentRoomId = roomId;
          
          if (!rooms.has(roomId)) {
            rooms.set(roomId, {
              senderReady: false,
              receiverReady: false
            });
          }
          
          const room = rooms.get(roomId)!;
          
          if (role === 'sender') {
            if (room.sender) {
              socket.send(JSON.stringify({ type: 'error', message: 'Room already has a sender' }));
              return;
            }
            room.sender = socket;
            room.senderReady = true;
            
            // Notify receiver if they're already there
            if (room.receiver) {
              broadcastToRoom(roomId, { type: 'peer-joined', peerRole: 'sender' });
            }
          } else if (role === 'receiver') {
            if (room.receiver) {
              socket.send(JSON.stringify({ type: 'error', message: 'Room already has a receiver' }));
              return;
            }
            room.receiver = socket;
            room.receiverReady = true;
            
            // Notify sender if they're already there
            if (room.sender) {
              broadcastToRoom(roomId, { type: 'peer-joined', peerRole: 'receiver' });
            }
          }
          
          console.log(`${role} joined room ${roomId}`);
          break;

        case 'offer':
        case 'answer':
        case 'ice-candidate':
          if (currentRoomId) {
            broadcastToRoom(currentRoomId, message, socket);
          }
          break;

        default:
          console.log("Unknown message type:", message.type);
      }
    } catch (error) {
      console.error("Error processing message:", error);
      socket.send(JSON.stringify({ type: 'error', message: 'Invalid message format' }));
    }
  };

  socket.onclose = () => {
    console.log("WebSocket connection closed");
    if (currentRoomId) {
      cleanupSocket(socket, currentRoomId);
    }
  };

  socket.onerror = (error) => {
    console.error("WebSocket error:", error);
    if (currentRoomId) {
      cleanupSocket(socket, currentRoomId);
    }
  };

  return response;
});
