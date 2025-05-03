"""Form handling for ChunkCanvas interface"""

import pandas as pd
import streamlit as st

from chunkcanvas.config.constants import DOCUMENT_WITH_TABLES, EXCEL_SPREADSHEET
from chunkcanvas.config.api_keys import get_vendor_api_key_for_model
from chunkcanvas.document_processing.llamaparse_utils import get_llamaparse_params


def create_dynamic_form(doc_type, api_keys=None):
    """Create a dynamic interface based on document type"""
    # Initialize form_data dictionary to store all parameters
    form_data = {}

    col1, col2 = st.columns(2)

    with col1:
        separators_input = st.text_input(
            "Separators (comma separated, first ones being higher priority)",
            "---, /n, .",
            help="List of separators separated by commas, sorted by priority (first ones being higher priority), used to segment the document into chunks if its length exceeds the chunk size.",
        )
        separators = [s.strip() for s in separators_input.split(",")]
        st.write("Separators:", separators)

    with col2:
        chunk_size = st.number_input(
            "Chunk size (characters)",
            value=4096,
            step=128,
            help="The maximum number of characters in each chunk, values between 1024 and 4096 are recommended.",
        )
        chunk_overlap = st.number_input(
            "Chunk overlap",
            value=50,
            step=5,
            help="The number of characters to overlap between chunks",
        )

    form_data = {
        "separators": separators,
        "chunk_size": chunk_size,
        "chunk_overlap": chunk_overlap,
    }

    if doc_type == DOCUMENT_WITH_TABLES:
        st.subheader("Document Processing Parameters")
        st.info("For detailed information about these parameters, refer to the [LlamaParse documentation](https://docs.cloud.llamaindex.ai/llamaparse/features/parsing_options)")

        llamaparse_params = get_llamaparse_params()
        parser_params = {}
        
        # Auto mode selection - comes first as it affects other UI elements
        auto_mode = st.checkbox(
            "Auto Mode",
            value=llamaparse_params["auto_mode"]["default"],
            help=llamaparse_params["auto_mode"]["help"],
            key="param_auto_mode"
        )
        parser_params["auto_mode"] = auto_mode
        
        # Only show parse mode if auto_mode is disabled
        if not auto_mode:
            parse_mode_param = llamaparse_params["parse_mode"]
            parse_mode = st.selectbox(
                "Parse Mode",
                options=parse_mode_param["options"],
                index=(
                    parse_mode_param["options"].index(parse_mode_param["default"])
                    if parse_mode_param["default"] in parse_mode_param["options"]
                    else 0
                ),
                help=parse_mode_param["help"],
                key="parse_mode_selectbox",
            )
            parser_params["parse_mode"] = parse_mode
        else:
            # Set a default parse mode when in auto mode
            parse_mode = "parse_page_without_llm"
            parser_params["parse_mode"] = parse_mode

        # Check if parse mode is without LLM or if we're using multimodal
        is_without_llm = parse_mode != "parse_page_with_lvm"
        
        # Auto mode trigger options - show only when auto_mode is enabled
        if auto_mode:
            st.subheader("Auto Mode Triggers")
            col1, col2 = st.columns(2)
            
            with col1:
                trigger_on_image = st.checkbox(
                    "Trigger On Image",
                    value=llamaparse_params["auto_mode_trigger_on_image_in_page"]["default"],
                    help=llamaparse_params["auto_mode_trigger_on_image_in_page"]["help"],
                    key="param_auto_mode_trigger_on_image"
                )
                parser_params["auto_mode_trigger_on_image_in_page"] = trigger_on_image
                
            with col2:
                trigger_on_table = st.checkbox(
                    "Trigger On Table",
                    value=llamaparse_params["auto_mode_trigger_on_table_in_page"]["default"],
                    help=llamaparse_params["auto_mode_trigger_on_table_in_page"]["help"],
                    key="param_auto_mode_trigger_on_table"
                )
                parser_params["auto_mode_trigger_on_table_in_page"] = trigger_on_table

        # Organize remaining parameters in a more structured way
        st.subheader("Document Parsing Options")
        
        # Group parameters by category for better organization
        general_params = ["result_type", "max_timeout", "split_by_page", "language"]
        extraction_params = ["skip_diagonal_text", "use_ocr", "process_images", "table_extraction_mode", "extract_urls"]
        page_format_params = ["page_separator", "page_prefix", "page_suffix"]  # New group for page formatting options
        
        # Only show multimodal parameters when parse mode is with_lvm
        multimodal_params = []
        if not is_without_llm:
            multimodal_params = ["vendor_multimodal_model_name", "vendor_multimodal_api_key"]
        
        # Display general parameters
        st.write("**General Settings**")
        cols = st.columns(2)
        for i, param_name in enumerate(general_params):
            if param_name in llamaparse_params:
                param_config = llamaparse_params[param_name]
                col_idx = i % 2
                
                if param_config["type"] == "select":
                    parser_params[param_name] = cols[col_idx].selectbox(
                        param_name.replace("_", " ").title(),
                        options=param_config["options"],
                        index=(
                            param_config["options"].index(param_config["default"])
                            if param_config["default"] in param_config["options"]
                            else 0
                        ),
                        help=param_config["help"],
                        key=f"param_{param_name}",
                    )
                elif param_config["type"] == "number":
                    parser_params[param_name] = cols[col_idx].number_input(
                        param_name.replace("_", " ").title(),
                        min_value=param_config.get("min", 0),
                        max_value=param_config.get("max", 100000),
                        value=param_config["default"],
                        step=param_config.get("step", 1),
                        help=param_config["help"],
                        key=f"param_{param_name}",
                    )
                elif param_config["type"] == "checkbox":
                    parser_params[param_name] = cols[col_idx].checkbox(
                        param_name.replace("_", " ").title(),
                        value=param_config["default"],
                        help=param_config["help"],
                        key=f"param_{param_name}",
                    )
        
        # Display page formatting parameters
        st.write("**Page Formatting Options**")
        cols = st.columns(2)
        for i, param_name in enumerate(page_format_params):
            if param_name in llamaparse_params:
                param_config = llamaparse_params[param_name]
                col_idx = i % 2
                
                if param_config["type"] == "text":
                    parser_params[param_name] = cols[col_idx].text_input(
                        param_name.replace("_", " ").title(),
                        value=param_config["default"],
                        help=param_config["help"],
                        key=f"param_{param_name}",
                    )
        
        # Display extraction parameters
        st.write("**Extraction Settings**")
        cols = st.columns(2)
        for i, param_name in enumerate(extraction_params):
            if param_name in llamaparse_params:
                param_config = llamaparse_params[param_name]
                col_idx = i % 2
                
                if param_config["type"] == "select":
                    parser_params[param_name] = cols[col_idx].selectbox(
                        param_name.replace("_", " ").title(),
                        options=param_config["options"],
                        index=(
                            param_config["options"].index(param_config["default"])
                            if param_config["default"] in param_config["options"]
                            else 0
                        ),
                        help=param_config["help"],
                        key=f"param_{param_name}",
                    )
                elif param_config["type"] == "checkbox":
                    parser_params[param_name] = cols[col_idx].checkbox(
                        param_name.replace("_", " ").title(),
                        value=param_config["default"],
                        help=param_config["help"],
                        key=f"param_{param_name}",
                    )
        
        # Display multimodal parameters if needed
        if multimodal_params:
            st.write("**Multimodal Settings**")
            cols = st.columns(2)
            
            # Handle multimodal model name
            if "vendor_multimodal_model_name" in multimodal_params:
                param_config = llamaparse_params["vendor_multimodal_model_name"]
                parser_params["vendor_multimodal_model_name"] = cols[0].selectbox(
                    "Multimodal Model",
                    options=param_config["options"],
                    index=(
                        param_config["options"].index(param_config["default"])
                        if param_config["default"] in param_config["options"]
                        else 0
                    ),
                    help=param_config["help"],
                    key="param_vendor_multimodal_model_name",
                )
                
                # Auto-select API key based on model selection
                selected_model = parser_params["vendor_multimodal_model_name"]
                api_key = get_vendor_api_key_for_model(selected_model, api_keys)
                if api_key:
                    parser_params["vendor_multimodal_api_key"] = api_key
                    cols[0].success(f"Using API key for {selected_model}")
                else:
                    # Show API key input if not already set by model selection
                    param_config = llamaparse_params["vendor_multimodal_api_key"]
                    parser_params["vendor_multimodal_api_key"] = cols[1].text_input(
                        "API Key",
                        value="",
                        type="password",
                        help=param_config["help"],
                        key="param_vendor_multimodal_api_key",
                    )
            
        language_option = parser_params.pop("language", "English")
        parser_params["language"] = language_option  # Store original string value for form_data

        # API key info only for multimodal processing
        if not is_without_llm:
            st.info(
                "Multimodal processing requires an API key. Make sure you've set the appropriate API keys in your environment variables."
            )

        # Add parser parameters to form_data
        form_data.update(parser_params)

    elif doc_type == EXCEL_SPREADSHEET:
        # Get uploaded file context from session state if available
        uploaded_file = st.session_state.get("current_uploaded_file", None)
        if uploaded_file:
            try:
                df = pd.read_excel(uploaded_file)
                st.subheader("Excel Analysis Parameters")
                column_name = st.selectbox(
                    "Column name",
                    df.columns,
                    help="The column where each row is considered as a unique segment of the file.",
                    key="excel_column_name",
                )
                form_data["column_name"] = column_name
            except Exception as e:
                st.error(f"Error reading Excel file: {str(e)}")
        else:
            st.warning("Please upload an Excel file first.")

    # Add a submit button outside the form
    submitted = st.button(
        "Process Document",
        use_container_width=True,
        key=f"submit_button_{doc_type}",
    )

    return submitted, form_data


def render_sidebar_info():
    """Render information about the application in the sidebar"""
    st.sidebar.info(
        """
    This interface allows you to parse documents, apply chunking, create embeddings for each chunk then  chunk+embeddings to the desired index in the vector database.
    The process is as follows:

    1. Select a document type (simple text, documents with tables or images, or Excel file)
    2. Upload the document
    3. Configure the document processing and chunking parameters
    4. View the uploaded document content converted to text, as well as the chunks generated from it
    5. Validate the chunks or make changes to the desired chunks if there are formatting or extraction issues
    6. Select or create new index
    7. Upload the chunks to the vector database
    """
    )