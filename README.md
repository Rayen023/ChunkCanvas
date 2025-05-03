# ChunkCanvas

ChunkCanvas is a document processing interface built with Streamlit that facilitates the conversion of various document formats into vector embeddings for prototyping RAG applications.

## Overview

ChunkCanvas offers a straightforward workflow for:
1. Document parsing with specific handlers for different file types
2. Text chunking using LangChain's RecursiveCharacterTextSplitter
3. Embedding generation with VoyageAI
4. Vector storage in Pinecone indexes

Available at: [chunkcanvas.streamlit.app](https://chunkcanvas.streamlit.app)

## Features

- **Document Processing**:
  - Simple text files: TXT (using standard Python), PDF (PyPDF2), DOCX (docx2txt), MD (markdown)
  - Excel spreadsheets: XLS/XLSX (pandas)
  - Complex documents with tables or images: LlamaParse
- **Chunking**: Text segmentation with configurable parameters
- **Vector Database**: Basic Pinecone index creation and document upload with metadata
- **Utility Functions**: Script export for batch processing after selecting parameters, allowing fast reproduction for multiple documents locally

## Requirements

- Python 3.11+
- Pinecone API key
- VoyageAI API key
- LlamaParse API key (for documents with images/tables)

## Installation

```bash
git clone https://github.com/Rayen023/chunkcanvas.git
cd chunkcanvas
pip install -r requirements.txt
```

## Usage

```bash
streamlit run main.py
```

## Technical Stack

- **Interface**: Streamlit
- **Document Processing**:
  - Text: PyPDF2 (PDF), docx2txt (DOCX), markdown (MD)
  - Spreadsheets: pandas (XLS/XLSX)
  - Rich documents: LlamaParse
- **Chunking**: LangChain RecursiveCharacterTextSplitter
- **Embeddings**: VoyageAI
- **Vector Storage**: Pinecone

## Environment Variables

Required API keys:

```
PINECONE_API_KEY=your_pinecone_api_key
PINECONE_ENVIRONMENT=aws-us-east-1
VOYAGEAI_API_KEY=your_voyage_api_key
LLAMA_CLOUD_API_KEY=your_llama_cloud_api_key
```

## Contributing

Feedback and contributions welcome.
