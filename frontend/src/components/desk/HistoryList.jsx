const fmt = (d) => new Date(d).toLocaleDateString(undefined, { day: 'numeric', month: 'short' });

/** Saved scans as an index: score in the display face, title, date in mono. */
export default function HistoryList({ history, loading, activeId, onOpen }) {
  return (
    <aside className="hist" aria-labelledby="hist-title">
      <div className="hist__head">
        <h2 id="hist-title" className="label label--loud">Saved scans</h2>
        {!loading && history.length > 0 && <span className="label">{history.length}</span>}
      </div>

      {loading && history.length === 0 ? (
        <ul className="hist__list" aria-busy="true">
          {[0, 1, 2].map((i) => (
            <li key={i} className="hist__ghost" />
          ))}
        </ul>
      ) : history.length === 0 ? (
        <p className="hist__empty">
          Nothing saved yet. Each scan you run lands here so you can compare versions.
        </p>
      ) : (
        <ul className="hist__list">
          {history.map((scan) => (
            <li key={scan._id}>
              <button
                type="button"
                className={`hist__item ${activeId === scan._id ? 'is-active' : ''}`}
                onClick={() => onOpen(scan)}
                aria-current={activeId === scan._id ? 'true' : undefined}
              >
                <span className="hist__score">{scan.score}</span>
                <span className="hist__meta">
                  <span className="hist__job">{scan.jobTitle || 'General scan'}</span>
                  <span className="label">
                    {fmt(scan.createdAt)}
                    {scan.predictedCategory ? ` · ${scan.predictedCategory}` : ''}
                  </span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </aside>
  );
}
