import re
from collections import Counter
from pathlib import Path

from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from docx import Document
from pypdf import PdfReader
from io import BytesIO

app = FastAPI(title="AI Resume Reviewer API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Restrict this to the frontend URL before deployment.
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

STOP_WORDS = set("""
the and for with from that this your you are was were will have has
had our their they them into over under about using use used can may
must should job role work team experience skills responsible including
such through across more than all who what how where when why a an of
to in on at as by or is be it we i
""".split())

ACTION_WORDS = {
    "built", "developed", "designed", "implemented", "created",
    "led", "improved", "automated", "analyzed", "optimized",
    "delivered", "launched", "deployed", "programmed", "managed",
    "engineered", "tested", "integrated",
}


def extract_text(filename: str, content: bytes) -> str:
    extension = Path(filename).suffix.lower()

    try:
        if extension == ".pdf":
            reader = PdfReader(BytesIO(content))
            return "\n".join(page.extract_text() or "" for page in reader.pages)

        if extension == ".docx":
            document = Document(BytesIO(content))
            parts = [p.text for p in document.paragraphs if p.text.strip()]

            for table in document.tables:
                for row in table.rows:
                    parts.append(" | ".join(cell.text for cell in row.cells))

            return "\n".join(parts)

        if extension in {".txt", ".md"}:
            return content.decode("utf-8", errors="replace")

    except Exception as exc:
        raise HTTPException(
            status_code=422,
            detail="Could not read this resume file."
        ) from exc

    raise HTTPException(
        status_code=400,
        detail="Supported formats: PDF, DOCX, TXT and MD."
    )


def tokenize(text: str) -> list[str]:
    tokens = re.findall(r"[A-Za-z][A-Za-z0-9+#.-]{1,}", text.lower())
    return [word for word in tokens if word not in STOP_WORDS and len(word) > 2]


def analyze_resume(resume: str, job: str) -> dict:
    resume_words = set(tokenize(resume))
    job_words = Counter(tokenize(job))

    important_keywords = [
        word for word, _ in job_words.most_common(50)
    ]

    matched = [word for word in important_keywords if word in resume_words]
    missing = [
        word for word in important_keywords if word not in resume_words
    ][:18]

    actions = sum(word in ACTION_WORDS for word in tokenize(resume))
    numbers = len(re.findall(r"\b\d+(?:\.\d+)?%?\b", resume))

    section_names = [
        "education", "experience", "projects",
        "skills", "certifications"
    ]

    sections = sum(name in resume.lower() for name in section_names)

    keyword_score = round(
        100 * len(matched) / max(1, min(len(important_keywords), 30))
    )

    impact_score = min(100, 35 + actions * 4 + min(numbers, 8) * 6)
    structure_score = min(100, sections * 20 + 10)

    overall = round(
        0.45 * keyword_score
        + 0.30 * impact_score
        + 0.25 * structure_score
    )

    return {
        "overall_score": overall,
        "keyword_score": keyword_score,
        "impact_score": impact_score,
        "structure_score": structure_score,
        "matched_keywords": matched[:20],
        "missing_keywords": missing,
        "action_verbs": actions,
        "measurable_details": numbers,
        "word_count": len(resume.split()),
        "disclaimer": (
            "These are heuristic indicators, not an employer ATS score "
            "or a prediction of interview success."
        ),
    }


@app.get("/")
def home():
    return {
        "message": "AI Resume Reviewer API is running!",
        "docs": "/docs",
    }


@app.get("/health")
def health():
    return {"status": "healthy"}


@app.post("/api/review")
async def review_resume(
    resume_file: UploadFile = File(...),
    job_description: str = Form(...),
):
    allowed_types = {".pdf", ".docx", ".txt", ".md"}
    filename = resume_file.filename or ""

    if Path(filename).suffix.lower() not in allowed_types:
        raise HTTPException(
            status_code=400,
            detail="Please upload a PDF, DOCX, TXT or MD file."
        )

    content = await resume_file.read()

    if not content:
        raise HTTPException(status_code=400, detail="The file is empty.")

    if len(content) > 10 * 1024 * 1024:
        raise HTTPException(
            status_code=413,
            detail="Maximum resume size is 10 MB."
        )

    if not job_description.strip():
        raise HTTPException(
            status_code=400,
            detail="Please provide a job description."
        )

    resume_text = extract_text(filename, content)

    if not resume_text.strip():
        raise HTTPException(
            status_code=422,
            detail="No readable text found. Scanned PDFs need OCR."
        )

    results = analyze_resume(resume_text, job_description)

    return {
        "filename": filename,
        "analysis": results,
    }