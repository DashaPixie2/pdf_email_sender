const express = require('express');
const bodyParser = require('body-parser');
const nodemailer = require('nodemailer');
const pdf = require('pdfkit');
const fs = require('fs');
const multer = require('multer');
const path = require('path');
const cors = require('cors');

const app = express();
const upload = multer({ dest: 'uploads/' });

app.use(cors({
    origin: 'https://dashapixie.com',
    methods: ['POST'],
    allowedHeaders: ['Content-Type']
}));

app.use(bodyParser.json({ limit: '50mb' }));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static('public'));

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

    const initials = `${firstName[0] || ''}${surname[0] || ''}`.toUpperCase();
    const today = new Date().toLocaleDateString('en-US');

    const pdfPath = `./${firstName}_${surname}_ConsentForm.pdf`;
    const doc = new pdf({ autoFirstPage: false });
    const writeStream = fs.createWriteStream(pdfPath);
    doc.pipe(writeStream);

    doc.addPage();

    const footer = (doc, pageNum, totalPages) => {
        doc.fontSize(10)
           .fillColor('gray')
           .text(`${initials} | Signed`, 50, doc.page.height - 40, { align: 'left' });
        doc.text(`${pageNum}/${totalPages}`, 0, doc.page.height - 40, { align: 'right' });
    };

    const addSignatureBlock = (doc, imagePath) => {
        doc.moveDown();
        doc.text(`Name: ${firstName} ${surname}`);
        doc.text(`Date: ${today}`);
        doc.moveDown();
        doc.image(imagePath, { fit: [150, 80], align: 'center' });
        doc.addPage();
    };

    doc.fontSize(20).fillColor('black').text('Consent to Application of Tattoo and Release and Waiver of all Claims', {
        align: 'center'
    });
    doc.moveDown();

    doc.fontSize(12).text(`First Name: ${firstName}`)
                    .text(`Surname: ${surname}`)
                    .text(`Address: ${address}`)
                    .text(`City: ${city}, State: ${state}, Zip: ${zip}`)
                    .text(`Email: ${email}`)
                    .text(`Phone: ${phone}`)
                    .text(`Birthday: ${birthday}`)
                    .moveDown();

    doc.text(`I am not a hemophiliac...`).moveDown(); // here insert full legal text

    if (signature) {
        try {
            const signaturePath = `./uploads/signature_${Date.now()}.png`;
            const base64Data = signature.replace(/^data:image\/png;base64,/, "");
            fs.writeFileSync(signaturePath, Buffer.from(base64Data, 'base64'));

            addSignatureBlock(doc, signaturePath);

            doc.text(`I confirm that the signature provided is my own...`).moveDown(); // Insert full confirmation legal text
            addSignatureBlock(doc, signaturePath);

            fs.unlinkSync(signaturePath);
        } catch (error) {
            console.error('Error adding signature to PDF:', error);
        }
    }

    doc.end();

    writeStream.on('finish', async () => {
        const pages = doc.bufferedPageRange().count;
        const readDoc = new pdf();
        for (let i = 0; i < pages; i++) {
            readDoc.switchToPage(i);
            footer(readDoc, i + 1, pages);
        }

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
                console.error('❌ Error sending email:', error);
                return res.status(500).send('Error sending email');
            }

            console.log('✅ Email sent successfully:', info.response);
            res.send('Email sent successfully');
        });
    });
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
