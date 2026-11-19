/**
 * API tests for the scan pipeline: validation, the rules fallback, the model-service path
 * (with fetch mocked) and the review polling route. No database needed.
 */
const fs = require('fs');
const path = require('path');
const request = require('supertest');

const PDF = fs.readFileSync(path.join(__dirname, 'fixtures', 'sample-resume.pdf'));
const POSTING = `Frontend Engineer

We are hiring a frontend engineer to build our recruiter dashboard.

Requirements:
- Strong React and TypeScript
- JavaScript, HTML, CSS
- Experience with REST APIs and Git

Nice to have:
- GraphQL
- Docker
- Jest testing
- Node.js and Express`;

function loadApp(env = {}) {
    let app;
    jest.isolateModules(() => {
        Object.assign(process.env, { ML_SERVICE_URL: '', ML_SERVICE_KEY: '', ...env });
        app = require('../index');
    });
    return app;
}

const scan = (app, fields = {}) => {
    const req = request(app).post('/api/analyze');
    const f = { jobDescription: POSTING, jobTitle: 'Frontend Engineer', ...fields };
    Object.entries(f).forEach(([k, v]) => v !== undefined && req.field(k, v));
    return fields.noFile ? req : req.attach('resume', PDF, 'resume.pdf');
};

afterEach(() => {
    jest.restoreAllMocks();
});

describe('POST /api/analyze — validation', () => {
    const app = loadApp();

    it('rejects a missing file', async () => {
        const res = await scan(app, { noFile: true });
        expect(res.status).toBe(400);
        expect(res.body.message).toMatch(/resume PDF/);
    });

    it('rejects a posting that is too short', async () => {
        const res = await scan(app, { jobDescription: 'React dev' });
        expect(res.status).toBe(400);
        expect(res.body.message).toMatch(/full job posting/);
    });

    it('rejects non-PDF uploads', async () => {
        const res = await request(app).post('/api/analyze').field('jobDescription', POSTING).attach('resume', Buffer.from('hello'), 'notes.txt');
        expect(res.status).toBe(400);
        expect(res.body.message).toMatch(/PDF/);
    });
});

describe('POST /api/analyze — rules fallback (no model service)', () => {
    const app = loadApp();

    it('scores with the rules engine and finds required vs preferred skills', async () => {
        const res = await scan(app);
        expect(res.status).toBe(200);
        expect(res.body.engine).toBe('rules');
        expect(res.body.dimensions).toBeNull();
        expect(res.body.reviewId).toBeUndefined();
        const s = res.body.skillsAnalyzed;
        expect(s.missingCore).toContain('TypeScript');
        expect(s.matchedCore).toEqual(expect.arrayContaining(['React', 'JavaScript', 'Git']));
        expect([...s.matchedOptional, ...s.missingOptional]).toEqual(expect.arrayContaining(['GraphQL', 'Docker']));
    });
});

describe('POST /api/analyze — model service', () => {
    const app = loadApp({ ML_SERVICE_URL: 'https://models.example.test', ML_SERVICE_KEY: 'k' });

    it('uses ats-scorer dimensions, then serves the ats-lm review by id', async () => {
        const calls = [];
        jest.spyOn(global, 'fetch').mockImplementation(async (url, init) => {
            calls.push(url);
            const json = (body) => ({ ok: true, status: 200, json: async () => body });
            if (url.endsWith('/score')) {
                expect(init.headers['X-Service-Key']).toBe('k');
                return json({ dimensions: [16, 12, 15, 10, 9].map((score, i) => ({ name: `d${i}`, score })), total: 62 });
            }
            if (url.endsWith('/review')) {
                return json({ summary: 'Solid frontend base; TypeScript is the main gap.', dimensions: [1, 2, 3, 4, 5].map((n) => ({ score: n, reason: `reason ${n}` })) });
            }
            if (url.endsWith('/parse')) return json({ profile: { current_title: 'Frontend Intern', years_experience: 1 } });
            throw new Error(`unexpected ${url}`);
        });

        const res = await scan(app);
        expect(res.status).toBe(200);
        expect(res.body.engine).toBe('ats-scorer');
        expect(res.body.score).toBe(62);
        expect(res.body.dimensions.map((d) => d.score)).toEqual([16, 12, 15, 10, 9]);
        expect(res.body.dimensions[0].label).toBe('Skills match');
        expect(res.body.explanation).toMatch(/Weakest area: seniority/);
        expect(res.body.reviewId).toMatch(/^[0-9a-f-]{36}$/);

        let review;
        for (let i = 0; i < 20; i += 1) {
            review = await request(app).get(`/api/review/${res.body.reviewId}`);
            if (review.body.status !== 'pending') break;
            await new Promise((r) => setTimeout(r, 25));
        }
        expect(review.body.status).toBe('done');
        expect(review.body.review.summary).toMatch(/TypeScript/);
        expect(review.body.review.dimensions[4]).toMatchObject({ name: 'seniority_role_alignment', reason: 'reason 5' });
        expect(review.body.profile.current_title).toBe('Frontend Intern');
        expect(calls.filter((u) => u.endsWith('/score'))).toHaveLength(1);
    });

    it('falls back to the rules score when the model service fails', async () => {
        jest.spyOn(global, 'fetch').mockResolvedValue({ ok: false, status: 503, json: async () => ({}) });
        const res = await scan(app);
        expect(res.status).toBe(200);
        expect(res.body.engine).toBe('rules');
        expect(res.body.reviewId).toBeUndefined();
    });
});

describe('GET /api/review/:id', () => {
    const app = loadApp();
    it('rejects malformed ids and unknown reviews', async () => {
        expect((await request(app).get('/api/review/abc')).status).toBe(400);
        expect((await request(app).get('/api/review/00000000-0000-0000-0000-000000000000')).status).toBe(404);
    });
});

describe('GET /health', () => {
    test('never calls the model service, so it can scale to zero', async () => {
        const fetchSpy = jest.spyOn(global, 'fetch');
        const app = loadApp({ ML_SERVICE_URL: 'http://models.test', ML_SERVICE_KEY: 'k' });
        const res = await request(app).get('/health');
        expect(res.status).toBe(200);
        expect(res.body.models).toBe('configured');
        expect(fetchSpy).not.toHaveBeenCalled();
    });

    test('/health/models checks the service on demand', async () => {
        jest.spyOn(global, 'fetch').mockResolvedValue(new Response(JSON.stringify({ status: 'ok' }), { status: 200 }));
        const app = loadApp({ ML_SERVICE_URL: 'http://models.test', ML_SERVICE_KEY: 'k' });
        const res = await request(app).get('/health/models');
        expect(res.body.models).toBe('ok');
    });
});
