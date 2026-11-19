import { useRef, useState } from 'react';
import Icon from '../Icon';

const MAX_BYTES = 5 * 1024 * 1024; // matches multer's limit in backend/index.js

export default function ScanForm({
  file, setFile, jobTitle, setJobTitle, jobDescription, setJobDescription,
  error, setError, onSubmit, backendDown,
}) {
  const inputRef = useRef(null);
  const [dragging, setDragging] = useState(false);
  const words = jobDescription.trim() ? jobDescription.trim().split(/\s+/).length : 0;

  const accept = (f) => {
    if (!f) return;
    const isPdf = f.type === 'application/pdf' || f.name.toLowerCase().endsWith('.pdf');
    if (!isPdf) return setError('Only PDF resumes can be read. Export yours as a PDF and try again.');
    if (f.size > MAX_BYTES) return setError('That PDF is over 5 MB. Export a lighter version (no embedded images).');
    setFile(f);
    setError('');
  };

  const submit = (e) => {
    e.preventDefault();
    onSubmit();
  };

  return (
    <form className="scan" onSubmit={submit} noValidate>
      <div className="scan__step">
        <span className="scan__n label">01</span>
        <div className="scan__field">
          <p className="scan__label" id="pdf-label">Resume, as a PDF</p>
          <input
            ref={inputRef}
            type="file"
            accept=".pdf,application/pdf"
            className="sr-only"
            aria-labelledby="pdf-label"
            onChange={(e) => accept(e.target.files?.[0])}
          />
          <button
            type="button"
            className={`drop ${dragging ? 'is-over' : ''} ${file ? 'has-file' : ''}`}
            onClick={() => inputRef.current?.click()}
            onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={(e) => { e.preventDefault(); setDragging(false); accept(e.dataTransfer.files?.[0]); }}
          >
            {file ? (
              <>
                <Icon name="file" className="drop__ico" />
                <span className="drop__name">{file.name}</span>
                <span className="label">{(file.size / 1024).toFixed(0)} KB · click to replace</span>
              </>
            ) : (
              <>
                <span className="drop__big display">{dragging ? 'Let go.' : 'Drop the PDF here'}</span>
                <span className="label">or click to choose · text-based PDF · max 5 MB</span>
              </>
            )}
          </button>
        </div>
      </div>

      <div className="scan__step">
        <span className="scan__n label">02</span>
        <label className="scan__field field">
          <span className="scan__label">
            Job title <span className="label">optional, used to name the scan</span>
          </span>
          <input type="text" value={jobTitle} onChange={(e) => setJobTitle(e.target.value)} placeholder="Frontend Engineer at Acme" />
        </label>
      </div>

      <div className="scan__step">
        <span className="scan__n label">03</span>
        <label className="scan__field field">
          <span className="scan__label">
            The job posting <span className="label">{words ? `${words} words` : 'paste all of it'}</span>
          </span>
          <textarea
            value={jobDescription}
            onChange={(e) => setJobDescription(e.target.value)}
            rows={10}
            placeholder="Paste the full posting: responsibilities, required skills, nice-to-haves. Requirements wording decides what counts as required vs preferred."
          />
        </label>
      </div>

      {error && (
        <p className="scan__error" role="alert">
          {error}
        </p>
      )}

      <div className="scan__go">
        <button type="submit" className="btn btn--ink" disabled={backendDown}>
          {backendDown ? 'Waking the server…' : 'Run the scan'} {!backendDown && <Icon name="arrow" />}
        </button>
        <p className="label">Your PDF is deleted from the server right after parsing.</p>
      </div>
    </form>
  );
}
