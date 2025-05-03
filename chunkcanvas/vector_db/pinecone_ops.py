"""Pinecone vector database operations for ChunkCanvas"""

import streamlit as st
from pinecone import Pinecone, ServerlessSpec
from langchain_core.documents import Document
from langchain_pinecone import PineconeVectorStore
from langchain_voyageai import VoyageAIEmbeddings


def get_pinecone_environment_options():
    """Return a dictionary of Pinecone environment options with cloud and region details"""
    return {
        "aws-us-east-1": {
            "display": "AWS - US East (Virginia) - Starter, Standard, Enterprise",
            "cloud": "aws",
            "region": "us-east-1",
        },
        "aws-us-west-2": {
            "display": "AWS - US West (Oregon) - Standard, Enterprise",
            "cloud": "aws",
            "region": "us-west-2",
        },
        "aws-eu-west-1": {
            "display": "AWS - EU West (Ireland) - Standard, Enterprise",
            "cloud": "aws",
            "region": "eu-west-1",
        },
        "gcp-us-central1": {
            "display": "GCP - US Central (Iowa) - Standard, Enterprise",
            "cloud": "gcp",
            "region": "us-central1",
        },
        "gcp-europe-west4": {
            "display": "GCP - Europe West (Netherlands) - Standard, Enterprise",
            "cloud": "gcp",
            "region": "europe-west4",
        },
        "azure-eastus2": {
            "display": "Azure - East US 2 (Virginia) - Standard, Enterprise",
            "cloud": "azure",
            "region": "eastus2",
        },
    }


def get_pinecone_indexes(api_key, pinecone_environment):
    """Get available Pinecone indexes"""
    if not api_key:
        st.sidebar.warning("Enter a Pinecone API key")
        return {}

    try:
        pc = Pinecone(api_key=api_key, environment=pinecone_environment)
        indexes = pc.list_indexes().names()
        index_dict = {idx: idx for idx in indexes}
        return index_dict
    except Exception as e:
        st.sidebar.error(f"Error connecting to Pinecone: {str(e)}")
        return {}


def create_new_index(api_key, pinecone_environment):
    """UI for creating a new Pinecone index"""
    with st.sidebar.expander("Create New Index"):
        new_index_name = st.text_input("New index name")
        dimension = st.number_input("Vector dimension", value=1024, step=1)
        metric = st.selectbox("Distance metric", ["cosine", "euclidean", "dotproduct"])

        # Get cloud and region from selected environment
        pinecone_env_options = get_pinecone_environment_options()
        cloud = pinecone_env_options[pinecone_environment]["cloud"]
        region = pinecone_env_options[pinecone_environment]["region"]

        if st.button("Create Index"):
            if not api_key or not new_index_name:
                st.error("API key and index name are required")
                return

            try:
                pc = Pinecone(api_key=api_key, environment=pinecone_environment)
                pc.create_index(
                    name=new_index_name,
                    dimension=dimension,
                    metric=metric,
                    spec=ServerlessSpec(cloud=cloud, region=region),
                )
                st.success(f"Index '{new_index_name}' created successfully!")
                st.rerun()
            except Exception as e:
                st.error(f"Error creating index: {str(e)}")


def upload_splits_to_database(
    doc_chunks, api_key, pinecone_env, index_name, voyage_api_key=None
):
    """Upload document chunks to Pinecone database"""
    status = st.status("Uploading chunks to Pinecone database...", expanded=True)
    with status:
        pc = Pinecone(api_key=api_key, environment=pinecone_env)

        # Use environment variable for VoyageAI if available
        embeddings = VoyageAIEmbeddings(model="voyage-3", api_key=voyage_api_key)

        vectorstore = PineconeVectorStore(
            index_name=index_name,
            embedding=embeddings,
        )

        vectorstore.add_documents(doc_chunks)
        status.success(f"Chunks successfully uploaded to index: {index_name}.")