import { useCallback, useEffect, useState } from 'react';
import axios from 'axios';
import { toast } from 'sonner';
import { AnimatePresence, motion } from 'framer-motion';
import { API_URL } from '../config/api';
import { useBackendStatus } from '../hooks/useBackendStatus';
import { resultFromHistory } from '../lib/tiers';
import { downloadReport } from '../lib/report';
import BackendWarmupCard from '../components/BackendWarmupCard';
import HistoryList from '../components/desk/HistoryList';
import ScanForm from '../components/desk/ScanForm';
import Scanning from '../components/desk/Scanning';
import Results from '../components/desk/Results';
import Icon from '../components/Icon';
import '../components/desk/desk.css';

const swap = {
  initial: { opacity: 0, y: 24 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.7, ease: [0.16, 1, 0.3, 1] } },
  exit: { opacity: 0, y: -12, transition: { duration: 0.3 } },
};

/**
 * The scan desk: history on the left, the form / scanning state / results on the right.
 * `demo` passes a canned result straight in (dev preview only, see App.jsx).
 */
export default function Dashboard({ demo = null }) {
  const { isReady, isChecking } = useBackendStatus({ enabled: !demo });
  const backendDown = !demo && !isReady;

  const [file, setFile] = useState(null);
  const [jobDescription, setJobDescription] = useState(demo?.jobDescription || '');
  const [jobTitle, setJobTitle] = useState(demo?.jobTitle || '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState(demo?.result || null);

  const [history, setHistory] = useState(demo?.history || []);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [activeId, setActiveId] = useState(null);

  const fetchHistory = useCallback(async () => {
    if (demo) return;
    setHistoryLoading(true);
    try {
      const res = await axios.get(`${API_URL}/api/history`, { withCredentials: true });
      if (res.data.success) setHistory(res.data.scans || []);
    } catch (err) {
      console.error('Error fetching scan history:', err);
    } finally {
      setHistoryLoading(false);
    }
  }, [demo]);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  const handleAnalyze = async () => {
    if (!file) return setError('Add your resume as a PDF first.');
    if (!jobDescription.trim()) return setError('Paste the job posting to compare against.');

    setLoading(true);
    setError('');
    setResult(null);
    setActiveId(null);

    const formData = new FormData();
    formData.append('resume', file);
    formData.append('jobDescription', jobDescription);
    formData.append('jobTitle', jobTitle || 'General Scan');

    try {
      const res = await axios.post(`${API_URL}/api/analyze`, formData, {
        withCredentials: true,
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      if (res.data.success) {
        setResult({ ...res.data, jobTitle: jobTitle || 'General scan', fileName: file.name });
        if (res.data.scanId) setActiveId(res.data.scanId);
        fetchHistory();
      } else {
        setError(res.data.message || 'The scan failed.');
      }
    } catch (err) {
      console.error(err);
      const msg = err.response?.data?.message || 'Couldn’t reach the server. Check your connection and try again.';
      setError(msg);
      toast.error('Scan failed', { description: msg });
    } finally {
      setLoading(false);
    }
  };

  const openHistory = (scan) => {
    setActiveId(scan._id);
    setError('');
    setResult(resultFromHistory(scan));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const newScan = () => {
    setFile(null);
    setJobDescription('');
    setJobTitle('');
    setResult(null);
    setError('');
    setActiveId(null);
  };

  const download = async (review) => {
    try {
      await downloadReport(result, result.jobTitle || jobTitle, review);
      toast.success('Report downloaded', { description: 'A one-page PDF of this scan.' });
    } catch (err) {
      console.error(err);
      toast.error('Couldn’t build the PDF', { description: 'Try again in a moment.' });
    }
  };

  const view = loading ? 'scanning' : result ? 'results' : 'form';

  return (
    <div className="wrap desk">
      <HistoryList
        history={history}
        loading={historyLoading}
        activeId={activeId}
        onOpen={openHistory}
      />

      <div className="desk__main">
        <header className="desk__head">
          <div>
            <p className="label label--loud sec__index">Scan desk</p>
            <h1 className="display desk__title">
              {view === 'results' ? (
                <>The <em>markup.</em></>
              ) : view === 'scanning' ? (
                <>Reading <em>your resume.</em></>
              ) : (
                <>New <em>scan.</em></>
              )}
            </h1>
          </div>
          {view === 'results' && (
            <button type="button" className="btn btn--line" onClick={newScan}>
              <Icon name="plus" /> New scan
            </button>
          )}
        </header>

        <AnimatePresence mode="wait">
          <motion.div key={view} {...swap}>
            {view === 'form' && (
              <ScanForm
                file={file}
                setFile={setFile}
                jobTitle={jobTitle}
                setJobTitle={setJobTitle}
                jobDescription={jobDescription}
                setJobDescription={setJobDescription}
                error={error}
                setError={setError}
                onSubmit={handleAnalyze}
                backendDown={backendDown}
              />
            )}
            {view === 'scanning' && <Scanning fileName={file?.name} />}
            {view === 'results' && (
              <Results
                result={result}
                jobDescription={result.fromHistory ? '' : jobDescription}
                onDownload={download}
                onNewScan={newScan}
              />
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      {!demo && isChecking && <BackendWarmupCard isReady={isReady} isChecking={isChecking} />}
    </div>
  );
}
