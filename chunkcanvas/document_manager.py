"""Main document management interface for ChunkCanvas"""

import streamlit as st
from langchain_core.documents import Document
from langchain_text_splitters import RecursiveCharacterTextSplitter

from chunkcanvas.config.api_keys import load_api_keys_from_env, render_api_key_inputs
from chunkcanvas.config.constants import DOCUMENT_WITH_TABLES, EXCEL_SPREADSHEET, SIMPLE_TEXT
from chunkcanvas.document_processing.file_processing import read_file_content, read_excel_file
from chunkcanvas.interface.form_handling import create_dynamic_form, render_sidebar_info
from chunkcanvas.utils.export_utils import (
    export_script_to_file,
    generate_export_script,
    generate_requirements_txt,
)
from chunkcanvas.vector_db.pinecone_ops import (
    create_new_index,
    get_pinecone_environment_options,
    get_pinecone_indexes,
    upload_splits_to_database,
)


def main():
    """Main function for the document management interface"""
    st.title("Document Management")
    st.write("Upload and manage documents for the vector database.")

    # Load API keys from environment variables
    api_keys = load_api_keys_from_env()

    # Render API key inputs in sidebar and get updated values
    api_keys = render_api_key_inputs(api_keys)

    # Get Pinecone environment options
    pinecone_env_options = get_pinecone_environment_options()
    env_display_options = {
        key: value["display"] for key, value in pinecone_env_options.items()
    }

    # API Key input in sidebar
    st.sidebar.title("Pinecone Configuration")
    api_key = st.sidebar.text_input(
        "Pinecone API Key", value=api_keys["pinecone"], type="password"
    )

    # Update the pinecone key in our api_keys dict
    api_keys["pinecone"] = api_key

    # Use a selectbox for Pinecone environment instead of text input
    selected_env = st.sidebar.selectbox(
        "Pinecone Environment",
        options=list(env_display_options.keys()),
        format_func=lambda x: env_display_options[x],
        index=(
            list(env_display_options.keys()).index(api_keys["pinecone_env"])
            if api_keys["pinecone_env"] in env_display_options
            else 0
        ),
    )

    pinecone_environment = selected_env

    # Create new index option
    create_new_index(api_key, pinecone_environment)

    # Get available indexes
    indexes_dict = get_pinecone_indexes(api_key, pinecone_environment)

    # Select target index
    if indexes_dict:
        index_options = list(indexes_dict.keys())
        index = st.selectbox(
            "Select the vector database index.",
            index_options,
            index=None,
        )
    else:
        st.warning(
            "No indexes available. Check your API key or create a new index."
        )
        index = None

    uploaded_file = st.file_uploader(
        "Upload a document to add to the database",
        accept_multiple_files=False,
        type=["pdf", "docx", "txt", "md", "xlsx"],
    )

    if uploaded_file:
        st.session_state["current_uploaded_file"] = uploaded_file

    document_type = st.selectbox(
        "Document type",
        [SIMPLE_TEXT, DOCUMENT_WITH_TABLES, EXCEL_SPREADSHEET],
        index=None,
    )

    submitted = False
    form_data = {}

    if document_type:
        # Use the dynamic form to create the UI for document processing parameters
        submitted, form_data = create_dynamic_form(document_type, api_keys)

    if submitted:
        if not uploaded_file:
            st.info("Upload a file before submitting.")
        elif not document_type:
            st.info("Select a document type before submitting.")
        else:
            st.write(f"File uploaded: {uploaded_file.name}")

            text_splitter = RecursiveCharacterTextSplitter(
                chunk_size=form_data["chunk_size"],
                chunk_overlap=form_data["chunk_overlap"],
                length_function=len,
                separators=form_data["separators"],
            )

            # Store the current index name in session state for later use
            if index:
                st.session_state["current_index"] = index

            if document_type == EXCEL_SPREADSHEET:
                doc_chunks = read_excel_file(
                    uploaded_file, form_data["column_name"], text_splitter
                )
            else:
                try:
                    content = read_file_content(uploaded_file, document_type, form_data)
                    st.text_area("Document content", content, height=500)
                except Exception as e:
                    st.error(f"Error reading file: {str(e)}")
                    st.stop()

                doc_chunks = text_splitter.create_documents(
                    [content], metadatas=[{"filename": uploaded_file.name}]
                )

            st.write(f"Number of chunks: {len(doc_chunks)}")

            # Initialize the state for edited chunks if it doesn't exist yet
            st.session_state.edited_chunks = [
                chunk.page_content for chunk in doc_chunks
            ]

    if "edited_chunks" in st.session_state:
        st.info(
            "Validate or edit the chunk contents before uploading them to the database."
        )
        for i, _ in enumerate(st.session_state.edited_chunks):
            with st.expander(f"Chunk {i+1}", expanded=True, icon=":material/segment:"):
                # Use a callback to update the state when the text is modified
                def update_chunk(i, ss_key):
                    st.session_state.edited_chunks[i] = st.session_state[ss_key]

                st.text_area(
                    f"Chunk {i+1} content",
                    value=st.session_state.edited_chunks[i],
                    height=250,
                    key=f"chunk_{i}",
                    on_change=update_chunk,
                    args=(i, f"chunk_{i}"),
                )

        # Check if an index is currently selected
        current_index = None
        if index:
            current_index = index
        elif "current_index" in st.session_state:
            current_index = st.session_state["current_index"]

        # Allow users to select an index if not already selected
        if not current_index and indexes_dict:
            st.warning("Select an index for uploading chunks to the database.")
            upload_index = st.selectbox(
                "Select index for upload",
                options=list(indexes_dict.keys()),
                key="upload_index_select"
            )
            current_index = upload_index

        def upload_edited_chunks():
            # Check if an index is selected
            if not current_index:
                st.error("Select an index before uploading chunks to the database.")
                return

            # Create new Document objects with the edited content
            edited_doc_chunks = [
                Document(
                    page_content=content, metadata={"filename": uploaded_file.name}
                )
                for content in st.session_state.edited_chunks
            ]
            
            upload_splits_to_database(
                edited_doc_chunks,
                api_key,
                pinecone_environment,
                indexes_dict[current_index],
                api_keys["voyage"],
            )
            
            # Clean up session state
            del st.session_state.edited_chunks
            if "current_index" in st.session_state:
                del st.session_state["current_index"]
            for ss_key in list(st.session_state.keys()):
                if ss_key.startswith("chunk_"):
                    del st.session_state[ss_key]

        upload_button_disabled = current_index is None
        
        # Create a column layout for the buttons
        col1, col2 = st.columns(2)
        
        with col1:
            st.button(
                "Upload chunks to database",
                on_click=lambda: upload_edited_chunks(),
                use_container_width=True,
                type="primary",
                icon=":material/cloud_upload:",
                disabled=upload_button_disabled
            )
        
        with col2:
            # Add export script button
            if current_index and document_type and form_data:
                if st.button(
                    "Export Script",
                    use_container_width=True,
                    type="secondary",
                    icon=":material/code:"
                ):
                    # Generate script content
                    script_content = generate_export_script(
                        form_data, api_keys, document_type, pinecone_environment, indexes_dict[current_index]
                    )
                    script_bytes, script_filename = export_script_to_file(script_content)
                    
                    # Generate requirements.txt content
                    requirements_content = generate_requirements_txt(document_type)
                    requirements_bytes = requirements_content.encode()
                    
                    # Create columns for download buttons
                    dcol1, dcol2 = st.columns(2)
                    
                    with dcol1:
                        st.download_button(
                            label="Download Python Script",
                            data=script_bytes,
                            file_name=script_filename,
                            mime="text/x-python",
                            use_container_width=True
                        )
                    
                    with dcol2:
                        st.download_button(
                            label="Download requirements.txt",
                            data=requirements_bytes,
                            file_name="requirements.txt",
                            mime="text/plain",
                            use_container_width=True
                        )
        
        if upload_button_disabled:
            st.error("An index must be selected before uploading to the database.")

    # Add export script button in main interface
    if form_data and document_type and pinecone_environment and index:
        if st.button("Export Script", use_container_width=True, type="secondary"):
            script_content = generate_export_script(
                form_data, api_keys, document_type, pinecone_environment, indexes_dict[index]
            )
            script_bytes, script_filename = export_script_to_file(script_content)
            st.download_button(
                label="Download Exported Script",
                data=script_bytes,
                file_name=script_filename,
                mime="text/x-python",
            )

            # Generate and download requirements.txt
            requirements_content = generate_requirements_txt(document_type)
            requirements_bytes = requirements_content.encode()
            st.download_button(
                label="Download requirements.txt",
                data=requirements_bytes,
                file_name="requirements.txt",
                mime="text/plain",
            )

    # Render sidebar information
    render_sidebar_info()