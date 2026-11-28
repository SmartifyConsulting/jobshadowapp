import { PDFDocument, StandardFonts, rgb, type PDFFont } from "pdf-lib";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

type PlacementInfo = { scholarName: string; school: string; career: string; shadowDate: string; location: string };

function wrapText(text: string, font: PDFFont, size: number, maxWidth: number): string[] {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let line = "";
  for (const word of words) {
    const candidate = line ? `${line} ${word}` : word;
    if (font.widthOfTextAtSize(candidate, size) > maxWidth && line) {
      lines.push(line);
      line = word;
    } else {
      line = candidate;
    }
  }
  if (line) lines.push(line);
  return lines;
}

/** Builds a one-page signed indemnity PDF: title, placement details, clause text (either the
 * standard JobShadow wording or a company's AI-extracted clauses), and the captured signature
 * image with the guardian's typed name/contact and today's date. */
export async function buildSignedIndemnityPdf(opts: {
  title: string;
  clauses: string[];
  placement: PlacementInfo;
  guardianName: string;
  guardianContact: string;
  signaturePngDataUrl: string;
}): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const margin = 50;
  const pageWidth = 595;
  const maxWidth = pageWidth - margin * 2;

  let page = pdf.addPage([pageWidth, 842]);
  let y = 792;

  function newPageIfNeeded(lineHeight: number) {
    if (y < margin + lineHeight) {
      page = pdf.addPage([pageWidth, 842]);
      y = 792;
    }
  }

  function drawLine(text: string, opts2: { size?: number; font?: typeof font; gap?: number } = {}) {
    const size = opts2.size ?? 10;
    const f = opts2.font ?? font;
    newPageIfNeeded(size + 4);
    page.drawText(text, { x: margin, y, size, font: f, color: rgb(0.1, 0.1, 0.1) });
    y -= size + (opts2.gap ?? 4);
  }

  function drawParagraph(text: string, size = 10) {
    for (const line of wrapText(text, font, size, maxWidth)) drawLine(line, { size });
    y -= 6;
  }

  drawLine(opts.title, { size: 16, font: bold, gap: 12 });
  drawLine(`Scholar: ${opts.placement.scholarName}    School: ${opts.placement.school}`, { size: 10 });
  drawLine(`Career / Role: ${opts.placement.career}    Date: ${opts.placement.shadowDate}`, { size: 10 });
  drawLine(`Location: ${opts.placement.location}`, { size: 10, gap: 14 });

  for (const clause of opts.clauses) drawParagraph(clause);

  y -= 10;
  newPageIfNeeded(90);
  const sigBytes = Buffer.from(opts.signaturePngDataUrl.split(",")[1] ?? "", "base64");
  const sigImage = await pdf.embedPng(sigBytes);
  const sigDims = sigImage.scaleToFit(200, 60);
  page.drawImage(sigImage, { x: margin, y: y - sigDims.height, width: sigDims.width, height: sigDims.height });
  y -= sigDims.height + 4;
  drawLine("Parent / Guardian signature", { size: 8 });
  y -= 8;
  drawLine(`Parent / Guardian name: ${opts.guardianName}`, { size: 10 });
  drawLine(`Contact number: ${opts.guardianContact}`, { size: 10 });
  drawLine(`Date signed: ${new Date().toLocaleDateString("en-ZA")}`, { size: 10 });

  return pdf.save();
}

/** Reads the standard indemnity clause text from the database (admin-editable via the Legal
 * Content admin tab) instead of hardcoding it, split into paragraphs on blank lines. */
export async function standardIndemnityClauses(): Promise<string[]> {
  const { data } = await supabaseAdmin.from("legal_documents").select("body").eq("key", "standard_indemnity_clauses").maybeSingle();
  const body = data?.body ?? "Please contact Job Shadow for the current indemnity wording.";
  return body.split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean);
}
