from pydantic import BaseModel, Field
from enum import Enum
from typing import Optional
import uuid

class PIIType(str, Enum):
    NAME     = "NAME"
    PHONE    = "PHONE"
    EMAIL    = "EMAIL"
    ADDRESS  = "ADDRESS"
    DATE     = "DATE"
    ID       = "ID"
    PAN      = "PAN"
    AADHAAR  = "AADHAAR"
    IP       = "IP"
    CUSTOM   = "CUSTOM"     # user manually added

class DetectionStatus(str, Enum):
    REDACTED       = "redacted"         # tool flagged, high confidence, accepted
    MISSED         = "missed"           # tool missed, needs user action
    FALSE_POSITIVE = "false_positive"   # tool over-flagged, user can dismiss
    FLAGGED        = "flagged"          # user saved for later review
    ADDED          = "added"            # user manually added
    DISMISSED      = "dismissed"        # user confirmed: not PII

class FileStatus(str, Enum):
    PENDING    = "pending"
    PROCESSING = "processing"
    READY      = "ready"
    ERROR      = "error"

class Detection(BaseModel):
    id:         str   = Field(default_factory=lambda: str(uuid.uuid4()))
    text:       str
    char_start: int
    char_end:   int
    type:       PIIType
    confidence: float               # 0.0 – 1.0
    status:     DetectionStatus
    reason:     str                 # human-readable explanation

class StructureNode(BaseModel):
    char_start: int
    char_end:   int
    text:       str
    para_idx:   Optional[int]   = None   # DOCX
    run_idx:    Optional[int]   = None   # DOCX
    page_num:   Optional[int]   = None   # PDF
    bbox:       Optional[tuple] = None   # PDF: (x0, y0, x1, y1)

class DocumentRecord(BaseModel):
    doc_id:     str = Field(default_factory=lambda: str(uuid.uuid4()))
    filename:   str
    file_type:  str                      # "docx" | "pdf" | "txt"
    status:     FileStatus
    plain_text: str = ""
    char_count: int = 0

class UploadResponse(BaseModel):
    documents: list[DocumentRecord]

class DocumentResponse(BaseModel):
    doc_id:     str
    filename:   str
    plain_text: str
    structure:  list[StructureNode]
    detections: list[Detection]

class CorrectionRequest(BaseModel):
    status: DetectionStatus

class AddDetectionRequest(BaseModel):
    text:       str
    char_start: int
    char_end:   int
    type:       PIIType
    reason:     str = "Manually added by user"

class ExportRequest(BaseModel):
    format:               str              # "txt" | "docx" | "pdf"
    confirmed_detections: list[Detection]
