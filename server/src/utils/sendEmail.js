const nodemailer = require('nodemailer');
const handlebars = require('handlebars');
const fs = require('fs');
const path = require('path');

const sendEmail = async ({ email, subject, templateName, context }) => {
    try {
        const transporter = nodemailer.createTransport({
            host: process.env.SMTP_HOST,
            port: process.env.SMTP_PORT,
            secure: process.env.SMTP_PORT == 465, // true for 465, false for other ports
            auth: {
                user: process.env.SMTP_USER,
                pass: process.env.SMTP_PASS,
            },
        });

        // Read template
        const templatePath = path.join(__dirname, `../../email_templates/${templateName}`);
        const source = fs.readFileSync(templatePath, 'utf8');

        // Compile template
        const template = handlebars.compile(source);
        const html = template(context);

        // Send email
        const info = await transporter.sendMail({
            from: process.env.SMTP_FROM,
            to: email,
            subject: subject,
            html: html,
        });


        // Preview only available when sending through an Ethereal account
        if (process.env.SMTP_HOST.includes('ethereal')) {
            console.log("Preview URL: %s", nodemailer.getTestMessageUrl(info));
        }

        return info;
    } catch (error) {
        console.error("Error sending email:", error);
        throw new Error('Email sending failed');
    }
};

module.exports = sendEmail;
