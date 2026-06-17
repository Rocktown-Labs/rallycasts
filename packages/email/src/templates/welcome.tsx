/* @jsxImportSource react */
import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Html,
  Img,
  Link,
  Preview,
  Section,
  Text,
} from "@react-email/components";

interface WelcomeEmailProps {
  username: string;
  verificationUrl?: string;
}

export const WelcomeEmail = ({
  username,
  verificationUrl,
}: WelcomeEmailProps) => (
  <Html>
    <Head />
    <Preview>Welcome to RallyCasts — Your padel journey starts here</Preview>
    <Body style={main}>
      <Container style={container}>
        <Img
          alt="RallyCasts"
          height="42"
          src="https://rallycasts.com/logo.png"
          style={logo}
          width="42"
        />
        <Heading style={heading}>Welcome to RallyCasts, {username}!</Heading>
        <Text style={paragraph}>
          You just joined the fastest-growing padel community. Track matches,
          discover events, and connect with players near you.
        </Text>
        <Section style={btnContainer}>
          <Button href="https://rallycasts.com" style={button}>
            Explore Events
          </Button>
        </Section>
        <Text style={paragraph}>Here is what you can do next:</Text>
        <ul style={list}>
          <li style={listItem}>
            <strong>Complete your profile</strong> — Add your rating and home
            venue
          </li>
          <li style={listItem}>
            <strong>Join an event</strong> — Find tournaments and social play
            near you
          </li>
          <li style={listItem}>
            <strong>Track your matches</strong> — Log scores and see your
            progress
          </li>
        </ul>
        {verificationUrl && (
          <>
            <Text style={paragraph}>
              Please verify your email address to unlock all features:
            </Text>
            <Section style={btnContainer}>
              <Button href={verificationUrl} style={buttonSecondary}>
                Verify Email
              </Button>
            </Section>
          </>
        )}
        <Text style={paragraph}>
          Got questions? Reply to this email or reach out on{" "}
          <Link href="https://rallycasts.com/support" style={link}>
            our support page
          </Link>
          .
        </Text>
        <Text style={footer}>
          RallyCasts — Built for padel players, by padel players.
        </Text>
      </Container>
    </Body>
  </Html>
);

WelcomeEmail.PreviewProps = {
  username: "Alex",
  verificationUrl:
    "https://api.rallycasts.com/api/auth/verify-email?token=example",
} as WelcomeEmailProps;

export default WelcomeEmail;

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

const logo = {
  margin: "0 auto",
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

const list = {
  color: "#4b5563",
  fontSize: "16px",
  lineHeight: "26px",
  margin: "16px 0",
  padding: "0 48px 0 72px",
};

const listItem = {
  marginBottom: "8px",
};

const btnContainer = {
  padding: "16px 48px",
  textAlign: "center" as const,
};

const button = {
  backgroundColor: "#111827",
  borderRadius: "8px",
  color: "#ffffff",
  display: "inline-block",
  fontSize: "16px",
  fontWeight: "600",
  padding: "12px 24px",
  textAlign: "center" as const,
  textDecoration: "none",
};

const buttonSecondary = {
  ...button,
  backgroundColor: "#4f46e5",
};

const link = {
  color: "#4f46e5",
  textDecoration: "underline",
};

const footer = {
  color: "#9ca3af",
  fontSize: "14px",
  marginTop: "32px",
  padding: "0 48px",
  textAlign: "center" as const,
};
