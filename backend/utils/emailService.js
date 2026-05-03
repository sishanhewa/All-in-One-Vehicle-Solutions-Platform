const nodemailer = require('nodemailer');
const dns = require('dns');
const { promisify } = require('util');

const resolve4 = promisify(dns.resolve4);

const sendInspectionReportEmail = async (toEmail, userName, pdfBuffer, reportNumber) => {
  // Manually resolve Gmail SMTP to IPv4 — Render's free tier doesn't support IPv6
  let host = 'smtp.gmail.com';
  try {
    const addresses = await resolve4('smtp.gmail.com');
    host = addresses[0];
    console.log('[EMAIL] Resolved smtp.gmail.com to IPv4:', host);
  } catch (dnsErr) {
    console.error('[EMAIL] DNS resolve failed, using hostname:', dnsErr.message);
  }

  const transporter = nodemailer.createTransport({
    host: host,
    port: 465,
    secure: true,
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
    tls: {
      servername: 'smtp.gmail.com', // Required for TLS cert validation
    },
    connectionTimeout: 30000,
    greetingTimeout: 30000,
    socketTimeout: 60000,
  });

  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: toEmail,
    subject: `Your Vehicle Inspection Report (#${reportNumber || 'N/A'}) is Ready!`,
    html: `
      <h3>Hello ${userName},</h3>
      <p>Your vehicle inspection has been completed successfully.</p>
      <p>We have attached the detailed PDF report of the inspection for your records.</p>
      <p>Thank you for choosing our service!</p>
      <br/>
      <p>Best Regards,</p>
      <p><strong>Vehicle Management System Team</strong></p>
    `,
    attachments: [
      {
        filename: `Inspection_${reportNumber || 'Report'}.pdf`,
        content: pdfBuffer,
        contentType: 'application/pdf',
      },
    ],
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log(`Email successfully sent to ${toEmail}`, info.response);
  } catch (error) {
    console.error(`Failed to send email to ${toEmail}: `, error.message);
    throw error;
  }
};

module.exports = {
  sendInspectionReportEmail,
};
