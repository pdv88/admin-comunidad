const express = require("express");
const mysql = require("mysql");
const bodyParser = require("body-parser");
const cors = require("cors");
const dotenv = require("dotenv");
const bcrypt = require("bcryptjs");
const fs = require("fs");
const { type } = require("os");
const nodemailer = require("nodemailer");
const handlebars = require("handlebars");
const randomstring = require("randomstring");

const app = express()
app.use(express.json())
dotenv.config()
app.use(
    bodyParser.json({
        verify: (req, res, buf) => {
            req.rawBody = buf;
        },
    })
);
app.use(cors())
app.use(bodyParser.urlencoded({ extended: true }));

const db = mysql.createPool({
    connectionLimit: 10,
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
  });

db.getConnection((err, connection) => {
    if (err) {
      console.error("Error connecting to the database: " + err.stack);
      return;
    }
    console.log("Connected to the database as id " + connection.threadId);
    connection.release();
  });


// ==================================================================================================== //
// ============================================ ROUTES ================================================ //
// ==================================================================================================== //

// ================== Usuario ================== //

// Login

app.post("/login", async (req, res) => {
    const { mail, password } = req.body.login;
    const deviceId = req.body.deviceId;
    db.query("SELECT * FROM users WHERE mail=?", [mail], async (err, result) => {
      if (err) {
        console.error("Error fetching user by mail: " + err);
      }
      if (result.length === 0) {
        res.json({ status: "userFail" });
      } else if (!result[0].verified_email) {
        res.json({ status: "emailNotVerified" });
      } else {
        const hashedPassword = await bcrypt.compare(password, result[0].password);
        if (hashedPassword) {
          db.query(
            "UPDATE users SET device_id=? WHERE mail=?",
            [deviceId, mail],
            async (err, response) => {
              if (err) {
                console.error("Error guardando device_id " + err);
              }
              if (response.affectedRows > 0) {
                const { password, device_id, ...user } = result[0];
                res.json({ ...user, device_id: deviceId, status: "success" });
              } else {
                res.json({ status: "deviceIdFail" });
              }
            }
          );
        } else {
          res.json({ status: "passwordFail" });
        }
      }
    });
  });

  app.post("/register", async (req, res) => {
    const { name, lastname, mail, phone, password } = req.body;
    const hashedPassword = await bcrypt.hash(password, 10);
    db.query("SELECT mail FROM users WHERE mail=?", [mail], (err, result) => {
      if (err) {
        console.error("Error validating mail: " + err);
      }
      if (result.length == 0) {
        const token = randomstring.generate(60);
        db.query(
          "INSERT INTO users (name,lastname,password,mail,phone,subscription,weekly_notification,monthly_notification,verified_email,device_id,email_verification_token) VALUES (?,?,?,?,?,'',true,true,false,'',?)",
          [name, lastname, hashedPassword, mail, phone, token],
          (err, response) => {
            if (err) {
              console.error("Error en la insercion: " + err);
            }
            if (response.affectedRows > 0) {
              const source = fs
                .readFileSync("./email_templates/email_verification.html", "utf8")
                .toString();
              const template = handlebars.compile(source);
              const replacements = {
                mail: mail,
                link: process.env.CLIENT_URL + "/verifyEmail/" + token,
              };
              const htmlToSend = template(replacements);
              const transporter = nodemailer.createTransport({
                host: "smtp.zoho.com",
                secure: true,
                port: 465,
                auth: {
                  user: process.env.NODEMAILER_EMAIL_ADDRESS,
                  pass: process.env.NODEMAILER_EMAIL_PASSWORD,
                },
              });
              const mailOptions = {
                from: process.env.NODEMAILER_EMAIL_ADDRESS,
                to: mail,
                subject: "SUITPI - Verificación de correo",
                html: htmlToSend,
              };
              transporter.sendMail(mailOptions, (err, info) => {
                if (err) {
                  console.error("Error sending email: " + err.stack);
                  return;
                }
                console.log("Email sent: " + info.response);
              });
  
              res.json({ status: "success" });
            }
          }
        );
      } else {
        res.json({ status: "email ya en uso" });
      }
    });
  });
  
  // Verify email
  
  app.put("/verifyEmail", (req, res) => {
    const { token } = req.body;
    db.query(
      "UPDATE users SET verified_email=true, email_verification_token='' WHERE email_verification_token=?",
      [token],
      (err, result) => {
        if (err) {
          console.error("Error verifying email: " + err);
        }
        if (result.affectedRows > 0) {
          res.json({ status: "success" });
        } else {
          res.json({ status: "fail" });
        }
      }
    );
  });
  
  // Resend verification email
  
  app.post("/resendToken", (req, res) => {
    const { email } = req.body;
    db.query(
      "SELECT email_verification_token FROM users WHERE mail=?",
      [email],
      (err, result) => {
        if (err) {
          console.error("Error fetching email verification token: " + err);
        }
        if (result.length > 0) {
          const token = result[0].email_verification_token;
          const source = fs
            .readFileSync("./email_templates/email_verification.html", "utf8")
            .toString();
          const template = handlebars.compile(source);
          const replacements = {
            mail: email,
            link: process.env.CLIENT_URL + "/verifyEmail/" + token,
          };
          const htmlToSend = template(replacements);
          const transporter = nodemailer.createTransport({
            host: "smtp.zoho.com",
            secure: true,
            port: 465,
            auth: {
              user: process.env.NODEMAILER_EMAIL_ADDRESS,
              pass: process.env.NODEMAILER_EMAIL_PASSWORD,
            },
          });
          const mailOptions = {
            from: process.env.NODEMAILER_EMAIL_ADDRESS,
            to: email,
            subject: "SUITPI - Verificación de correo",
            html: htmlToSend,
          };
          transporter.sendMail(mailOptions, (err, info) => {
            if (err) {
              console.error("Error sending email: " + err.stack);
              return;
            }
            console.log("Email sent: " + info.response);
          });
          res.json({ status: "success" });
        }
      }
    );
  });
  
  // Envio de link para recuperar contraseña
  
  app.post("/forgotPassword", async (req, res) => {
    const { email } = req.body;
    db.query("SELECT * FROM users WHERE mail=?", [email], async (err, result) => {
      if (err) {
        console.error("Error fetching user by mail: " + err);
      }
      if (result.length === 0) {
        res.json({ status: "emailFail" });
      } else {
        const token = randomstring.generate(60);
        db.query(
          "UPDATE users SET reset_password_token=? WHERE mail=?",
          [token, email],
          (err, response) => {
            if (err) {
              console.error("Error updating reset password token: " + err);
            }
            if (response.affectedRows > 0) {
              const source = fs
                .readFileSync("./email_templates/password_recovery.html", "utf8")
                .toString();
              const template = handlebars.compile(source);
              const replacements = {
                mail: email,
                link: process.env.CLIENT_URL + "/resetPassword/" + token,
              };
              const htmlToSend = template(replacements);
              const transporter = nodemailer.createTransport({
                host: "smtp.zoho.com",
                secure: true,
                port: 465,
                auth: {
                  user: process.env.NODEMAILER_EMAIL_ADDRESS,
                  pass: process.env.NODEMAILER_EMAIL_PASSWORD,
                },
              });
              const mailOptions = {
                from: process.env.NODEMAILER_EMAIL_ADDRESS,
                to: email,
                subject: "SUITPI - Recuperación de contraseña",
                html: htmlToSend,
              };
              transporter.sendMail(mailOptions, (err, info) => {
                if (err) {
                  console.error("Error sending email: " + err.stack);
                  return;
                }
                console.log("Email sent: " + info.response);
              });
              res.json({ status: "success" });
            }
          }
        );
      }
    });
  });
  
  // Reestablecer contraseña
  
  app.post("/resetPassword", async (req, res) => {
    const { token, password } = req.body;
    const hashedPassword = await bcrypt.hash(password, 10);
    db.query(
      "SELECT * FROM users WHERE reset_password_token=?",
      [token],
      async (err, result) => {
        if (err) {
          console.error("Error fetching user by token: " + err);
        }
        if (result.length === 0) {
          res.json({ status: "tokenFail" });
        } else {
          db.query(
            "UPDATE users SET password=?, reset_password_token='' WHERE reset_password_token=?",
            [hashedPassword, token],
            (err, response) => {
              if (err) {
                console.error("Error updating password: " + err);
              }
              if (response.affectedRows > 0) {
                res.json({ status: "success" });
              }
            }
          );
        }
      }
    );
  });
  
  // Delete account
  
  app.delete("/deleteAccount", (req, res) => {
    const { userId } = req.body;
    console.log(userId);
    db.query("DELETE FROM users WHERE id_user=?", [userId], (err, result) => {
      if (err) {
        console.error("Error deleting account: " + err);
      }
      if (result.affectedRows > 0) {
        res.json({ status: "Account deleted" });
      }
    });
  });
  
  // update user info
  
  app.put("/updateUserInfo", (req, res) => {
    const { name, lastname, phone } = req.body.updatedUser;
    const userId = req.body.userId;
    db.query(
      "UPDATE users SET name=?, lastname=?, phone=? WHERE id_user=?",
      [name, lastname, phone, userId],
      (err, result) => {
        if (err) {
          console.error("Error al actualizar usuario: " + err);
        }
        if (result.affectedRows > 0) {
          db.query(
            "SELECT * FROM users WHERE id_user=?",
            [userId],
            (err, result) => {
              if (err) {
                console.error("Error fetching user data: " + err);
              }
              if (result.length > 0) {
                console.log(result[0]);
                const { password, ...user } = result[0];
                res.status(200).json(user);
                console.log(user);
              }
            }
          );
        }
      }
    );
  });





app.listen(process.env.PORT, () => {
    console.log(`Server running on port ${process.env.PORT}`)
})