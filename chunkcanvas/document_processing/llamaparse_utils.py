"""LlamaParse utilities for document processing in ChunkCanvas"""

from llama_parse import LlamaParse


def get_all_available_languages():
    """Return all available languages from the Language enum"""
    from llama_parse.utils import Language

    # Get all attributes from the Language enum
    all_languages = {}
    for lang in Language:
        all_languages[lang.name] = lang

    return all_languages


def get_llamaparse_params():
    """Return a dictionary of LlamaParse parameters with their types, default values, and help text"""
    return {
        "auto_mode": {
            "type": "checkbox",
            "default": True,
            "help": "When enabled, automatically selects the best parsing mode based on document content.",
        },
        "auto_mode_trigger_on_image_in_page": {
            "type": "checkbox",
            "default": True,
            "help": "Automatically use multimodal processing when images are detected in the document.",
        },
        "auto_mode_trigger_on_table_in_page": {
            "type": "checkbox",
            "default": True,
            "help": "Automatically use multimodal processing when tables are detected in the document.",
        },
        "result_type": {
            "type": "select",
            "options": ["markdown", "text"],
            "default": "text",
            "help": "Format of the parsed output. Markdown better preserves tables and document structure.",
        },
        "max_timeout": {
            "type": "number",
            "min": 1000,
            "max": 10000,
            "step": 500,
            "default": 5000,
            "help": "Maximum time in milliseconds to wait for parsing to complete.",
        },
        "split_by_page": {
            "type": "checkbox",
            "default": False,
            "help": "Whether to split the document by page or treat it as a single document.",
        },
        "page_separator": {
            "type": "text",
            "default": "\n=================\n",
            "help": "String to separate pages in the output. By default, LlamaParse will separate pages in the markdown and text output by \\n---\\n.",
        },
        "page_prefix": {
            "type": "text",
            "default": "START OF PAGE: {pageNumber}\n",
            "help": "String to prefix each page with. {pageNumber} will be replaced with the page number.",
        },
        "page_suffix": {
            "type": "text",
            "default": "\nEND OF PAGE: {pageNumber}",
            "help": "String to suffix each page with. {pageNumber} will be replaced with the page number.",
        },
        "language": {
            "type": "select",
            "options": sorted(list(get_all_available_languages().keys())),
            "default": "ENGLISH",
            "help": "Primary language of the document for better parsing accuracy.",
        },
        "parse_mode": {
            "type": "select",
            "options": [
                "parse_page_with_llm",
                "parse_page_with_lvm",
                "parse_page_with_agent",
                "parse_page_without_llm",
            ],
            "default": "parse_page_without_llm",
            "help": "The parsing mode to use for document processing.",
        },
        "vendor_multimodal_model_name": {
            "type": "select",
            "options": [
                "openai-gpt4o",
                "openai-gpt-4-1-mini",
                "anthropic-sonnet-3.7",
                "gemini-2.5-pro",
                "gemini-2.0-flash-001",
            ],
            "default": "gemini-2.0-flash-001",
            "help": "The multimodal model to use when use_vendor_multimodal_model is enabled.",
        },
        "vendor_multimodal_api_key": {
            "type": "password",
            "default": "",
            "help": "API key for the vendor multimodal model. If not provided, will try to use from environment variables.",
        },
        "skip_diagonal_text": {
            "type": "checkbox",
            "default": True,
            "help": "Whether to ignore text that appears at a diagonal in the document.",
        },
        "use_ocr": {
            "type": "checkbox",
            "default": False,
            "help": "Whether to use OCR for text extraction, useful for scanned documents.",
        },
        "process_images": {
            "type": "checkbox",
            "default": False,
            "help": "Whether to process and extract information from images in the document.",
        },
        "table_extraction_mode": {
            "type": "select",
            "options": ["all", "none", "auto"],
            "default": "none",
            "help": "Controls table extraction behavior.",
        },
        "extract_urls": {
            "type": "checkbox",
            "default": False,
            "help": "Extract all URLs found in the document.",
        },
    }