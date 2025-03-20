const express = require("express");
const bodyParser = require("body-parser");
const nodemailer = require("nodemailer");
const PDFDocument = require("pdfkit");
const fs = require("fs");
const app = express();
const port = 10000;

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// CORS Разрешение
app.use((req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    next();
});

// Главная страница
app.get("/", (req, res) => {
    res.send("Сервер запущен на порту " + port);
});

// Маршрут для обработки формы
app.post("/send-email", (req, res) => {
    const { firstName, surname, address, city, state, zip, email, phone, birthday, signature } = req.body;

    // Создание PDF
    const doc = new PDFDocument();
    const filePath = `./form_${Date.now()}.pdf`;
    doc.pipe(fs.createWriteStream(filePath));
    doc.fontSize(14).text(`First Name: ${firstName}`);
    doc.fontSize(14).text(`Surname: ${surname}`);
    doc.fontSize(14).text(`Address: ${address}`);
    doc.fontSize(14).text(`City: ${city}`);
    doc.fontSize(14).text(`State: ${state}`);
    doc.fontSize(14).text(`Zip: ${zip}`);
    doc.fontSize(14).text(`Email: ${email}`);
    doc.fontSize(14).text(`Phone: ${phone}`);
    doc.fontSize(14).text(`Birthday: ${birthday}`);
    doc.fontSize(14).text(`Signature: ${signature}`);
    doc.end();

    // Настройки для Nodemailer
    const transporter = nodemailer.createTransport({
        service: "gmail",
        auth: {
            user: "hey@dashapixie.com",
            pass: "ПАРОЛЬ_ПРИЛОЖЕНИЯ"
        }
    });

    // Отправка письма с вложением
    transporter.sendMail({
        from: "hey@dashapixie.com",
        to: "hey@dashapixie.com",
        subject: "Заполненная форма",
        text: "Смотри вложение.",
        attachments: [
            {
                filename: `form_${Date.now()}.pdf`,
                path: filePath
            }
        ]
    }, (error, info) => {
        if (error) {
            return res.status(500).send("Ошибка при отправке письма: " + error.message);
        }
        fs.unlinkSync(filePath); // Удаляем PDF файл после отправки
        res.send("Письмо успешно отправлено.");
    });
});

// Запуск сервера
app.listen(port, () => {
    console.log(`Сервер запущен на порту ${port}`);
});

