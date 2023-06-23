import nodemailer from "nodemailer";
import SMTPTransport from "nodemailer/lib/smtp-transport";
import { getEnvironmentVariable } from "./envUtils";

type MailData = {
  from: string;
  to: string;
  subject: string;
  text: string;
  html: string;
};

const smtpTransport = nodemailer.createTransport({
  host: getEnvironmentVariable("SMTP_HOST"),
  secure: false,
  port: Number(getEnvironmentVariable("SMTP_PORT")),
  tls: {
    rejectUnauthorized: false,
  },
  auth: {
    user: getEnvironmentVariable("SMTP_AUTH_USER"),
    pass: getEnvironmentVariable("SMTP_AUTH_PASS"),
  },
});

const verifyMail = async (): Promise<boolean> => {
  try {
    await smtpTransport.verify();
    return true;
  } catch (error) {
    console.error("[src/utils/mailUtils.ts/verifyMail()]", error);
    return false;
  }
};

const sendMail = async (data: MailData): Promise<boolean> => {
  const result: SMTPTransport.SentMessageInfo = await smtpTransport.sendMail(
    data
  );
  return result.accepted.includes(data.to);
};

export { verifyMail, sendMail };
