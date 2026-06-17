/* @jsxImportSource react */
import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Html,
  Link,
  Preview,
  Section,
  Text,
} from "@react-email/components";

interface ResetPasswordEmailProps {
  username: string;
  resetUrl: string;
}

export const ResetPasswordEmail = ({
  username,
  resetUrl,
}: ResetPasswordEmailProps) => (
  <Html>
    <Head />
    <Preview>Reset your RallyCasts password</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={heading}>Password Reset Request</Heading>
        <Text style={paragraph}>Hi {username},</Text>
        <Text style={paragraph}>
          We received a request to reset your RallyCasts password. Click the
          button below to choose a new one. This link expires in 1 hour.
        </Text>
        <Section style={btnContainer}>
          <Button href={resetUrl} style={button}>
            Reset Password
          </Button>
        </Section>
        <Text style={paragraph}>
          If you did not request this reset, you can safely ignore this email.
          Your password will not be changed.
        </Text>
        <Text style={paragraph}>
          If the button does not work, copy and paste this link into your
          browser:{" "}
          <Link href={resetUrl} style={link}>
            {resetUrl}
          </Link>
        </Text>
        <Text style={footer}>
          RallyCasts — Built for padel players, by padel players.
        </Text>
      </Container>
    </Body>
  </Html>
);

ResetPasswordEmail.PreviewProps = {
  resetUrl: "https://rallycasts.com/reset-password?token=example",
  username: "Alex",
} as ResetPasswordEmailProps;

export default ResetPasswordEmail;

const main = {
  backgroundColor: "#f6f9fc",
  fontFamily:
    '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Ubuntu, sans-serif',
};

const container = {
  backgroundColor: "#ffffff",
  margin: "0 auto",
  marginBottom: "64px",
  padding: "20px 0 48px",
};

const heading = {
  color: "#111827",
  fontSize: "32px",
  fontWeight: "700",
  lineHeight: "1.3",
  padding: "0 48px",
  textAlign: "center" as const,
};

const paragraph = {
  color: "#4b5563",
  fontSize: "16px",
  lineHeight: "26px",
  padding: "0 48px",
};

const btnContainer = {
  padding: "16px 48px",
  textAlign: "center" as const,
};

const button = {
  backgroundColor: "#4f46e5",
  borderRadius: "8px",
  color: "#ffffff",
  display: "inline-block",
  fontSize: "16px",
  fontWeight: "600",
  padding: "12px 24px",
  textAlign: "center" as const,
  textDecoration: "none",
};

const link = {
  color: "#4f46e5",
  textDecoration: "underline",
  wordBreak: "break-all" as const,
};

const footer = {
  color: "#9ca3af",
  fontSize: "14px",
  marginTop: "32px",
  padding: "0 48px",
  textAlign: "center" as const,
};
