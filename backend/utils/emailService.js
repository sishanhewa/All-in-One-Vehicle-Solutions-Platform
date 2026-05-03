const nodemailer = require('nodemailer');
const dns = require('dns');

// Force Node.js to resolve DNS to IPv4 first (fixes ENETUNREACH on Render)
dns.setDefaultResultOrder('ipv4first');

const sendInspectionReportEmail = async (toEmail, userName, pdfBuffer, reportNumber) => {
  const transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 465,
    secure: true,
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
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
