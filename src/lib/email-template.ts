// Pure, client-safe renderer for branded Job Shadow emails.
export const SITE_URL = "https://jobshadow.co.za";
export const LOGO_URL = `${SITE_URL}/__l5e/assets-v1/89ef579f-b9d6-4e09-9ab3-227f0aa7d824/jobshadow-logo.png`;

const BRAND = { red: "#df1b41", deepRed: "#c80015", yellow: "#f9db01", green: "#7dc600", teal: "#6cc5c0", ink: "#1f1f1f" };

const CTA: Record<string, { label: string; path: string }> = {
  applicant_application_complete: { label: "Upload signed indemnity", path: "/my-account" },
  applicant_thank_you: { label: "View my booking", path: "/my-account" },
  shadow_reminder_scholar: { label: "View my booking", path: "/my-account" },
  scholar_evaluation_request: { label: "Visit Job Shadow", path: "/" },
  mentor_application_complete: { label: "Open Mentor Portal", path: "/mentor" },
  mentor_welcome_pack: { label: "Open Mentor Portal", path: "/register" },
  mentor_evaluation_request: { label: "Open Mentor Portal", path: "/mentor" },
  ad_hoc_date_request: { label: "Review in Admin", path: "/admin" },
  hr_application_complete: { label: "Visit Job Shadow", path: "/" },
};

export function escapeHtml(s: string) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function linkify(s: string) {
  return s
    .replace(/(https?:\/\/[^\s<)]+)/g, `<a href="$1" style="color:${BRAND.red};font-weight:bold">$1</a>`)
    .replace(/\b(info@jobshadow\.co\.za)\b/g, `<a href="mailto:$1" style="color:${BRAND.red};font-weight:bold">$1</a>`);
}

export function renderEmailHtml(opts: { template: string; subject: string; body: string }) {
  const title = opts.subject.replace(/^JobShadow:\s*/i, "");
  const paras = opts.body
    .split(/\n{2,}|(?<=\.)\s+(?=[A-Z][a-z]+:)/)
    .map((p) => p.trim())
    .filter(Boolean)
    .map((p) => `<p style="margin:0 0 14px;font-size:15px;line-height:1.6;color:${BRAND.ink}">${linkify(escapeHtml(p)).replace(/\n/g, "<br>")}</p>`)
    .join("");
  const cta = CTA[opts.template];
  const button = cta
    ? `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:22px 0 6px"><tr><td style="background:${BRAND.green}">
<a href="${SITE_URL}${cta.path}" style="display:inline-block;padding:13px 26px;font-family:Arial,sans-serif;font-size:14px;font-weight:bold;letter-spacing:1px;text-transform:uppercase;color:#ffffff;text-decoration:none">${escapeHtml(cta.label)}</a></td></tr></table>`
    : "";
  return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHtml(opts.subject)}</title></head>
<body style="margin:0;padding:0;background:#f4f4f4;font-family:'Work Sans',Arial,sans-serif">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f4"><tr><td align="center" style="padding:24px 12px">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#ffffff">
<tr><td align="center" style="background:${BRAND.red};padding:22px 24px"><a href="${SITE_URL}"><img src="${LOGO_URL}" alt="Job Shadow" width="180" style="display:block;width:180px;max-width:60%;height:auto;border:0"></a></td></tr>
<tr><td style="height:6px;background:${BRAND.yellow};font-size:0;line-height:0">&nbsp;</td></tr>
<tr><td style="padding:30px 32px 10px">
<h1 style="margin:0 0 18px;font-family:'Permanent Marker',Impact,Arial,sans-serif;font-size:26px;line-height:1.25;color:${BRAND.deepRed};text-transform:uppercase">${escapeHtml(title)}</h1>
${paras}${button}
</td></tr>
<tr><td style="padding:10px 32px 30px;font-size:14px;color:${BRAND.ink}">Kind regards,<br><strong>The Job Shadow team</strong></td></tr>
<tr><td style="background:${BRAND.deepRed};padding:20px 32px;color:#ffffff;font-size:12px;line-height:1.6;text-align:center">
<strong style="color:${BRAND.yellow};letter-spacing:1px">TRY BEFORE YOU APPLY</strong><br>
Questions? <a href="mailto:info@jobshadow.co.za" style="color:#ffffff">info@jobshadow.co.za</a> · <a href="${SITE_URL}" style="color:#ffffff">jobshadow.co.za</a><br>
You received this email because of a Job Shadow booking or account.</td></tr>
</table></td></tr></table></body></html>`;
}
