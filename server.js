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

    // Adding Title
    doc.fontSize(20).text('Consent to Application of Tattoo and Release and Waiver of all Claims', { align: 'center' });
    doc.moveDown();

    // Adding Client Information
    doc.fontSize(12).text(`First Name: ${firstName}`);
    doc.text(`Surname: ${surname}`);
    doc.text(`Address: ${address}`);
    doc.text(`City: ${city}, State: ${state}, Zip: ${zip}`);
    doc.text(`Email: ${email}`);
    doc.text(`Phone: ${phone}`);
    doc.text(`Birthday: ${birthday}`);
    doc.moveDown();

    // Adding Static Text
    doc.text('I am not a hemophiliac (bleeder)... (your text here)...');
    doc.moveDown();

    // Adding Signature Image
    if (signature) {
        try {
            const signaturePath = `./uploads/signature_${Date.now()}.png`;
            const base64Data = signature.split(';base64,').pop();

            fs.writeFileSync(signaturePath, base64Data, { encoding: 'base64' });

            doc.text('Signature:', { align: 'left' });
            doc.image(signaturePath, { fit: [150, 80], align: 'left' });
            doc.text(`${firstName} ${surname}`, { align: 'right' });

            const currentDate = new Date().toLocaleDateString('en-GB', { 
                day: 'numeric', month: 'long', year: 'numeric' 
            });
            doc.text(`Date: ${currentDate}`, { align: 'left' });

            fs.unlinkSync(signaturePath); // Delete signature file after use
        } catch (error) {
            console.error('Error processing signature:', error);
        }
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
            fs.unlinkSync(pdfPath);
            if (idFront) fs.unlinkSync(idFront.path);
            if (idBack) fs.unlinkSync(idBack.path);

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
    console.log(`Server running on port ${PORT}`);
});
