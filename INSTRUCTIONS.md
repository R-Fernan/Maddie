# M.A.D.D.I.E. System Operations Manual

This document provides operational instructions for running, testing, and accessing the M.A.D.D.I.E. full-stack sandbox environment.

---

# Prerequisites
Ensure the following runtimes and services are running on your host machine:

**Node.js:** v24.15.0 or later

**Ollama:** Running locally with the maddie:latest model compiled.

## Directory Structure
```
Sandbox/
├── api/          # Express + Socket.io Backend Service
└── hud/          # React + Vite + Tailwind Frontend HUD
```
---

# Step-by-Step Launch Guide

**1. Start the Local Ollama Engine**

Ensure the local LLM server is active in a terminal window:
ollama serve

**2. Launch the Backend API
Navigate to the api directory and start the development server:**

```
cd D:\Projects\Maddie\Sandbox\api
npm run dev
```
This runs on port using this link 
```
http://localhost:5000
```

It will stream live host CPU/RAM metrics via WebSocket events every 2 seconds.

**3. Launch the Frontend HUD In a separate terminal window**

**4.then navigate to the hud directory and start the Vite dev server:**

```
cd D:\Projects\Maddie\Sandbox\hud
npm run dev
```

**Network Listener:** Bound to 0.0.0.0 (to be accessible across the local network).

---

# Accessing the Interface

**A. On Desktop (Host Machine)** 

Open any browser and navigate to:
```
http://localhost:5173
```

**B. On Mobile Devices (Local Network)**

Ensure your mobile device is connected to the same local router network as your PC (works seamlessly across Ethernet/Wi-Fi).

**Find your PC's IPv4 address:**
```
ipconfig
```

**2. Open a browser on your phone and enter:**
http://:5173

Example
```
http://192.168.1.15:5173
```

---

# Troubleshooting & Verification

## Engine Status Reads "OFFLINE": 

Verify that ollama serve is running and accessible at 
```
http://localhost:11434.
```

## Mobile Connection Times Out: 

Ensure your Windows Defender Firewall allows inbound traffic on ports `5000` and `5173`. Run this in PowerShell as `Administrator`.

If blocked:
```
New-NetFirewallRule -DisplayName "MADDIE HUD" -Direction Inbound -LocalPort 5000,5173 -Protocol TCP -Action Allow
```