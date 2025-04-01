// server.js

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

function getInitials(name, surname) {
    return `${name[0] || ''}${surname[0] || ''}`.toUpperCase();
}

app.post('/send-email', upload.fields([{ name: 'idFront' }, { name: 'idBack' }]), async (req, res) => {
    const { firstName, surname, address, city, state, zip, email, phone, birthday, signature } = req.body;
    const idFront = req.files['idFront'] ? req.files['idFront'][0] : null;
    const idBack = req.files['idBack'] ? req.files['idBack'][0] : null;
    const initials = getInitials(firstName, surname);
    const fullName = `${firstName} ${surname}`;
    const date = new Date().toLocaleDateString();

    const pdfPath = `./${firstName}_${surname}_ConsentForm.pdf`;
    const doc = new pdf({ autoFirstPage: false });

    const addPageWithHeaderFooter = () => {
        doc.addPage();
        const pageNumber = doc.page.pageNumber;

        // Header
        doc.fontSize(8).text(`${initials} - ${fullName}`, 50, 20, { align: 'left' });

        // Footer
        const pageCount = doc._pageBuffer.length + 1;
        doc.fontSize(8).text(`Page ${pageNumber} of ${pageCount}`, 50, doc.page.height - 30, { align: 'center' });
        doc.fontSize(8).text(`Initials: ${initials}`, 50, doc.page.height - 30, { align: 'left' });
        doc.image(signaturePath, doc.page.width - 100, doc.page.height - 60, { fit: [50, 30] });
    };

    const writeStream = fs.createWriteStream(pdfPath);
    doc.pipe(writeStream);

    addPageWithHeaderFooter();

    doc.fontSize(20).text('Consent to Application of Tattoo and Release and Waiver of all Claims', { align: 'center' });
    doc.moveDown();
    doc.fontSize(12)
       .text(`First Name: ${firstName}`)
       .text(`Surname: ${surname}`)
       .text(`Address: ${address}`)
       .text(`City: ${city}, State: ${state}, Zip: ${zip}`)
       .text(`Email: ${email}`)
       .text(`Phone: ${phone}`)
       .text(`Birthday: ${birthday}`)
       .moveDown();

    const legalText = `
I am not a hemophiliac (bleeder). I do not have Diabetes, Epilepsy, Hepatitis, Aids or any other communicable disease. I am not under the influence of alcohol and or drugs.

I acknowledge it is not reasonably possible for Dasha Pixie to determine whether I might have an allergic reaction to the pigments or process used in my Tattoo, and I agree to accept the risk that such a reaction is possible.

I acknowledge that infection is always possible as a result of obtaining a Tattoo, particularly in the event that I do not take proper care of my Tattoo, and I agree to follow all instructions concerning the care of my own Tattoo while it is healing. I agree That any touch-up work needed due to my own negligence will be done at my own expense.

I realize that variations in color and design may exist between any tattoo as selected by Me and as ultimately applied to my body. I understand that if my skin color is dark, the Colors will not appear as bright as they do on light skin.

I acknowledge a Tattoo is a permanent change to my appearance and no representations have been made to me regarding the ability to later change or remove my tattoo. To my knowledge, I do not have any physical, mental, medical impairment or disability, which might affect my well-being as a direct or indirect result of my decision to have any tattoo-related work done at this time.

I acknowledge that I have truthfully represented to Dasha Pixie that I am 18 years old, and the following information is true and correct.

I acknowledge obtaining of my tattoo is by my choice alone and I consent to the application of the tattoo and to any action or conduct of Dasha Pixie reasonably necessary to perform the tattoo procedure.

I agree to release and forever discharge and hold harmless Dasha Pixie from any and all claims, damages, and legal actions arising from or connected in any way with my tattoo of the procedures and conduct used to apply my Tattoo.

I confirm that the signature provided is my own, created by me personally and electronically. I acknowledge that this electronic signature is legally binding in accordance with the U.S. Electronic Signatures in Global and National Commerce Act (E-Sign Act) and Uniform Electronic Transactions Act (UETA). By clicking/tapping/touching/selecting or otherwise interacting with the "Submit" button below, you are consenting to signing this Document electronically. You agree your electronic signature ("E-Signature") is the legal equivalent of your manual signature on this Document. You consent to be legally bound by this Document's agreement(s), acknowledgement(s), policy(ies), disclosure(s), consent term(s) and condition(s). You agree that no certification authority or other third party verification is necessary to validate your E-Signature and that the lack of such certification or third party verification will not in any way affect the enforceability of your E-Signature. You may request a paper version of an electronic record by writing to us.
`;

    doc.fontSize(12).text(legalText, {
        align: 'justify'
    });

    let signaturePath = '';
    if (signature) {
        try {
            signaturePath = `./uploads/signature_${Date.now()}.png`;
            const base64Data = signature.replace(/^data:image\/png;base64,/, "");
            fs.writeFileSync(signaturePath, Buffer.from(base64Data, 'base64'));

            doc.moveDown();
            doc.text(`Signed by: ${fullName}`);
            doc.text(`Date: ${date}`);
            doc.image(signaturePath, { fit: [150, 80], align: 'center' });
            fs.unlinkSync(signaturePath);
        } catch (error) {
            console.error('Error saving signature:', error);
        }
    }

    doc.end();

    writeStream.on('finish', () => {
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
