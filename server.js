// server.js

const express = require('express');
const bodyParser = require('body-parser');
const nodemailer = require('nodemailer');
const pdf = require('pdfkit');
const fs = require('fs');
const multer = require('multer');
const path = require('path');

const app = express();
const upload = multer({ dest: 'uploads/' });

app.use(bodyParser.json({ limit: '50mb' }));
app.use(bodyParser.urlencoded({ extended: true }));

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: 'hey@dashapixie.com',
    pass: 'uhzb ikkg lawc ampw'
  }
});

app.post('/send-email', upload.fields([{ name: 'idFront' }, { name: 'idBack' }]), async (req, res) => {
    const { firstName, surname, address, city, state, zip, email, phone, birthday, signature } = req.body;
    const idFront = req.files['idFront'] ? req.files['idFront'][0] : null;
    const idBack = req.files['idBack'] ? req.files['idBack'][0] : null;

    const pdfPath = `./${firstName}_${surname}_ConsentForm.pdf`;
    const doc = new pdf();
    const writeStream = fs.createWriteStream(pdfPath);
    doc.pipe(writeStream);

    doc.fontSize(20).text('Consent to Application of Tattoo and Release and Waiver of all Claims', { align: 'center' });
    doc.moveDown();

    doc.fontSize(12).text(`First Name: ${firstName}`);
    doc.text(`Surname: ${surname}`);
    doc.text(`Address: ${address}`);
    doc.text(`City: ${city}, State: ${state}, Zip: ${zip}`);
    doc.text(`Email: ${email}`);
    doc.text(`Phone: ${phone}`);
    doc.text(`Birthday: ${birthday}`);

    if (signature) {
        const signaturePath = `./uploads/signature_${Date.now()}.png`;
        const base64Data = signature.replace(/^data:image\/png;base64,/, "");
        fs.writeFileSync(signaturePath, base64Data, 'base64');
        doc.addPage().image(signaturePath, { fit: [500, 300], align: 'center', valign: 'center' });
        fs.unlinkSync(signaturePath); // Удаляем временный файл с подписью
    }

    doc.end();

    writeStream.on('finish', async () => {
        const attachments = [{ filename: `${firstName}_${surname}_ConsentForm.pdf`, path: pdfPath }];
        
        if (idFront) attachments.push({ filename: idFront.originalname, path: idFront.path });
        if (idBack) attachments.push({ filename: idBack.originalname, path: idBack.path });

        const mailOptions = {
            from: 'hey@dashapixie.com',
            to: 'hey@dashapixie.com',
            subject: 'New Consent Form Submission',
            text: 'Please see the attached document and ID files.',
            attachments
        };

        transporter.sendMail(mailOptions, (error, info) => {
            fs.unlinkSync(pdfPath); // Удаляем PDF после отправки
            if (idFront) fs.unlinkSync(idFront.path); // Удаляем загруженные файлы
            if (idBack) fs.unlinkSync(idBack.path); // Удаляем загруженные файлы

            if (error) {
                console.error('Error sending email:', error);
                return res.status(500).send('Error sending email');
            }

            console.log('Email sent:', info.response);
            res.send('Email sent successfully');
        });
    });
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
    console.log(`Сервер запущен на порту ${PORT}`);
});

