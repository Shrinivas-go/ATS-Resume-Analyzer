const INK = [23, 24, 26];
const MUTE = [85, 87, 91];
const LINE = [200, 199, 193];
const HIGHLIGHT = [244, 213, 11];
const RED = [196, 33, 58];

/** Download a one-page PDF version of a scan result, set in the app's proof-sheet style. */
export async function downloadReport(result, jobTitle, review = null) {
  const { jsPDF } = await import('jspdf');
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const L = 20;
  const W = 170;
  let y = 22;

  const label = (text, x, yy, color = MUTE, align = 'left') => {
    doc.setFont('courier', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(...color);
    doc.text(text.toUpperCase(), x, yy, { align });
  };
  const rule = (yy) => {
    doc.setDrawColor(...LINE);
    doc.setLineWidth(0.25);
    doc.line(L, yy, L + W, yy);
  };
  // Start a new page when the next block would run into the footer
  const room = (yy, h) => {
    if (yy + h <= 272) return yy;
    doc.addPage();
    return 22;
  };
  const para = (text, yy, size = 10.5, color = INK) => {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(size);
    doc.setTextColor(...color);
    const lines = doc.splitTextToSize(text, W);
    yy = room(yy, lines.length * size * 0.42);
    doc.text(lines, L, yy);
    return yy + lines.length * size * 0.42 + 2;
  };

  label('ATS resume checker / scan report', L, y);
  label(new Date().toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' }), L + W, y, MUTE, 'right');
  y += 4;
  rule(y);
  y += 12;

  label('Target role', L, y);
  y += 7;
  doc.setFont('times', 'bold');
  doc.setFontSize(20);
  doc.setTextColor(...INK);
  doc.text(jobTitle || result.jobTitle || 'General scan', L, y);
  y += 16;

  // Score with a highlighter bar behind it
  doc.setFillColor(...HIGHLIGHT);
  doc.rect(L - 1, y - 17, 46, 21, 'F');
  doc.setFont('times', 'bold');
  doc.setFontSize(48);
  doc.setTextColor(...INK);
  doc.text(String(result.score), L + 1, y);
  doc.setFont('courier', 'normal');
  doc.setFontSize(11);
  doc.text('/100', L + 32, y);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.text(result.details?.matchTier || '', L + 54, y - 8);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(...MUTE);
  doc.text(`Reads as: ${result.predictedCategory || 'Unknown'}`, L + 54, y - 1);
  y += 10;
  rule(y);
  y += 9;

  const summary = review?.review?.summary || result.details?.summary;
  if (summary) {
    label('Summary', L, y);
    y = para(summary, y + 6);
    y += 4;
  }

  // Five dimensions (ats-scorer) with the ats-lm reason under each
  if (result.dimensions?.length) {
    const why = Object.fromEntries((review?.review?.dimensions || []).map((d) => [d.name, d.reason]));
    label('Five dimensions (0-20 each)', L, y);
    y += 6;
    result.dimensions.forEach((d) => {
      y = room(y, 14);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10.5);
      doc.setTextColor(...INK);
      doc.text(d.label, L, y);
      doc.setFont('courier', 'normal');
      doc.text(`${d.score}/20`, L + W, y, { align: 'right' });
      doc.setFillColor(...LINE);
      doc.rect(L, y + 1.5, W, 1.6, 'F');
      doc.setFillColor(...(d.score <= 8 ? RED : HIGHLIGHT));
      doc.rect(L, y + 1.5, (W * d.score) / 20, 1.6, 'F');
      y += 6;
      if (why[d.name]) y = para(why[d.name], y + 1, 9.5, MUTE);
      y += 2;
    });
    y += 2;
  }

  const list = (title, items, color) => {
    if (!items?.length) return;
    label(title, L, y, color);
    y += 6;
    items.forEach((s, i) => {
      y = room(y, 10);
      doc.setFont('courier', 'normal');
      doc.setFontSize(9);
      doc.setTextColor(...MUTE);
      doc.text(String(i + 1).padStart(2, '0'), L, y);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      doc.setTextColor(...INK);
      const lines = doc.splitTextToSize(s, W - 10);
      doc.text(lines, L + 10, y);
      y += lines.length * 4.4 + 2;
    });
    y += 4;
  };

  const s = result.skillsAnalyzed || {};
  const found = [...(s.matchedCore || []), ...(s.matchedOptional || [])];
  const missing = [...(s.missingCore || []), ...(s.missingOptional || [])];

  y = room(y, 30);
  label(`Found in your resume (${found.length})`, L, y);
  y = para(found.join(', ') || 'None', y + 6);
  y += 3;
  label(`Missing from your resume (${missing.length})`, L, y, RED);
  y = para(missing.join(', ') || 'None', y + 6);
  y += 5;
  rule(y);
  y += 9;

  list('Working for you', result.details?.keyStrengths, MUTE);
  list('Fix before you send', result.details?.criticalGaps, RED);

  doc.setPage(doc.getNumberOfPages());
  rule(282);
  label(result.engine === 'ats-scorer' ? 'Scored by ats-scorer; reasons written by ats-lm' : 'Scored by the rules engine', L, 287);

  const safe = (jobTitle || 'scan').replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '').toLowerCase();
  doc.save(`ats-report-${safe || 'scan'}.pdf`);
}
