/**
 * Client for the ats-models service (ml/service, hosted on a Hugging Face Space).
 * Every call has a timeout and returns null on any failure, so callers can fall back
 * to the rules engine instead of failing the request.
 */
const ML_URL = (process.env.ML_SERVICE_URL || '').replace(/\/+$/, '');
const ML_KEY = process.env.ML_SERVICE_KEY || '';

const TIMEOUTS = {
    score: Number(process.env.ML_TIMEOUT_SCORE_MS || 25000),
    review: Number(process.env.ML_TIMEOUT_REVIEW_MS || 120000),
    parse: Number(process.env.ML_TIMEOUT_PARSE_MS || 90000),
    health: 30000, // covers a Modal cold start (~20 s)
};

const enabled = () => Boolean(ML_URL && ML_KEY);

async function call(path, body, timeoutMs, fetchImpl = fetch) {
    if (!enabled()) return null;
    const started = Date.now();
    try {
        const res = await fetchImpl(`${ML_URL}${path}`, {
            method: body ? 'POST' : 'GET',
            headers: { 'Content-Type': 'application/json', 'X-Service-Key': ML_KEY },
            body: body ? JSON.stringify(body) : undefined,
            signal: AbortSignal.timeout(timeoutMs),
        });
        if (!res.ok) {
            console.warn(`[ml] ${path} -> HTTP ${res.status} in ${Date.now() - started}ms`);
            return null;
        }
        return await res.json();
    } catch (err) {
        console.warn(`[ml] ${path} failed after ${Date.now() - started}ms: ${err.name}`);
        return null;
    }
}

/** Five dimension scores (0-20) and a total (0-100) from ats-scorer. */
async function score({ resume, job, jobTitle }, fetchImpl) {
    const out = await call('/score', { resume, job, job_title: jobTitle || '' }, TIMEOUTS.score, fetchImpl);
    if (!out || !Array.isArray(out.dimensions) || out.dimensions.length !== 5) return null;
    return out;
}

/** A reason per dimension and a summary from ats-lm, conditioned on the scores. */
async function review({ resume, job, jobTitle, dims }, fetchImpl) {
    const out = await call('/review', { resume, job, job_title: jobTitle || '', dims }, TIMEOUTS.review, fetchImpl);
    if (!out || !Array.isArray(out.dimensions)) return null;
    return out;
}

/** Structured profile (titles, years, seniority, skills, achievements) from ats-lm. */
async function parse({ resume }, fetchImpl) {
    const out = await call('/parse', { resume }, TIMEOUTS.parse, fetchImpl);
    return out && out.profile ? out.profile : null;
}

async function health(fetchImpl) {
    return call('/health', null, TIMEOUTS.health, fetchImpl);
}

module.exports = { enabled, score, review, parse, health };
