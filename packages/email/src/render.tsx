const escapeHtml = (value: string): string =>
  value.replaceAll(
    /[&<>"']/gu,
    (character) =>
      ({
        '"': "&quot;",
        "&": "&amp;",
        "'": "&#39;",
        "<": "&lt;",
        ">": "&gt;",
      })[character] ?? character
  );

const renderDocument = (
  preview: string,
  content: string
): string => `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${escapeHtml(preview)}</title>
  </head>
  <body style="margin:0;background:#f6f9fc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Ubuntu,sans-serif;color:#4b5563;">
    <div style="max-width:640px;margin:0 auto;padding:20px 0 48px;background:#ffffff;">
      ${content}
    </div>
  </body>
</html>`;

const renderButton = (label: string, url: string, color: string): string =>
  `<p style="margin:16px 48px;text-align:center;">
    <a href="${escapeHtml(url)}" style="display:inline-block;padding:12px 24px;border-radius:8px;background:${color};color:#ffffff;font-size:16px;font-weight:600;text-decoration:none;">${escapeHtml(label)}</a>
  </p>`;

export function renderWelcomeEmail(options: {
  username: string;
  verificationUrl?: string;
}): Promise<string> {
  const username = escapeHtml(options.username);
  const verification = options.verificationUrl
    ? `<p style="padding:0 48px;font-size:16px;line-height:26px;">Please verify your email address to unlock all features:</p>${renderButton("Verify Email", options.verificationUrl, "#4f46e5")}`
    : "";

  return Promise.resolve(
    renderDocument(
      "Welcome to RallyCasts — Your padel journey starts here",
      `<div style="text-align:center;"><img src="https://rallycasts.com/logo.png" alt="RallyCasts" width="42" height="42" /></div>
      <h1 style="padding:0 48px;color:#111827;font-size:32px;line-height:1.3;text-align:center;">Welcome to RallyCasts, ${username}!</h1>
      <p style="padding:0 48px;font-size:16px;line-height:26px;">You just joined the fastest-growing padel community. Track matches, discover events, and connect with players near you.</p>
      ${renderButton("Explore Events", "https://rallycasts.com", "#111827")}
      <p style="padding:0 48px;font-size:16px;line-height:26px;">Here is what you can do next:</p>
      <ul style="padding:0 48px 0 72px;font-size:16px;line-height:26px;">
        <li style="margin-bottom:8px;"><strong>Complete your profile</strong> — Add your rating and home venue</li>
        <li style="margin-bottom:8px;"><strong>Join an event</strong> — Find tournaments and social play near you</li>
        <li style="margin-bottom:8px;"><strong>Track your matches</strong> — Log scores and see your progress</li>
      </ul>
      ${verification}
      <p style="padding:0 48px;font-size:16px;line-height:26px;">Got questions? Reply to this email or reach out on <a href="https://rallycasts.com/support" style="color:#4f46e5;text-decoration:underline;">our support page</a>.</p>
      <p style="margin-top:32px;padding:0 48px;color:#9ca3af;font-size:14px;text-align:center;">RallyCasts — Built for padel players, by padel players.</p>`
    )
  );
}

export function renderResetPasswordEmail(options: {
  resetUrl: string;
  username: string;
}): Promise<string> {
  const username = escapeHtml(options.username);
  const resetUrl = escapeHtml(options.resetUrl);

  return Promise.resolve(
    renderDocument(
      "Reset your RallyCasts password",
      `<h1 style="padding:0 48px;color:#111827;font-size:32px;line-height:1.3;text-align:center;">Password Reset Request</h1>
      <p style="padding:0 48px;font-size:16px;line-height:26px;">Hi ${username},</p>
      <p style="padding:0 48px;font-size:16px;line-height:26px;">We received a request to reset your RallyCasts password. Click the button below to choose a new one. This link expires in 1 hour.</p>
      ${renderButton("Reset Password", options.resetUrl, "#4f46e5")}
      <p style="padding:0 48px;font-size:16px;line-height:26px;">If you did not request this reset, you can safely ignore this email. Your password will not be changed.</p>
      <p style="padding:0 48px;font-size:16px;line-height:26px;">If the button does not work, copy and paste this link into your browser: <a href="${resetUrl}" style="color:#4f46e5;text-decoration:underline;word-break:break-all;">${resetUrl}</a></p>
      <p style="margin-top:32px;padding:0 48px;color:#9ca3af;font-size:14px;text-align:center;">RallyCasts — Built for padel players, by padel players.</p>`
    )
  );
}
