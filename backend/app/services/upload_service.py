from fastapi import HTTPException, status
import os

# Maximum file upload limit: 10 Megabytes
MAX_FILE_SIZE = 10 * 1024 * 1024

# Allowed configurations mapping extensions to MIME types
ALLOWED_EXTENSIONS_MAP = {
    ".pdf": "application/pdf",
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".dcm": "application/dicom"  # DICOM file format
}

def validate_file_security(filename: str, content_type: str, file_size: int) -> str:
    """
    Validates file extensions, content types, and size server-side to prevent malicious uploads.
    Returns the parsed file category ('reports' for PDF, 'images' for others).
    """
    # 1. Validate File Size
    if file_size > MAX_FILE_SIZE:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"File exceeds maximum allowed size of 10MB (file size: {file_size} bytes)"
        )

    # 2. Validate Extension & Content Type
    _, ext = os.path.splitext(filename.lower())
    if ext not in ALLOWED_EXTENSIONS_MAP:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"File extension '{ext}' is not supported. Supported: PDF, PNG, JPG, JPEG, DCM"
        )
        
    expected_mime = ALLOWED_EXTENSIONS_MAP[ext]
    
    # Allow application/octet-stream for DICOM files, since raw binaries may lack correct content type headers
    if ext == ".dcm" and content_type == "application/octet-stream":
        pass
    elif content_type != expected_mime:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"MIME type '{content_type}' does not match file extension '{ext}'"
        )

    # Return category folder for storage scoping
    if ext == ".pdf":
        return "reports"
    return "images"

def run_virus_scan(file_bytes: bytes) -> bool:
    """
    Placeholder hook for virus-scanning uploaded streams before committing to GCS.
    
    TODO: Integrate with ClamAV network daemon or an API scanning service.
    """
    # Dummy implementation returns True (safe)
    return True
