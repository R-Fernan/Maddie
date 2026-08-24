import streamlit as st
import requests
import json
import os
import psutil

# ---------------------------------------------------------
# Part 1: Page Configuration & Monochromatic CSS HUD
# ---------------------------------------------------------
st.set_page_config(page_title="M.A.D.D.I.E. OS", page_icon="🔲", layout="wide")

# Custom Dark HUD Styling
st.markdown("""
<style>
    /* Dark Obsidian Background */
    .stApp {
        background-color: #090A0C;
        color: #E0E2E5;
        font-family: 'Courier New', monospace;
    }
    
    /* Panel Cards (Glassmorphism effect) */
    div[data-testid="stVerticalBlock"] > div[style*="flex"] {
        background-color: #12151A;
        border: 1px solid #2A2F3D;
        border-radius: 8px;
        padding: 15px;
    }

    /* Input Box Styling */
    .stTextInput input {
        background-color: #12151A !important;
        color: #FFFFFF !important;
        border: 1px solid #2A2F3D !important;
        border-radius: 6px;
    }

    /* Accent Headers */
    h1, h2, h3 {
        color: #FFFFFF !important;
        letter-spacing: 1.5px;
    }

    /* Custom Scrollbar */
    ::-webkit-scrollbar {
        width: 6px;
        background: #090A0C;
    }
    ::-webkit-scrollbar-thumb {
        background: #2A2F3D;
        border-radius: 3px;
    }
</style>
""")

# ---------------------------------------------------------
# Part 2: Session Memory Initialization
# ---------------------------------------------------------
if "messages" not in st.session_state:
    st.session_state.messages = []

# Helper function to measure Ollama connectivity
def check_engine_status():
    try:
        req = requests.get("http://localhost:11434/", timeout=1)
        return "ONLINE [11434]" if req.status_code == 200 else "OFFLINE"
    except Exception:
        return "OFFLINE"

# ---------------------------------------------------------
# Part 3: Dual Column HUD Layout
# ---------------------------------------------------------
left_col, right_col = st.columns([1, 2.2], gap="large")

# =========================================================
# LEFT PANEL: AI STATUS & SYSTEM DIAGNOSTICS
# =========================================================
with left_col:
    st.title("M.A.D.D.I.E.")
    st.caption("OS HUD TERMINAL v1.0")
    st.divider()

    # Avatar Display
    image_filename = "maddie_face.png"
    if os.path.exists(image_filename):
        st.image(image_filename, use_column_width=True)
    else:
        st.markdown("""
        <div style="border: 1px dashed #2A2F3D; padding: 40px; text-align: center; color: #6C757D;">
            [ PERSONA CORE OFFLINE ]<br><small>Place 'maddie_face.png' in directory</small>
        </div>
        """, unsafe_allow_html=True)
    
    st.divider()

    # Live Engine Telemetry
    st.subheader("SYSTEM STATUS")
    engine_state = check_engine_status()
    
    if "ONLINE" in engine_state:
        st.success(f"ENGINE: {engine_state}")
    else:
        st.error(f"ENGINE: {engine_state}")

    st.text("MODEL: maddie:latest")
    st.text("BASE : Gemma 2 (2B)")
    
    st.divider()

    # System Metrics (Host PC Diagnostics)
    st.subheader("HOST TELEMETRY")
    cpu_usage = psutil.cpu_percent()
    ram_usage = psutil.virtual_memory().percent

    st.text(f"CPU LOAD: {cpu_usage}%")
    st.progress(cpu_usage / 100)

    st.text(f"RAM ALLOCATION: {ram_usage}%")
    st.progress(ram_usage / 100)

    # Context Buffer Estimate
    total_tokens = sum(len(m["content"].split()) for m in st.session_state.messages)
    st.text(f"CONTEXT BUFFER: ~{total_tokens} words")


# =========================================================
# RIGHT PANEL: NEURAL CHAT INTERACTION
# =========================================================
with right_col:
    st.subheader("NEURAL WORKSPACE")
    
    # Active Conversation History
    chat_container = st.container(height=480)
    with chat_container:
        for message in st.session_state.messages:
            with st.chat_message(message["role"]):
                st.write(message["content"])

    # Quick Trigger Action Buttons
    st.caption("QUICK COMMAND TRIGGERS")
    q_col1, q_col2, q_col3 = st.columns(3)
    
    preset_input = None
    if q_col1.button("⚡ Debug Code"):
        preset_input = "Please review my current code and help me debug any potential errors."
    if q_col2.button("📝 Summarize"):
        preset_input = "Can you summarize our current discussion into bullet points?"
    if q_col3.button("🔍 Explain Concept"):
        preset_input = "Explain a complex technical concept in clear, simple terms."

    # ---------------------------------------------------------
    # CHAT INPUT PROMPT (HIGHLIGHTED PLACEHOLDER)
    # ---------------------------------------------------------
    
    # =========================================================
    # [CUSTOMIZABLE INPUT PROMPT PLACEHOLDER]
    # Change string value below when setting up randomizers.
    # =========================================================
    
    DEFAULT_INPUT_PLACEHOLDER = "Magtanong lang..."
    
    # =========================================================

    # Input execution engine
    user_input = st.chat_input(DEFAULT_INPUT_PLACEHOLDER)

    # Override input if a quick action trigger button was clicked
    if preset_input and not user_input:
        user_input = preset_input

    if user_input:
        # Append User Input
        st.session_state.messages.append({"role": "user", "content": user_input})
        with chat_container:
            with st.chat_message("user"):
                st.write(user_input)

            # Generate Assistant Response
            with st.chat_message("assistant"):
                response_placeholder = st.empty()
                full_response = ""

                try:
                    url = "http://localhost:11434/api/chat"
                    payload = {
                        "model": "maddie:latest",
                        "messages": st.session_state.messages,
                        "stream": True
                    }

                    response = requests.post(url, json=payload, stream=True)

                    for line in response.iter_lines():
                        if line:
                            chunk = json.loads(line.decode("utf-8"))
                            token = chunk.get("message", {}).get("content", "")
                            full_response += token
                            response_placeholder.markdown(full_response + "▌")
                    
                    response_placeholder.markdown(full_response)
                    st.session_state.messages.append({"role": "assistant", "content": full_response})
                    st.rerun()

                except requests.exceptions.ConnectionError:
                    st.error("Could not connect to Ollama server.")