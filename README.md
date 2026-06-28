# Local Music Share 

Seamless, high-speed music sharing and remote-sync player from phone to PC over local Wi-Fi. 

This is a self-contained full-stack application. When you run this locally on your machine, your uploaded audio files remain entirely **private** on your computer. Other users running their own clones of this project will have their own independent environments.

---

## How to Run Locally

### 1. Prerequisites
Ensure you have **Node.js** (v18 or higher) installed on your system.

### 2. Install Dependencies
Clone this repository to your computer, open your terminal inside the project folder, and run:
```bash
npm install
```

### 3. Start the Server
Run the local development server:
```bash
npm run dev
```
The server will boot up and bind to:
* **Host**: `0.0.0.0`
* **Port**: `3000`

---

## How to Pair Your Phone & PC

To share and control music from your mobile device, both your PC/Laptop and your Phone **must be connected to the same Wi-Fi network**.

### Step 1: Find your Laptop's Local IP Address
Open your computer's terminal and find your local IP address:
* **Windows (Command Prompt)**: Run `ipconfig` (Look for `IPv4 Address` under your active Wi-Fi adapter, e.g., `192.168.1.15`).
* **macOS / Linux (Terminal)**: Run `ifconfig` or `ip route` (Look for `inet` under your active interface, e.g., `192.168.1.15`).

### Step 2: Open the App on Both Devices
1. **On your Laptop/PC**: Open your browser and navigate to `http://localhost:3000`.
2. **On your Phone**: Open your mobile browser and navigate to `http://<YOUR-LAPTOP-IP>:3000` (e.g., `http://192.168.1.15:3000`).

### Step 3: Connect and Play!
1. Enter the **same Room PIN** (e.g., `kepokmusic`) on both your phone and PC.
2. **On Laptop**: Select **"Desktop Player"** mode.
3. **On Phone**: Select **"Mobile Remote"** mode, drag-and-drop or select your local audio files to upload, and tap any song to play it instantly on your PC speaker!

---

## Tech Stack
* **Frontend**: React, Tailwind CSS, Lucide Icons, Web Audio API (real-time visualizer)
* **Backend**: Express (Node.js), Multer (file transfer), Server-Sent Events (real-time state synchronization)
