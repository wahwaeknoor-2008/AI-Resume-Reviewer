import { useRef, useState } from 'react'
import './App.css'

const API_URL = `${(import.meta.env.VITE_API_URL || '').replace(/\/$/, '')}/api/review`
const MAX_FILE_SIZE = 10 * 1024 * 1024
const ALLOWED_EXTENSIONS = ['pdf', 'docx', 'txt', 'md']

function ScoreCard({ label, score, description }) {
  const safeScore = Math.max(0, Math.min(100, Number(score) || 0))

  return (
    <article className="score-card">
      <div className="score-card-heading">
        <span>{label}</span>
        <span className="score-sparkle">✦</span>
      </div>
      <div className="score-value">
        {safeScore}<small>/100</small>
      </div>
      <div
        className="score-track"
        role="progressbar"
        aria-label={label}
        aria-valuenow={safeScore}
        aria-valuemin="0"
        aria-valuemax="100"
      >
        <span style={{ width: `${safeScore}%` }} />
      </div>
      {description && <p>{description}</p>}
    </article>
  )
}

function KeywordList({ title, description, items, kind, emptyText }) {
  return (
    <article className="panel keyword-panel">
      <div className="panel-title-row">
        <div>
          <h3>{title}</h3>
          <p>{description}</p>
        </div>
        <span className={`keyword-count ${kind}`}>
          {items?.length || 0}
        </span>
      </div>

      <div className="keyword-list">
        {items?.length ? (
          items.map((word) => (
            <span className={`keyword-chip ${kind}`} key={word}>
              {word}
            </span>
          ))
        ) : (
          <p className="empty-state">{emptyText}</p>
        )}
      </div>
    </article>
  )
}

function App() {
  const [resume, setResume] = useState(null)
  const [jobDescription, setJobDescription] = useState('')
  const [analysis, setAnalysis] = useState(null)
  const [filename, setFilename] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [activePage, setActivePage] = useState('Overview')
  const [dragging, setDragging] = useState(false)

  const fileInputRef = useRef(null)
  const resultsRef = useRef(null)
  const topRef = useRef(null)

  function acceptFile(file) {
    if (!file) return

    const extension = file.name.split('.').pop()?.toLowerCase()

    if (!ALLOWED_EXTENSIONS.includes(extension)) {
      setError('Please choose a PDF, DOCX, TXT or MD file.')
      return
    }

    if (file.size > MAX_FILE_SIZE) {
      setError('Your resume is larger than 10 MB. Please choose a smaller file.')
      return
    }

    if (file.size === 0) {
      setError('That file appears to be empty. Please choose another file.')
      return
    }

    setResume(file)
    setAnalysis(null)
    setFilename('')
    setError('')
  }

  function handleFileChange(event) {
    acceptFile(event.target.files?.[0])
    event.target.value = ''
  }

  async function handleAnalyze() {
    if (!resume) {
      setError('Please upload your resume first.')
      return
    }

    if (!jobDescription.trim()) {
      setError('Please paste the job description first.')
      return
    }

    setLoading(true)
    setError('')
    setAnalysis(null)

    try {
      const formData = new FormData()
      formData.append('resume_file', resume)
      formData.append('job_description', jobDescription.trim())

      const response = await fetch(API_URL, {
        method: 'POST',
        body: formData,
      })

      let data

      try {
        data = await response.json()
      } catch {
        throw new Error(
          'The server returned an unexpected response. Please check that the backend is running.'
        )
      }

      if (!response.ok) {
        throw new Error(
          typeof data.detail === 'string'
            ? data.detail
            : 'Your resume could not be analysed. Please try again.'
        )
      }

      if (!data.analysis) {
        throw new Error('The analysis response was incomplete. Please try again.')
      }

      setAnalysis(data.analysis)
      setFilename(data.filename || resume.name)
      setActivePage('Resume Analysis')

      window.setTimeout(() => {
        resultsRef.current?.scrollIntoView({
          behavior: 'smooth',
          block: 'start',
        })
      }, 80)
    } catch (err) {
      setError(
        err.message ||
        'Could not connect to the API. Please make sure the backend is running.'
      )
    } finally {
      setLoading(false)
    }
  }

  function resetReview() {
    setResume(null)
    setJobDescription('')
    setAnalysis(null)
    setFilename('')
    setError('')
    setActivePage('Overview')

    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }

    topRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  function navigate(page) {
    setActivePage(page)

    if (page === 'Overview') {
      topRef.current?.scrollIntoView({ behavior: 'smooth' })
    }

    if (page === 'Resume Analysis') {
      if (analysis) {
        resultsRef.current?.scrollIntoView({
          behavior: 'smooth',
          block: 'start',
        })
      } else {
        document.querySelector('#review-form')?.scrollIntoView({
          behavior: 'smooth',
          block: 'start',
        })
      }
    }

    if (page === 'My Resumes') {
      document.querySelector('#review-form')?.scrollIntoView({
        behavior: 'smooth',
        block: 'start',
      })
    }

    if (page === 'Settings') {
      document.querySelector('#privacy-note')?.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
      })
    }
  }

  const navItems = [
    { name: 'Overview', icon: '⌂' },
    { name: 'Resume Analysis', icon: '▤' },
    { name: 'My Resumes', icon: '▧' },
    { name: 'Settings', icon: '⚙' },
  ]

  return (
    <div className="app-shell" ref={topRef}>
      <aside className="sidebar">
        <a
          className="brand"
          href="#top"
          onClick={() => navigate('Overview')}
          aria-label="Resumind home"
        >
          <span className="brand-mark">✳</span>
          <span>
            Resumind<span className="brand-period">.</span>
          </span>
        </a>

        <div className="sidebar-section-label">WORKSPACE</div>

        <nav className="sidebar-nav" aria-label="Main navigation">
          {navItems.map((item) => (
            <button
              key={item.name}
              className={`nav-item ${
                activePage === item.name ? 'active' : ''
              }`}
              onClick={() => navigate(item.name)}
            >
              <span className="nav-icon" aria-hidden="true">
                {item.icon}
              </span>
              <span>{item.name}</span>

              {item.name === 'Resume Analysis' && analysis && (
                <span className="nav-indicator" />
              )}
            </button>
          ))}
        </nav>

        <div className="sidebar-spacer" />

        <div className="sidebar-promo">
          <span className="promo-icon">✦</span>
          <h3>Your next opportunity starts here.</h3>
          <p>Turn useful feedback into a stronger application.</p>
        </div>

        <div className="sidebar-profile">
          <div className="avatar" aria-label="User account"><svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/></svg></div>
          <div className="profile-copy">
            <strong>My workspace</strong>
            <span>Personal account</span>
          </div>
          <span className="profile-more">···</span>
        </div>
      </aside>

      <main className="main-area">
        <header className="topbar">
          <div className="breadcrumb">
            <span>Workspace</span>
            <i>/</i>
            <strong>{activePage}</strong>
          </div>

          <div className="topbar-right">
            <span className="system-status">
              <i /> API workspace
            </span>
            <div className="avatar avatar-small" aria-label="User account"><svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/></svg></div>
          </div>
        </header>

        <div className="page-content">
          <section className="hero-section">
            <div className="hero-copy">
              <div className="eyebrow">
                <span /> YOUR AI CAREER ASSISTANT
              </div>

              <h1>
                Make your next application <em>stand out.</em>
              </h1>

              <p>
                Get practical resume insights, spot skill gaps, and see how
                your experience compares with the role you want.
              </p>

              <button
                className="hero-link"
                onClick={() =>
                  document.querySelector('#review-form')?.scrollIntoView({
                    behavior: 'smooth',
                  })
                }
              >
                Start reviewing <span>→</span>
              </button>
            </div>

            <div className="hero-visual" aria-hidden="true">
              <div className="hero-orbit orbit-one" />
              <div className="hero-orbit orbit-two" />
              <div className="hero-star">✳</div>

              <div className="floating-insight">
                <span>✦</span>
                <div>
                  <strong>Career insights</strong>
                  <small>Built around your next move</small>
                </div>
              </div>

              <div className="floating-score">
                <small>RESUME MATCH</small>
                <strong>↗</strong>
                <span>Find your strengths</span>
              </div>
            </div>
          </section>

          <section className="overview-stats" aria-label="Review overview">
            <article className="overview-card">
              <div className="overview-card-top">
                <span>Resume uploaded</span>
                <span className="overview-icon">▤</span>
              </div>
              <strong>{resume ? '01' : '—'}</strong>
              <small>
                {resume ? 'Ready for review' : 'Your next review starts here'}
              </small>
            </article>

            <article className="overview-card">
              <div className="overview-card-top">
                <span>Overall match</span>
                <span className="overview-icon">◎</span>
              </div>
              <strong>
                {analysis ? `${analysis.overall_score}%` : '—'}
              </strong>
              <small>
                {analysis
                  ? 'Based on this job description'
                  : 'Your score will appear here'}
              </small>
            </article>

            <article className="overview-card">
              <div className="overview-card-top">
                <span>Keywords to inspect</span>
                <span className="overview-icon">✧</span>
              </div>
              <strong>
                {analysis ? analysis.missing_keywords?.length ?? 0 : '—'}
              </strong>
              <small>
                {analysis
                  ? 'Potential areas to improve'
                  : 'Discover relevant keywords'}
              </small>
            </article>
          </section>

          <section className="section-heading" id="review-form">
            <div>
              <div className="eyebrow">LET'S GET STARTED</div>
              <h2>Start a new review</h2>
              <p>
                Two simple steps to get useful feedback on your application.
              </p>
            </div>

            <span className="step-label">
              01 — UPLOAD <b /> 02 — ANALYSE
            </span>
          </section>

          <section className="review-grid">
            <article className="panel input-panel">
              <div className="panel-heading">
                <span className="step-number">01</span>
                <div>
                  <h3>Upload your resume</h3>
                  <p>Choose the latest version of your resume.</p>
                </div>
              </div>

              <div
                className={`upload-zone ${dragging ? 'dragging' : ''} ${
                  resume ? 'has-file' : ''
                }`}
                onDragOver={(event) => {
                  event.preventDefault()
                  setDragging(true)
                }}
                onDragLeave={() => setDragging(false)}
                onDrop={(event) => {
                  event.preventDefault()
                  setDragging(false)
                  acceptFile(event.dataTransfer.files?.[0])
                }}
              >
                <input
                  ref={fileInputRef}
                  id="resume-upload"
                  type="file"
                  accept=".pdf,.docx,.txt,.md"
                  onChange={handleFileChange}
                />

                <label htmlFor="resume-upload" className="upload-label">
                  <span className="upload-symbol">
                    {resume ? '✓' : '↑'}
                  </span>

                  <strong>
                    {resume ? resume.name : 'Drop your resume here'}
                  </strong>

                  <span>
                    {resume
                      ? `${(resume.size / 1024).toFixed(1)} KB · Ready to analyse`
                      : <>or <u>browse files</u> from your device</>}
                  </span>

                  <small>
                    PDF, DOCX, TXT or MD · Maximum 10 MB
                  </small>
                </label>
              </div>

              {resume && (
                <button
                  className="text-button remove-button"
                  onClick={() => {
                    setResume(null)
                    setAnalysis(null)
                    setError('')
                  }}
                >
                  Remove selected file <span>×</span>
                </button>
              )}

              <div className="privacy-hint">
                <span>♧</span>
                Your resume is processed for this review and is not saved by
                this interface.
              </div>
            </article>

            <article className="panel input-panel">
              <div className="panel-heading">
                <span className="step-number">02</span>
                <div>
                  <h3>Add the job description</h3>
                  <p>Tell us about the role you're targeting.</p>
                </div>
              </div>

              <textarea
                className="job-input"
                placeholder={'Paste the job description here…\n\nInclude the responsibilities, qualifications, skills and experience required for the role.'}
                value={jobDescription}
                onChange={(event) => {
                  setJobDescription(event.target.value)
                  setAnalysis(null)
                  setError('')
                }}
              />

              <div className="input-footer">
                <span>
                  {jobDescription.length.toLocaleString()} characters
                </span>
                <span>More detail can provide better context</span>
              </div>

              <div className="privacy-hint">
                <span>✧</span>
                Remove personal contact details before uploading if you prefer.
              </div>
            </article>
          </section>

          {error && (
            <div className="error-message" role="alert">
              <span>!</span>
              <div>
                <strong>We couldn't complete that request</strong>
                <p>{error}</p>
              </div>
              <button
                onClick={() => setError('')}
                aria-label="Dismiss error"
              >
                ×
              </button>
            </div>
          )}

          <section className="action-bar">
            <div>
              <strong>Ready to improve your resume?</strong>
              <p>
                We'll compare your resume with the job requirements.
              </p>
            </div>

            <button
              className="primary-button"
              disabled={!resume || !jobDescription.trim() || loading}
              onClick={handleAnalyze}
            >
              {loading ? (
                <>
                  <span className="spinner" /> Analysing…
                </>
              ) : (
                <>
                  Analyse my resume <span>→</span>
                </>
              )}
            </button>
          </section>

          {loading && (
            <div className="loading-panel" role="status">
              <span className="loading-spinner" />
              <div>
                <strong>Reviewing your resume</strong>
                <p>
                  Extracting text and comparing it with the job description.
                  This may take a moment.
                </p>
              </div>
            </div>
          )}

          {analysis && (
            <section className="results-section" ref={resultsRef}>
              <div className="section-heading results-heading">
                <div>
                  <div className="eyebrow">YOUR REVIEW IS READY</div>
                  <h2>Your resume analysis</h2>
                  <p>
                    Results for <strong>{filename}</strong>
                  </p>
                </div>

                <span className="completed-label">
                  <i /> COMPLETED
                </span>
              </div>

              <div className="score-grid">
                <ScoreCard
                  label="Overall score"
                  score={analysis.overall_score}
                  description="Combined heuristic indicator"
                />
                <ScoreCard
                  label="Keyword match"
                  score={analysis.keyword_score}
                  description="Relevant terms detected"
                />
                <ScoreCard
                  label="Impact signals"
                  score={analysis.impact_score}
                  description="Action verbs and measurable details"
                />
                <ScoreCard
                  label="Resume structure"
                  score={analysis.structure_score}
                  description="Common resume sections detected"
                />
              </div>

              <div className="keyword-grid">
                <KeywordList
                  title="Matched keywords"
                  description="These terms appear in your resume and the job description."
                  items={analysis.matched_keywords || []}
                  kind="matched"
                  emptyText="No matching keywords were detected."
                />

                <KeywordList
                  title="Keywords to inspect"
                  description="Consider whether these requirements are relevant to your experience."
                  items={analysis.missing_keywords || []}
                  kind="missing"
                  emptyText="No obvious keyword gaps were detected."
                />
              </div>

              <article className="panel detail-panel">
                <div>
                  <div className="eyebrow">RESUME SNAPSHOT</div>
                  <h3>A few details about your document</h3>
                </div>

                <div className="detail-metrics">
                  <div>
                    <strong>{analysis.word_count ?? '—'}</strong>
                    <span>Words in resume</span>
                  </div>
                  <div>
                    <strong>{analysis.action_verbs ?? '—'}</strong>
                    <span>Action verb signals</span>
                  </div>
                  <div>
                    <strong>{analysis.measurable_details ?? '—'}</strong>
                    <span>Measurable details</span>
                  </div>
                </div>

                <p className="disclaimer">
                  {analysis.disclaimer ||
                    'These are heuristic indicators, not an employer ATS score or a prediction of interview success.'}
                </p>
              </article>

              <div className="results-actions">
                <button
                  className="secondary-button"
                  onClick={() =>
                    document.querySelector('#review-form')?.scrollIntoView({
                      behavior: 'smooth',
                    })
                  }
                >
                  Edit inputs
                </button>

                <button className="primary-button" onClick={resetReview}>
                  Start a new review <span>→</span>
                </button>
              </div>
            </section>
          )}

          <footer className="footer" id="privacy-note">
            <span>Resumind © 2026</span>
            <span>
              Built to help you present your experience clearly.{' '}
              <b>Privacy matters.</b>
            </span>
          </footer>
        </div>
      </main>
    </div>
  )
}

export default App