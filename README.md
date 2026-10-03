# Project: M.A.D.D.I.E
(`M`y `A`dvanced `D`roid `D`evice `I`n `E`xistence)

# Preview

This project represents a long-term commitment toward building a fully functional, autonomous AI robot assistant named **M.A.D.D.I.E.** `(A.K.A. My Advanced Droid Device In Existence).`

This repository tracks the development and overall progress of the AI-Assistant, built as a private personal companion for Remuel B. Fernan, with her identity, voice, and behavior anchored directly in a local Ollama model.

---

# Current Build Status

The project is now running as a local AI assistant stack with:
1. **Custom model identity layer** using a local `Modelfile`
2. **Persona examples** stored in `data/persona-examples.json`
3. **Live backend API** in `/api` for status checks and streaming chat
4. **Frontend HUD** in `/hud` for chat + telemetry visualization
5. **Ollama model rebuild pipeline** via `npm run model:build`

To rebuild the custom Maddie model:

```bash
cd api
npm run model:build
```

This executes the project script which reads the base `Modelfile`, combines it with selected persona examples, and creates the custom model target `maddie:latest` in Ollama.

---

# Release Criteria (Production Migration)

Relocation to the official production environment will occur once all core deployment criteria are met:
1. **TTS / Voice Integration** (Text-to-Speech execution)
2. **JARVIS-like UI / Telemetry HUD** (Real-time system diagnostics & chat workspace)
3. **Refined & Enhanced Persona** (Custom fine-tuning and system prompt alignment)
4. **Memory / Persistence Layer** (Private personal memory and preference retention)
5. **Long-term Continuity** (Stable identity, context, and personal workflow retention)

---

# Additional Notes

Plans to take this project beyond just software are currently in motion. Once a solid chunk of the core criteria above is ticked off, the next evolution is integrating physical, humanoid body parts to bring her into the real world. For now, the software layer is being refined to behave like a private personal companion instead of a generic AI assistant.

---

# Development Progress

## 03 October 2026
* **Identity Hardening**: Clarified the custom persona so Maddie answers as a personal companion created by Sir, not as a generic assistant.
* **Model Rebuild Pipeline**: Verified the project rebuild path using `npm run model:build` and confirmed the custom model is generated with `maddie:latest`.
* **Persona Example Refinement**: Updated the example dataset so identity responses default to personal phrasing like "You, Sir" while deeper creator questions still reveal the formal origin.
* **Voice-first compatibility**: Kept the assistant language tuned for spoken interaction with concise, natural phrasing and no markdown-heavy output.

## 24 August 2026
* **Architecture Upgrade**: Migrated the sandbox interface from Streamlit to a fucking full-stack, real-time Node.js + React architecture.
* **Backend API (`/api`)**:
  * Implemented an Express server executing on Node.js (version 24.15) using `tsx`.
  * Added REST endpoints for engine status checks (`/api/status`) and streaming chat proxies (`/api/chat`).
  * Integrated `socket.io` and `systeminformation` to stream real-time CPU and RAM telemetry to connected clients every 2 seconds.
* **Frontend HUD (`/hud`)**:
  * Built a sleek, modern UI with React, Vite, TypeScript, and Tailwind CSS v4.
  * Added dynamic typography featuring `Inter` for general interface elements and `JetBrains Mono` for diagnostics.
  * Implemented a collapsible, responsive sidebar with system diagnostic progress bars.
  * Configured cross-device compatibility with dynamic host IP resolution (`0.0.0.0` binding), enabling access across desktop and mobile browsers over the local network.

## 16 June 2026
* Relocated usage operation from Command Prompt CLI into a web UI sandbox using `Streamlit`.
* Developed an initial prototype web interface using Streamlit.
* Configured local networking requests to communicate directly with Ollama's local engine.
* Implemented persistent session state memory for context retention during live chat.
* Formatted JSON data processing streams for smooth character-by-character typing animations.
* Successfully linked backend requests to the custom model target (`maddie:latest`).

## 15 April 2026
* Resumed active project development.
* Outlined initial physical structural concepts and hardware specs.
* Refined overarching purpose and functional roadmap.