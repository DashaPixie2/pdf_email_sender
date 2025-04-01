const express = require('express');
const bodyParser = require('body-parser');
const nodemailer = require('nodemailer');
const PDFDocument = require('pdfkit');
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

    const pdfPath = `./${firstName}_${surname}_ConsentForm.pdf`;
    const doc = new PDFDocument({ bufferPages: true });
    const writeStream = fs.createWriteStream(pdfPath);
    doc.pipe(writeStream);

    // === Основной текст ===
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

    doc.text(`
I am not a hemophiliac (bleeder). I do not have Diabetes, Epilepsy, Hepatitis, Aids or any other communicable disease. 
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

PHOTOGRAPH AND VIDEO CONSENT, RELEASE, AND WAIVER OF RIGHTS

I, the undersigned, hereby grant Dasha Pixie (hereafter referred to as "the Artist") and anyone authorized by the Artist the absolute, perpetual, and irrevocable right and permission to photograph, film, record, and/or otherwise capture my likeness, image, voice, tattoo(s), and/or body (in part or in whole), and to use, reproduce, edit, alter, publish, distribute, publicly display, and create derivative works from such materials, in any and all media now known or hereafter developed, for any lawful purpose, including but not limited to promotional, commercial, educational, or artistic purposes, worldwide and in perpetuity, without restriction and without compensation to me.

I understand and agree that:

-The Artist will own full rights, title, and interest, including copyright, in and to all photographs, video recordings, and other media materials created.

-I waive any right to inspect, review, approve, or control the final use of such materials.

-I irrevocably waive any and all rights to royalties, monetary compensation, or other benefits now or in the future arising from the use of such materials.

-I release, discharge, and agree to hold harmless the Artist and all persons acting under the Artist’s authority or with their permission, from any and all claims, demands, or liabilities whatsoever in connection with the use of my likeness, including but not limited to claims for invasion of privacy, defamation, right of publicity, emotional distress, or any other legal or equitable theory.

This release is binding upon me, my heirs, legal representatives, and assigns. I affirm that I am at least eighteen (18) years of age and legally competent to sign this agreement. If I am under eighteen (18), my parent or legal guardian has signed below.
`);
    doc.moveDown();

    if (signature) {
        try {
            const signaturePath = `./uploads/signature_${Date.now()}.png`;
            const base64Data = signature.replace(/^data:image\/png;base64,/, "");
            fs.writeFileSync(signaturePath, Buffer.from(base64Data, 'base64'));

            const currentDate = new Date().toLocaleDateString('en-US');

            doc.image(signaturePath, { fit: [150, 80], align: 'center' });
            doc.moveDown(0.5);
            doc.fontSize(10).text(`Signed by: ${firstName} ${surname}`);
            doc.text(`Date: ${currentDate}`);

            doc.moveDown();
            doc.text(`
I confirm that the signature provided is my own, created by me personally and electronically. 
I acknowledge that this electronic signature is legally binding in accordance with the U.S. Electronic Signatures in Global and National Commerce Act (E-Sign Act) 
and Uniform Electronic Transactions Act (UETA). By clicking/tapping/touching/selecting or otherwise interacting with the "Submit" button below, 
you are consenting to signing this Document electronically. You agree your electronic signature ("E-Signature") is the legal equivalent of your manual signature 
on this Document. You consent to be legally bound by this Document's agreement(s), acknowledgement(s), policy(ies), disclosure(s), consent term(s) and condition(s). 
You agree that no certification authority or other third party verification is necessary to validate your E-Signature and that the lack of such certification 
or third party verification will not in any way affect the enforceability of your E-Signature. You may request a paper version of an electronic record by writing to us.
`, { align: 'justify' });

            doc.moveDown();
            doc.image(signaturePath, { fit: [150, 80], align: 'center' });
            doc.moveDown(0.5);
            doc.fontSize(10).text(`Signed by: ${firstName} ${surname}`);
            doc.text(`Date: ${currentDate}`);

            fs.unlinkSync(signaturePath);
        } catch (error) {
            console.error('❌ Error adding signature to PDF:', error);
        }
    }

    // === Колонтитулы: слева имя, справа нумерация ===
    const pageRange = doc.bufferedPageRange();
    const totalPages = pageRange.count;

    for (let i = 0; i < totalPages; i++) {
        doc.switchToPage(i);

        const footerHeight = 30;
        const footerY = doc.page.height - footerHeight;

        const leftText = `Signed by: ${firstName} ${surname}`;
        const rightText = `Page ${i + 1} of ${totalPages}`;

        doc.save();

        // Фон
        doc.fillColor('#f4f4f4')
            .rect(0, footerY, doc.page.width, footerHeight)
            .fill();

        // Текст
        doc.fontSize(10).fillColor('gray');
        const textHeight = doc.currentLineHeight();
        const textY = footerY + (footerHeight - textHeight) / 2;

        // Слева
        doc.text(leftText, 20, textY, {
            lineBreak: false,
            align: 'left'
        });

        // Справа
        const rightTextWidth = doc.widthOfString(rightText);
        const rightX = doc.page.width - rightTextWidth - 20;

        doc.text(rightText, rightX, textY, {
            lineBreak: false,
            align: 'left'
        });

        doc.restore();
    }

    doc.end();

    writeStream.on('finish', async () => {
        const attachments = [{
            filename: `${firstName}_${surname}_ConsentForm.pdf`,
            path: pdfPath
        }];

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
