import { Resend } from "resend";

export const EMAIL_FROM = "RallyCasts <noreply@dinks.rallycasts.com>";

export interface SendEmailOptions {
  from: string;
  html: string;
  subject: string;
  text: string;
  to: string | string[];
}

export const createEmailSender = (apiKey: string) => {
  const resend = new Resend(apiKey);

  return {
    send: async (options: SendEmailOptions) => {
      const { data, error } = await resend.emails.send({
        from: options.from,
        html: options.html,
        subject: options.subject,
        text: options.text,
        to: options.to,
      });

      if (error) {
        throw new Error(`Failed to send email: ${error.message}`);
      }

      return data;
    },
  };
};

export type EmailSender = ReturnType<typeof createEmailSender>;
