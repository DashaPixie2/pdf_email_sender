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

    const stream = fs.createWriteStream(pdfPath);
    doc.pipe(stream);

    const addFooter = (pageNum, totalPages) => {
        doc.fontSize(10).text(`Initials: ${initials}    Signature: [Signed Electronically]`, 50, doc.page.height - 50);
        doc.text(`${pageNum}/${totalPages}`, doc.page.width - 70, doc.page.height - 50);
    };

    // --- Page 1
    doc.addPage();
    doc.fontSize(20).text('Consent to Application of Tattoo and Release and Waiver of all Claims', {
        align: 'center'
    });

    doc.moveDown();
    doc.fontSize(12).text(`First Name: ${firstName}`);
    doc.text(`Surname: ${surname}`);
    doc.text(`Address: ${address}`);
    doc.text(`City: ${city}, State: ${state}, Zip: ${zip}`);
    doc.text(`Email: ${email}`);
    doc.text(`Phone: ${phone}`);
    doc.text(`Birthday: ${birthday}`);

    doc.moveDown();
    const firstText = `
I am not a hemophiliac (bleeder). I do not have Diabetes, Epilepsy, Hepatitis, Aids or any other communicable disease. I am not under the influence of alcohol and or drugs.

I acknowledge it is not reasonably possible for Dasha Pixie to determine whether I might have an allergic reaction to the pigments or process used in my Tattoo, and I agree to accept the risk that such a reaction is possible.

I acknowledge that infection is always possible as a result of obtaining a Tattoo, particularly in the event that I do not take proper care of my Tattoo, and I agree to follow all instructions concerning the care of my own Tattoo while it is healing. I agree that any touch-up work needed due to my own negligence will be done at my own expense.

I realize that variations in color and design may exist between any tattoo as selected by Me and as ultimately applied to my body. I understand that if my skin color is dark, the Colors will not appear as bright as they do on light skin.

I acknowledge a Tattoo is a permanent change to my appearance and no representations have been made to me regarding the ability to later change or remove my tattoo. To my knowledge, I do not have any physical, mental, medical impairment or disability, which might affect my well-being as a direct or indirect result of my decision to have any tattoo-related work done at this time.

I acknowledge that I have truthfully represented to Dasha Pixie that I am 18 years old, and the following information is true and correct. I acknowledge obtaining of my tattoo is by my choice alone and I consent to the application of the tattoo and to any action or conduct of Dasha Pixie reasonably necessary to perform the tattoo procedure.

I agree to release and forever discharge and hold harmless Dasha Pixie from any and all claims, damages, and legal actions arising from or connected in any way with my tattoo of the procedures and conduct used to apply my Tattoo.
    `;
    doc.text(firstText, { align: 'justify', width: 500 });

    // Подпись + имя и дата
    if (signature) {
        const sigPath = `./uploads/sig_${Date.now()}.png`;
        fs.writeFileSync(sigPath, Buffer.from(signature.replace(/^data:image\/png;base64,/, ""), 'base64'));
        doc.moveDown().image(sigPath, { width: 150, align: 'left' });
        fs.unlinkSync(sigPath);
        doc.text(`Signed by: ${firstName} ${surname}  Date: ${today}`);
    }

    addFooter(1, 2);

    // --- Page 2
    doc.addPage();

    const secondText = `
I confirm that the signature provided is my own, created by me personally and electronically. I acknowledge that this electronic signature is legally binding in accordance with the U.S. Electronic Signatures in Global and National Commerce Act (E-Sign Act) and Uniform Electronic Transactions Act (UETA). 

By clicking/tapping/touching/selecting or otherwise interacting with the "Submit" button below, you are consenting to signing this Document electronically. You agree your electronic signature ("E-Signature") is the legal equivalent of your manual signature on this Document. You consent to be legally bound by this Document's agreement(s), acknowledgement(s), policy(ies), disclosure(s), consent term(s) and condition(s). 

You agree that no certification authority or other third party verification is necessary to validate your E-Signature and that the lack of such certification or third party verification will not in any way affect the enforceability of your E-Signature. You may request a paper version of an electronic record by writing to us.
    `;

    doc.fontSize(12).text(secondText, { align: 'justify', width: 500 });

    if (signature) {
        const sigPath = `./uploads/sig2_${Date.now()}.png`;
        fs.writeFileSync(sigPath, Buffer.from(signature.replace(/^data:image\/png;base64,/, ""), 'base64'));
        doc.moveDown().image(sigPath, { width: 150, align: 'left' });
        fs.unlinkSync(sigPath);
        doc.text(`Signed by: ${firstName} ${surname}  Date: ${today}`);
    }

    addFooter(2, 2);

    doc.end();

    stream.on('finish', async () => {
        const attachments = [{ filename: `${firstName}_${surname}_ConsentForm.pdf`, path: pdfPath }];
        if (idFront) attachments.push({ filename: idFront.originalname, path: idFront.path });
        if (idBack) attachments.push({ filename: idBack.originalname, path: idBack.path });

        transporter.sendMail({
            from: 'hey@dashapixie.com',
            to: 'hey@dashapixie.com',
            subject: 'New Consent Form Submission',
            text: 'Please see the attached document and ID files.',
            attachments
        }, (error, info) => {
            fs.unlinkSync(pdfPath);
            if (idFront) fs.unlinkSync(idFront.path);
            if (idBack) fs.unlinkSync(idBack.path);

            if (error) {
                console.error('❌ Email send error:', error);
                return res.status(500).send('Email send failed');
            }

            console.log('✅ Email sent:', info.response);
            res.send('Email sent successfully');
        });
    });
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
