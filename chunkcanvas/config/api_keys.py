"""API key management for ChunkCanvas"""

import os
import streamlit as st
from dotenv import load_dotenv

# Load environment variables
load_dotenv()


def load_api_keys_from_env():
    """Load API keys from environment variables if available"""
    # Dictionary to store all found API keys
    api_keys = {}

    # Essential keys with defaults (Pinecone needs a default environment)
    api_keys["pinecone"] = os.environ.get("PINECONE_API_KEY", "")
    api_keys["pinecone_env"] = os.environ.get("PINECONE_ENVIRONMENT", "aws-us-east-1")
    api_keys["voyage"] = os.environ.get("VOYAGEAI_API_KEY", "")
    api_keys["llama"] = os.environ.get("LLAMA_CLOUD_API_KEY", "")
    api_keys["openai"] = os.environ.get("OPENAI_API_KEY", "")
    api_keys["anthropic"] = os.environ.get("ANTHROPIC_API_KEY", "")
    api_keys["google"] = os.environ.get("GOOGLE_API_KEY", "")

    return api_keys


def render_api_key_inputs(api_keys):
    """Render API key inputs in the sidebar"""
    st.sidebar.title("API Keys")

    updated_keys = api_keys.copy()

    # API keys for various services
    updated_keys["voyage"] = st.sidebar.text_input(
        "VoyageAI API Key", value=api_keys["voyage"], type="password"
    )

    updated_keys["llama"] = st.sidebar.text_input(
        "Llama Cloud API Key", value=api_keys["llama"], type="password"
    )

    updated_keys["openai"] = st.sidebar.text_input(
        "OpenAI API Key", value=api_keys["openai"], type="password"
    )

    updated_keys["anthropic"] = st.sidebar.text_input(
        "Anthropic API Key", value=api_keys["anthropic"], type="password"
    )

    updated_keys["google"] = st.sidebar.text_input(
        "Google API Key", value=api_keys["google"], type="password"
    )

    return updated_keys


def get_vendor_api_key_for_model(model_name, api_keys):
    """Get the appropriate vendor API key based on the selected model"""
    if model_name.startswith("openai"):
        return api_keys["openai"]
    elif model_name.startswith("anthropic"):
        return api_keys["anthropic"]
    elif model_name.startswith("gemini"):
        return api_keys["google"]
    return ""