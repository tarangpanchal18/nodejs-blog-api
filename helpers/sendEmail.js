const nodemailer = require('nodemailer');
require('dotenv').config();

const transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: process.env.EMAIL_PORT,
    secure: process.env.EMAIL_PORT == 465,
    auth: {
        user: process.env.EMAIL_HOST_USER,
        pass: process.env.EMAIL_HOST_PASSWORD,
    },
});

const sendEmail = async ({ to, subject, text, html }) => {
    try {
        const info = await transporter.sendMail({
            from: process.env.EMAIL_FROM,
            to,
            subject,
            text,
            html,
        });

        return info;
    } catch (err) {
        console.error('Error sending email:', err);
        throw err;
    }
}

module.exports = sendEmail;
