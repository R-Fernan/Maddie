import streamlit as st
import requests
import json

#Part 1: Setting up web page title and description
st.set_page_config(page_title="Maddie AI", layout="centered")
st.title("M.A.D.D.I.E - AI Assistant")
st.caption("Running locally via Ollama (maddie:latest)")

if "messages" not in st.session_state:
    st.session_state.messages = []

for message in st.session_state.messages:
    with st.chat_message(message["role"]):
        st.write(message["content"])

if user_input := st.chat_input("Chat ka lang fards..."):
    with st.chat_message("user"):
        st.write(user_input)

    st.session_state.messages.append({"role": "user", "content": user_input})

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
                 
        except requests.exceptions.ConnectionError:
            st.error("Could not connect to Ollama. Make sure Ollama is running ('ollama serve').")       






