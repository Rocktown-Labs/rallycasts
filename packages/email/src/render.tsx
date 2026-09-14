const BRAND_GREEN = "#005c32";
const BRAND_LIME = "#bcdf21";
const TEXT_DARK = "#10231b";
const TEXT_MUTED = "#51645a";
const SURFACE = "#f1f7f2";

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
  <body bgcolor="#eef4ef" style="margin:0;background:#eef4ef;color:${TEXT_DARK};font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;">
    <span style="display:none!important;max-height:0;overflow:hidden;opacity:0;color:transparent;">${escapeHtml(preview)}</span>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="width:100%;background:#eef4ef;">
      <tr>
        <td align="center" style="padding:28px 12px;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:620px;background:#ffffff;border-radius:18px;overflow:hidden;">
            <tr>
              <td align="center" style="padding:24px 32px;background:${BRAND_GREEN};">
                <a href="https://rallycasts.com" style="text-decoration:none;">
                  <img src="https://rallycasts.com/rallycasts-email-logo.png" alt="RallyCasts" width="220" height="55" style="display:block;width:220px;height:55px;margin:0 auto;border:0;" />
                </a>
                <div style="margin-top:10px;color:${BRAND_LIME};font-size:9px;font-weight:700;letter-spacing:1.5px;line-height:14px;">PLAY · CONNECT · COMPETE</div>
              </td>
            </tr>
            <tr>
              <td style="padding:38px 42px 18px;">${content}</td>
            </tr>
            <tr>
              <td style="padding:24px 42px 30px;border-top:1px solid #e4ece6;background:#fbfdfb;color:${TEXT_MUTED};font-size:12px;line-height:20px;text-align:center;">
                <strong style="color:${BRAND_GREEN};">RallyCasts</strong> — your pickleball community, from first serve to final point.<br />
                <a href="https://rallycasts.com" style="color:${BRAND_GREEN};font-weight:700;text-decoration:none;">Visit RallyCasts</a>
                <span style="color:#b7c4bb;"> · </span>
                <a href="https://rallycasts.com/support" style="color:${BRAND_GREEN};font-weight:700;text-decoration:none;">Support</a>
              </td>
            </tr>
          </table>
          <p style="margin:16px 0 0;color:#789084;font-size:11px;line-height:18px;text-align:center;">You are receiving this transactional email because of activity on your RallyCasts account.</p>
        </td>
      </tr>
    </table>
  </body>
</html>`;

const renderButton = (label: string, url: string): string =>
  `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:28px 0;">
    <tr>
      <td align="center" bgcolor="${BRAND_LIME}" style="border-radius:10px;background:${BRAND_LIME};">
        <a href="${escapeHtml(url)}" style="display:inline-block;padding:15px 24px;border:1px solid ${BRAND_LIME};border-radius:10px;color:${BRAND_GREEN};font-size:15px;font-weight:900;line-height:20px;text-decoration:none;">${escapeHtml(label)}</a>
      </td>
    </tr>
  </table>`;

const renderEyebrow = (text: string): string =>
  `<p style="margin:0 0 10px;color:${BRAND_GREEN};font-size:11px;font-weight:900;letter-spacing:1.8px;line-height:16px;text-transform:uppercase;">${escapeHtml(text)}</p>`;

export function renderWelcomeEmail(options: {
  username: string;
  verificationUrl?: string;
}): Promise<string> {
  const username = escapeHtml(options.username);
  const verification = options.verificationUrl
    ? `${renderButton("Verify my email", options.verificationUrl)}
      <p style="margin:0;color:${TEXT_MUTED};font-size:13px;line-height:21px;">This link confirms your account and unlocks the full RallyCasts experience.</p>`
    : "";

  return Promise.resolve(
    renderDocument(
      "Welcome to RallyCasts — your next pickleball match starts here",
      `${renderEyebrow("Welcome to the rally")}
      <h1 style="margin:0;color:${TEXT_DARK};font-size:34px;line-height:42px;letter-spacing:-0.5px;">Let’s get you on court, ${username}.</h1>
      <p style="margin:18px 0 0;color:${TEXT_MUTED};font-size:16px;line-height:27px;">RallyCasts is where pickleball players discover events, follow local players, and keep every point moving.</p>
      ${verification}
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-top:30px;border-radius:14px;background:${SURFACE};">
        <tr>
          <td style="padding:18px 14px;color:${TEXT_DARK};font-size:13px;line-height:20px;text-align:center;" width="33%"><strong style="display:block;color:${BRAND_GREEN};font-size:22px;line-height:28px;">01</strong>Find your next event</td>
          <td style="padding:18px 14px;color:${TEXT_DARK};font-size:13px;line-height:20px;text-align:center;" width="33%"><strong style="display:block;color:${BRAND_GREEN};font-size:22px;line-height:28px;">02</strong>Follow the local game</td>
          <td style="padding:18px 14px;color:${TEXT_DARK};font-size:13px;line-height:20px;text-align:center;" width="33%"><strong style="display:block;color:${BRAND_GREEN};font-size:22px;line-height:28px;">03</strong>Share the rally</td>
        </tr>
      </table>
      <p style="margin:26px 0 0;color:${TEXT_MUTED};font-size:13px;line-height:21px;">Questions? Reply to this email or visit <a href="https://rallycasts.com/support" style="color:${BRAND_GREEN};font-weight:700;text-decoration:underline;">RallyCasts support</a>.</p>`
    )
  );
}

export function renderResetPasswordEmail(options: {
  resetUrl: string;
  username: string;
}): Promise<string> {
  const username = escapeHtml(options.username);

  return Promise.resolve(
    renderDocument(
      "Reset your RallyCasts password — get back in the game",
      `${renderEyebrow("Account security")}
      <h1 style="margin:0;color:${TEXT_DARK};font-size:34px;line-height:42px;letter-spacing:-0.5px;">Get back in the game.</h1>
      <p style="margin:18px 0 0;color:${TEXT_MUTED};font-size:16px;line-height:27px;">Hi ${username}, we received a request to reset your RallyCasts password.</p>
      <p style="margin:14px 0 0;color:${TEXT_MUTED};font-size:16px;line-height:27px;">Choose a new password below and you’ll be ready for your next pickleball match.</p>
      ${renderButton("Choose a new password", options.resetUrl)}
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:4px 0 24px;border-left:4px solid ${BRAND_LIME};background:${SURFACE};">
        <tr><td style="padding:14px 16px;color:${TEXT_DARK};font-size:13px;line-height:21px;"><strong>Security note:</strong> this link expires in 1 hour. If you didn’t request it, you can safely ignore this email.</td></tr>
      </table>
      <p style="margin:0;color:${TEXT_MUTED};font-size:13px;line-height:21px;">The button not working? <a href="${escapeHtml(options.resetUrl)}" style="color:${BRAND_GREEN};font-weight:700;text-decoration:underline;">Open the secure reset page</a>.</p>`
    )
  );
}
