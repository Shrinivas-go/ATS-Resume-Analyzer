/**
 * In-memory background jobs for the slow ats-lm step (review + profile parse).
 * The scan response returns immediately with a job id; the browser polls for the result.
 *
 * Only results are kept (never the resume text), for TTL_MS. A single Render instance
 * is assumed; with several instances, move this to Redis or MongoDB.
 */
const crypto = require('crypto');

const TTL_MS = 15 * 60 * 1000;
const MAX_JOBS = 500;
const jobs = new Map();

function sweep(now = Date.now()) {
    for (const [id, job] of jobs) {
        if (job.expiresAt < now) jobs.delete(id);
    }
    while (jobs.size > MAX_JOBS) jobs.delete(jobs.keys().next().value);
}

/** Start `work()` in the background. `owner` (user id or null) limits who can read it. */
function start(work, owner = null, onDone = null) {
    sweep();
    const id = crypto.randomUUID();
    const job = { status: 'pending', result: null, owner, expiresAt: Date.now() + TTL_MS };
    jobs.set(id, job);
    Promise.resolve()
        .then(work)
        .then(async (result) => {
            job.status = result ? 'done' : 'failed';
            job.result = result || null;
            if (result && onDone) await onDone(result).catch((e) => console.error('[review] save failed:', e.message));
        })
        .catch((err) => {
            console.error('[review] job failed:', err.message);
            job.status = 'failed';
        });
    return id;
}

function get(id, owner = null) {
    const job = jobs.get(id);
    if (!job || job.expiresAt < Date.now()) return null;
    if (job.owner && String(job.owner) !== String(owner)) return null;
    return { status: job.status, ...(job.result || {}) };
}

module.exports = { start, get, _jobs: jobs };
