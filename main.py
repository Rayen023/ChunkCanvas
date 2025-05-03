import os
import sys
from importlib import import_module

import streamlit as st
from chunkcanvas.document_manager import main as document_manager_main

# Configure the page first, before any other Streamlit command
st.set_page_config(
    page_title="ChunkCanvas",
    # page_icon="🧩",
    layout="wide",
    initial_sidebar_state="expanded",
)


def main():
    st.sidebar.title("ChunkCanvas")

    # Display the document management page
    document_manager_main()


if __name__ == "__main__":
    main()
