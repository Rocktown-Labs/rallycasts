/* @jsxImportSource react */
import { render } from "@react-email/components";

import ResetPasswordEmail from "./templates/reset-password";
import WelcomeEmail from "./templates/welcome";

export async function renderWelcomeEmail(options: {
  username: string;
  verificationUrl?: string;
}): Promise<string> {
  const html = await render(
    <WelcomeEmail
      username={options.username}
      verificationUrl={options.verificationUrl}
    />
  );

  return html;
}

export async function renderResetPasswordEmail(options: {
  resetUrl: string;
  username: string;
}): Promise<string> {
  const html = await render(
    <ResetPasswordEmail
      resetUrl={options.resetUrl}
      username={options.username}
    />
  );

  return html;
}
