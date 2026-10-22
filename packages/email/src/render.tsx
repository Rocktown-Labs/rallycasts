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

export function renderOtpEmail(options: {
  otp: string;
  type: "change-email" | "email-verification" | "forget-password" | "sign-in";
  username?: string;
}): Promise<string> {
  const otp = escapeHtml(options.otp);
  const username = escapeHtml(options.username ?? "");

  const copy = {
    "change-email": {
      eyebrow: "Confirm your new email",
      heading: "Confirm the change.",
      preview: "Your RallyCasts email change code",
      subject: "email change code",
    },
    "email-verification": {
      eyebrow: "Verify your email",
      heading: "Confirm it's you.",
      preview: "Your RallyCasts verification code",
      subject: "verification code",
    },
    "forget-password": {
      eyebrow: "Password reset",
      heading: "Reset your password.",
      preview: "Your RallyCasts password reset code",
      subject: "password reset code",
    },
    "sign-in": {
      eyebrow: "Secure sign-in",
      heading: "Your sign-in code.",
      preview: "Your RallyCasts sign-in code",
      subject: "sign-in code",
    },
  }[options.type];

  const greeting = username
    ? `Hi ${username}, use this code to continue.`
    : "Use this code to continue.";

  return Promise.resolve(
    renderDocument(
      copy.preview,
      `${renderEyebrow(copy.eyebrow)}
      <h1 style="margin:0;color:${TEXT_DARK};font-size:34px;line-height:42px;letter-spacing:-0.5px;">${copy.heading}</h1>
      <p style="margin:18px 0 0;color:${TEXT_MUTED};font-size:16px;line-height:27px;">${greeting}</p>
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:28px 0;">
        <tr>
          <td align="center" style="border:2px solid ${BRAND_LIME};border-radius:14px;background:${SURFACE};padding:22px 12px;">
            <span style="display:inline-block;color:${BRAND_GREEN};font-size:40px;font-weight:900;letter-spacing:10px;line-height:46px;">${otp}</span>
          </td>
        </tr>
      </table>
      <p style="margin:0;color:${TEXT_MUTED};font-size:13px;line-height:21px;">This code expires in 10 minutes. If you didn't request it, you can safely ignore this email.</p>`
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

export function renderMatchCallEmail(options: {
  courtLabel: string;
  eventName: string;
  matchUrl: string;
  opponentName: string;
  roundName: string;
  username: string;
}): Promise<string> {
  const username = escapeHtml(options.username);
  const courtLabel = escapeHtml(options.courtLabel);
  const eventName = escapeHtml(options.eventName);
  const opponentName = escapeHtml(options.opponentName);
  const roundName = escapeHtml(options.roundName);

  return Promise.resolve(
    renderDocument(
      `Match Ready: ${options.courtLabel} vs ${options.opponentName} — ${options.eventName}`,
      `${renderEyebrow(`Court Assignment · ${roundName.toUpperCase()}`)}
      <h1 style="margin:0;color:${TEXT_DARK};font-size:32px;line-height:40px;letter-spacing:-0.5px;">You're up on ${courtLabel}!</h1>
      <p style="margin:16px 0 0;color:${TEXT_MUTED};font-size:16px;line-height:26px;">Hi ${username}, your next match in <strong>${eventName}</strong> has been called. Head over to your assigned court now.</p>
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:24px 0;border-radius:14px;background:${SURFACE};border:1px solid #dbe8dd;">
        <tr>
          <td style="padding:16px 20px;border-bottom:1px solid #dbe8dd;">
            <span style="display:block;color:${TEXT_MUTED};font-size:11px;font-weight:700;letter-spacing:1px;text-transform:uppercase;">Court</span>
            <strong style="color:${BRAND_GREEN};font-size:18px;">${courtLabel}</strong>
          </td>
        </tr>
        <tr>
          <td style="padding:16px 20px;border-bottom:1px solid #dbe8dd;">
            <span style="display:block;color:${TEXT_MUTED};font-size:11px;font-weight:700;letter-spacing:1px;text-transform:uppercase;">Opponent</span>
            <strong style="color:${TEXT_DARK};font-size:16px;">${opponentName}</strong>
          </td>
        </tr>
        <tr>
          <td style="padding:16px 20px;">
            <span style="display:block;color:${TEXT_MUTED};font-size:11px;font-weight:700;letter-spacing:1px;text-transform:uppercase;">Stage</span>
            <strong style="color:${TEXT_DARK};font-size:15px;">${roundName}</strong>
          </td>
        </tr>
      </table>
      ${renderButton("View Match & Submit Scores", options.matchUrl)}
      <p style="margin:16px 0 0;color:${TEXT_MUTED};font-size:13px;line-height:21px;">Once the match ends, enter game scores from the match screen to advance the live bracket.</p>`
    )
  );
}

export function renderTournamentWonEmail(options: {
  eventName: string;
  eventUrl: string;
  username: string;
}): Promise<string> {
  const username = escapeHtml(options.username);
  const eventName = escapeHtml(options.eventName);

  return Promise.resolve(
    renderDocument(
      `🏆 Tournament Champion! Congratulations on winning ${options.eventName}`,
      `${renderEyebrow("Championship Victory")}
      <h1 style="margin:0;color:${TEXT_DARK};font-size:34px;line-height:42px;letter-spacing:-0.5px;">Congratulations, Champion ${username}!</h1>
      <p style="margin:16px 0 0;color:${TEXT_MUTED};font-size:16px;line-height:27px;">You claimed 1st place in <strong>${eventName}</strong> after an incredible run through the tournament bracket!</p>
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:24px 0;border-radius:14px;background:${SURFACE};border:2px solid ${BRAND_LIME};">
        <tr>
          <td align="center" style="padding:24px 20px;">
            <span style="font-size:42px;line-height:48px;">🏆</span>
            <h2 style="margin:8px 0 4px;color:${BRAND_GREEN};font-size:20px;">Tournament Champion</h2>
            <p style="margin:0;color:${TEXT_MUTED};font-size:14px;">${eventName}</p>
          </td>
        </tr>
      </table>
      ${renderButton("View Final Bracket", options.eventUrl)}
      <p style="margin:16px 0 0;color:${TEXT_MUTED};font-size:13px;line-height:21px;">Your championship match results and tournament record have been saved to your player profile.</p>`
    )
  );
}
