import express from "express";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";
import multer from "multer";
import { Track, RemoteCommand } from "./src/types.js"; // In Node with ESM/CJS, we reference the file relative path or bundle

const app = express();
const PORT = 3000;

// Setup directories
const UPLOADS_DIR = path.join(process.cwd(), "uploads");
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

// In-memory database
// Map of Room ID -> Track list
const roomTracks = new Map<string, Track[]>();

// Map of Room ID -> SSE Client Responses
const sseClients = new Map<string, { id: string; res: express.Response }[]>();

// Configure Multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, UPLOADS_DIR);
  },
  filename: (req, file, cb) => {
    // Clean filename and add timestamp to avoid collisions
    const safeName = file.originalname.replace(/[^a-zA-Z0-9.\-_]/g, "_");
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, `${uniqueSuffix}-${safeName}`);
  },
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB max file size
  },
  fileFilter: (req, file, cb) => {
    // Accept audio files only
    if (file.mimetype.startsWith("audio/")) {
      cb(null, true);
    } else {
      cb(new Error("Only audio files are allowed"));
    }
  },
});

// JSON middleware
app.use(express.json());

// Serve uploaded audio files with correct headers
app.use("/uploads", express.static(UPLOADS_DIR, {
  setHeaders: (res, filePath) => {
    res.setHeader("Accept-Ranges", "bytes");
    // Ensure CORS is set so local clients can fetch/stream smoothly
    res.setHeader("Access-Control-Allow-Origin", "*");
  }
}));

// API Routes

// Get tracks for a room
app.get("/api/tracks", (req, res) => {
  const room = (req.query.room as string) || "default";
  const tracks = roomTracks.get(room) || [];
  res.json({ success: true, tracks });
});

// Upload a track for a room
app.post("/api/upload", (req, res) => {
  upload.single("file")(req, res, (err) => {
    if (err) {
      return res.status(400).json({ success: false, message: err.message });
    }

    if (!req.file) {
      return res.status(400).json({ success: false, message: "No file uploaded" });
    }

    const room = (req.body.room as string) || "default";
    const trackId = "track-" + Date.now() + "-" + Math.round(Math.random() * 1000);

    const newTrack: Track = {
      id: trackId,
      name: req.file.filename,
      originalName: req.file.originalname,
      size: req.file.size,
      uploadedAt: new Date().toISOString(),
      url: `/uploads/${req.file.filename}`,
    };

    // Store track
    const tracks = roomTracks.get(room) || [];
    tracks.push(newTrack);
    roomTracks.set(room, tracks);

    // Broadcast track list update to clients in the room
    broadcastCommand(room, {
      type: "refresh_list",
      senderId: "server",
    });

    res.json({ success: true, track: newTrack });
  });
});

// Delete a track from a room
app.delete("/api/tracks/:id", (req, res) => {
  const trackId = req.params.id;
  const room = (req.query.room as string) || "default";

  const tracks = roomTracks.get(room) || [];
  const trackIndex = tracks.findIndex((t) => t.id === trackId);

  if (trackIndex === -1) {
    return res.status(404).json({ success: false, message: "Track not found" });
  }

  const track = tracks[trackIndex];
  const filePath = path.join(UPLOADS_DIR, track.name);

  // Delete file from disk asynchronously
  fs.unlink(filePath, (err) => {
    if (err) {
      console.error("Failed to delete physical file:", err);
    }
  });

  // Remove from database
  tracks.splice(trackIndex, 1);
  roomTracks.set(room, tracks);

  // Broadcast track list update
  broadcastCommand(room, {
    type: "refresh_list",
    senderId: "server",
  });

  res.json({ success: true });
});

// Server-Sent Events subscription for room sync
app.get("/api/sync/events", (req, res) => {
  const room = (req.query.room as string) || "default";
  const clientId = (req.query.clientId as string) || "client-" + Date.now();

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("Access-Control-Allow-Origin", "*");

  // Send initial connected confirmation
  res.write(`data: ${JSON.stringify({ type: "connected", clientId })}\n\n`);

  // Keep connection alive with pings every 20 seconds
  const pingInterval = setInterval(() => {
    res.write(":\n\n");
  }, 20000);

  // Register client
  const clients = sseClients.get(room) || [];
  clients.push({ id: clientId, res });
  sseClients.set(room, clients);

  console.log(`Client ${clientId} subscribed to room: ${room}`);

  req.on("close", () => {
    clearInterval(pingInterval);
    const updatedClients = sseClients.get(room) || [];
    const index = updatedClients.findIndex((c) => c.id === clientId);
    if (index !== -1) {
      updatedClients.splice(index, 1);
    }
    if (updatedClients.length === 0) {
      sseClients.delete(room);
    } else {
      sseClients.set(room, updatedClients);
    }
    console.log(`Client ${clientId} disconnected from room: ${room}`);
  });
});

// Broadcast remote command to room
app.post("/api/sync/command", (req, res) => {
  const { room, command } = req.body as { room: string; command: RemoteCommand };

  if (!room || !command) {
    return res.status(400).json({ success: false, message: "Missing room or command parameters" });
  }

  broadcastCommand(room, command);
  res.json({ success: true });
});

// Helper function to broadcast a command to all room clients
function broadcastCommand(room: string, command: RemoteCommand) {
  const clients = sseClients.get(room) || [];
  const payload = JSON.stringify(command);

  clients.forEach((client) => {
    // Only skip if senderId matches client ID, to avoid self-echoes
    if (client.id !== command.senderId) {
      try {
        client.res.write(`data: ${payload}\n\n`);
      } catch (e) {
        console.error(`Error sending command to client ${client.id}:`, e);
      }
    }
  });
}

// Vite / static build handling
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
