const nodemailer = require('nodemailer');

const sendInspectionReportEmail = async (toEmail, userName, pdfBuffer, reportNumber) => {
  // Transporter configured for Gmail (port 587 for cloud compatibility)
  const transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 587,
    secure: false,
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
    connectionTimeout: 10000,
    greetingTimeout: 10000,
    socketTimeout: 15000,
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
    await transporter.sendMail(mailOptions);
    console.log(`Email successfully sent to ${toEmail}`);
  } catch (error) {
    console.error(`Failed to send email to ${toEmail}: `, error.message);
    // Don't throw the error, we don't want the API to crash if email fails
  }
};

module.exports = {
  sendInspectionReportEmail,
};
