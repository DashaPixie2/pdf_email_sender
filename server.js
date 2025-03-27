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
    doc.text(`I am not a hemophiliac (bleeder). I do not have Diabetes, Epilepsy, Hepatitis, Aids or any other communicable disease. 
      I am not under the influence of alcohol and or drugs.

      I acknowledge it is not reasonably possible for Dasha Pixie to determine whether I might have an allergic reaction to the pigments or process used in my Tattoo,
      and I agree to accept the risk that such a reaction is possible.

      I acknowledge that infection is always possible as a result of obtaining a Tattoo, particularly in the event that I do not take proper care of my Tattoo, 
      and I agree to follow all instructions concerning the care of my own Tattoo while it is healing. 
      I agree That any touch-up work needed due to my own negligence will be done at my own expense.

      I realize that variations in color and design may exist between any tattoo as selected by Me and as ultimately applied to my body. 
      I understand that if my skin color is dark, the Colors will not appear as bright as they do on light skin.

      I acknowledge a Tattoo is a permanent change to my appearance and no representations have been made to me regarding the ability to later change or remove my tattoo. 
      To my knowledge, I do not have any physical, mental, medical impairment or disability, which might affect my well-being as a direct or indirect result of my decision to have any tattoo-related work done at this time.

      I acknowledge that I have truthfully represented to Dasha Pixie that I am 18 years old, and the following information is true and correct.
      I acknowledge obtaining of my tattoo is by my choice alone and I consent to the application of the tattoo and to any action or conduct of Dasha Pixie reasonably necessary to perform the tattoo procedure.

      I agree to release and forever discharge and hold harmless Dasha Pixie from any and all claims, damages, and legal actions arising from or connected in any way with my tattoo of the procedures and conduct used to apply my Tattoo.
    `);
    doc.moveDown();

    // Adding Signature Image
    if (signature) {
        try {
            const signaturePath = `./uploads/signature_${Date.now()}.png`;
            const base64Data = signature.replace(/^data:image\/png;base64,/, "");

            fs.writeFileSync(signaturePath, base64Data, 'base64');

            if (fs.existsSync(signaturePath)) {
                doc.text('Signature:', { align: 'left' });
                doc.image(signaturePath, { fit: [150, 80], align: 'left' });
                doc.moveDown();

                const currentDate = new Date().toLocaleDateString('en-GB', { 
                    day: 'numeric', month: 'long', year: 'numeric' 
                });
                doc.text(`Date: ${currentDate}`, { align: 'left' });

                fs.unlinkSync(signaturePath);
            }
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
