# 🧠 AI Resume Reviewer

A portfolio project that compares a resume with a job description and produces practical recruiter-style feedback.

## Features
- PDF, DOCX, TXT and Markdown resume upload
- Local keyword, structure, action-verb and quantification analysis
- Optional AI review for strengths, gaps, keywords, bullet rewrites, project ideas and interview topics
- Streamlit web UI

## Run locally
```bash
git clone https://github.com/YOUR-USERNAME/ai-resume-reviewer.git
cd ai-resume-reviewer
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
streamlit run app.py
```

## AI mode
Set an environment variable before starting the app:
```bash
export OPENAI_API_KEY="your_api_key_here"
```
Never commit API keys to GitHub.

## Important
The displayed scores are heuristic signals, not a real employer ATS score and not a prediction of interview success.

## Portfolio roadmap
- [ ] PDF report export
- [ ] Visual keyword highlighting
- [ ] Resume version comparison
- [ ] Job history
- [ ] GitHub/project recommendations
- [ ] Tests
- [ ] Deployment
