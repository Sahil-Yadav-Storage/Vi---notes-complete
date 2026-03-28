import PDFDocument from "pdfkit";
import type { Response } from "express";

const safeNumber = (value: unknown, digits = 2) => {
  if (typeof value !== "number" || !Number.isFinite(value)) return "N/A";
  return value.toFixed(digits);
};

export const generatePDF = (res: Response, session: any) => {
  const doc = new PDFDocument({ margin: 40, size: "A4" });
  const analytics = session.analytics ?? {};
  const text = analytics.textAnalysis ?? {};
  const authenticity = analytics.authenticity ?? {};

  res.setHeader("Content-Type", "application/pdf");
  res.setHeader(
    "Content-Disposition",
    `attachment; filename="vi-notes-verification-${session._id}.pdf"`,
  );

  doc.pipe(res);

  doc.fontSize(22).text("ViNotes Verification Report", { align: "center" });
  doc.moveDown(0.5);
  doc.fontSize(10).text(`Session ID: ${session._id}`);
  doc.text(`Created At: ${new Date(session.createdAt).toLocaleString()}`);

  doc.moveDown();
  doc.fontSize(16).text("Authenticity");
  doc.fontSize(12).text(`Score: ${authenticity.score ?? "N/A"}`);
  doc.text(`Label: ${authenticity.label ?? "Unknown"}`);

  doc.moveDown();
  doc.fontSize(16).text("Behavioral Metrics");
  doc.fontSize(12).text(`WPM Variance: ${safeNumber(analytics.approximateWpmVariance)}`);
  doc.text(`Pause Frequency: ${safeNumber(analytics.pauseFrequency)}`);
  doc.text(`Edit Ratio: ${safeNumber(analytics.editRatio)}`);
  doc.text(`Paste Ratio: ${safeNumber(analytics.pasteRatio)}`);
  doc.text(`Total Inserted Chars: ${analytics.totalInsertedChars ?? "N/A"}`);
  doc.text(`Total Deleted Chars: ${analytics.totalDeletedChars ?? "N/A"}`);
  doc.text(`Total Pasted Chars: ${analytics.totalPastedChars ?? "N/A"}`);
  doc.text(`Pause Count: ${analytics.pauseCount ?? "N/A"}`);
  doc.text(`Session Duration: ${analytics.durationMs ?? "N/A"} ms`);

  doc.moveDown();
  doc.fontSize(16).text("Text Metrics");
  doc.fontSize(12).text(`Avg Sentence Length: ${safeNumber(text.avgSentenceLength)}`);
  doc.text(`Sentence Variance: ${safeNumber(text.sentenceVariance)}`);
  doc.text(`Lexical Diversity: ${text.lexicalDiversity ?? "N/A"}`);
  doc.text(`Total Words: ${text.totalWords ?? "N/A"}`);
  doc.text(`Total Sentences: ${text.totalSentences ?? "N/A"}`);

  doc.moveDown();
  doc.fontSize(16).text("Flags");
  const flags = Array.isArray(analytics.flags) ? analytics.flags : [];
  if (flags.length === 0) {
    doc.fontSize(12).text("No suspicious behavior detected.");
  } else {
    flags.forEach((flag: any, index: number) => {
      doc.fontSize(12).text(`${index + 1}. ${flag.message ?? "Flag raised"}`);
    });
  }

  doc.end();
};
