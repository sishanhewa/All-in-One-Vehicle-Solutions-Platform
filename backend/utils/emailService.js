const nodemailer = require('nodemailer');

const sendInspectionReportEmail = async (toEmail, userName, pdfBuffer, reportNumber) => {
  // Transporter configured for Gmail
  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_USER, // e.g. your-email@gmail.com
      pass: process.env.EMAIL_PASS, // e.g. 16-character app password
    },
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
