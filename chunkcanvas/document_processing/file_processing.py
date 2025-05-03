"""Document processing utilities for ChunkCanvas"""

import os
import tempfile

import docx2txt
import pandas as pd
import PyPDF2
import streamlit as st
from langchain_core.documents import Document
from langchain_text_splitters import RecursiveCharacterTextSplitter
from llama_parse import LlamaParse

from chunkcanvas.config.constants import DOCUMENT_WITH_TABLES, EXCEL_SPREADSHEET, SIMPLE_TEXT
from chunkcanvas.document_processing.llamaparse_utils import get_all_available_languages, get_llamaparse_params


def read_file_content(file, document_type, form_data):
    """Extract text content from various file types"""
    file_extension = file.name.split(".")[-1].lower()

    if document_type == SIMPLE_TEXT:
        if file_extension == "pdf":
            pdf_reader = PyPDF2.PdfReader(file)
            return "\n".join(page.extract_text() for page in pdf_reader.pages)
        elif file_extension == "docx":
            return docx2txt.process(file)
        elif file_extension in ["txt", "md"]:
            return file.getvalue().decode("utf-8")
        else:
            st.error(f"Unsupported file type: .{file_extension}")
            return None
    else:
        # Create a mapping for language options to Language enum
        languages_dict = get_all_available_languages()

        # Prepare kwargs for LlamaParse
        parser_kwargs = {}

        # Handle the mutually exclusive parsing modes
        is_auto_mode = form_data.get("auto_mode", True)
        
        # Copy all parameters except parse_mode if auto_mode is True
        llamaparse_params = get_llamaparse_params()
        for param_name in llamaparse_params:
            # Skip parse_mode if auto_mode is enabled to avoid conflicts
            if param_name == "parse_mode" and is_auto_mode:
                continue
                
            if param_name in form_data:
                if param_name == "language":
                    if form_data[param_name] in languages_dict:
                        parser_kwargs[param_name] = languages_dict[
                            form_data[param_name]
                        ]
                else:
                    parser_kwargs[param_name] = form_data[param_name]

        parser_kwargs["api_key"] = os.environ.get("LLAMA_CLOUD_API_KEY", None)
        
        st.write("LlamaParse parameters:", parser_kwargs)  # Debug: Show what parameters are being passed

        parser = LlamaParse(
            verbose=True,
            **parser_kwargs,
        )

        with tempfile.NamedTemporaryFile(
            delete=False, suffix="." + file_extension
        ) as temp_file:
            temp_file.write(file.getvalue())
            temp_file_path = temp_file.name

        try:
            with st.spinner("Processing and segmenting document..."):
                parsed_document = parser.load_data(temp_file_path)
                #result = parser.parse(temp_file_path)
        finally:
            os.unlink(temp_file_path)
        
        return parsed_document[0].text


def read_excel_file(uploaded_file, column_name, text_splitter):
    """Read and process Excel spreadsheets"""
    df = pd.read_excel(uploaded_file)
    rows = df[column_name].tolist()
    doc_chunks = []
    for row in rows:
        chunks = text_splitter.create_documents(
            [str(row)], metadatas=[{"filename": uploaded_file.name}]
        )
        doc_chunks.extend(chunks)
    return doc_chunks