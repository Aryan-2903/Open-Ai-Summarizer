const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const fs = require('fs');
const dotenv = require('dotenv');
const pdf = require('pdf-parse');
const fileUploader = require('express-fileupload');
const  OpenAIApi  = require('openai');

dotenv.config();

const app = express();
const PORT = 8800;
const openai = new OpenAIApi({
    apiKey: process.env.OPEN_AI_API_KEY,
  });

app.use(cors());
app.use(express.json({ limit: "5mb" }));

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(fileUploader());

app.post("/summary", async function (req, res) {
    let sampleFile;
    let uploadPath;

    if (!req.files || Object.keys(req.files).length === 0) {
        return res.status(400).send("No file is uploaded, try again");
    }
    sampleFile = req.files.uploadedFile;

    uploadPath =
        __dirname + "/temp/" + new Date().getTime() + "/" + sampleFile.name;

    sampleFile.mv(uploadPath, async function (err) {
        if (err) return res.status(500).send(err);

        let dataBuffer = fs.readFileSync(uploadPath);
        pdf(dataBuffer).then(async function (data) {
            openai.createCompletion({
                model: "text-davinci-003",
                prompt: data.text + "\n\nTl;dr",
                temperature: 0.7,
                max_tokens: Math.floor(data.text?.length / 2),
                top_p: 1.0,
                frequency_penalty: 0.0,
                presence_penalty: 1,
            }).then((response) => {
                fs.unlinkSync(uploadPath);
                res.json({
                    id: new Date().getTime(),
                    text: response.data.choices[0].text,
                });
            }).catch((err) => {
                console.log("ERROR:", err);
                res.status(500).send("An error occurred");
            });
        });
    });
});

app.listen(PORT, () => {
    console.log("Listening on port " + PORT);
});
