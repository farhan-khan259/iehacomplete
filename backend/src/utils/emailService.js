
const nodemailer = require('nodemailer');

const sendEmail = async (options) => {
    try {
        const { EMAIL_HOST, EMAIL_PORT, EMAIL_USER, EMAIL_PASS } = process.env;

        // Validate environment variables
        if (!EMAIL_HOST || !EMAIL_PORT || !EMAIL_USER || !EMAIL_PASS) {
            throw new Error("Email environment variables are not configured properly");
        }

        // Create transporter
        const transporter = nodemailer.createTransport({
            host: EMAIL_HOST,
            port: Number(EMAIL_PORT),
            secure: Number(EMAIL_PORT) === 465, // true for port 465, false otherwise
            auth: {
                user: EMAIL_USER,
                pass: EMAIL_PASS,
            },
        });

        // Email options
        const mailOptions = {
            from: `"IEHA Association" <${EMAIL_USER}>`,
            to: options.email,
            subject: options.subject,
            html: options.message,
        };

        // Send email
        const info = await transporter.sendMail(mailOptions);
        console.log(`Email sent successfully to ${options.email}. Message ID: ${info.messageId}`);
    } catch (error) {
        console.error('Email sending failed:', error);
        throw new Error('Email could not be sent');
    }
};

module.exports = sendEmail;
