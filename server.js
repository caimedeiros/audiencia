const express = require('express');
const bodyParser = require('body-parser');
const admin = require('firebase-admin');
const { Configuration, OpenAIApi } = require('openai');
const cors = require('cors');

// Inicialize o Firebase Admin com suas credenciais
admin.initializeApp({
    credential: admin.credential.cert({
        "type": "service_account",
        "project_id": "your-project-id",
        "private_key_id": "your-private-key-id",
        "private_key": "your-private-key",
        "client_email": "your-client-email",
        "client_id": "your-client-id",
        "auth_uri": "https://accounts.google.com/o/oauth2/auth",
        "token_uri": "https://oauth2.googleapis.com/token",
        "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
        "client_x509_cert_url": "your-client-x509-cert-url"
    }),
});
const db = admin.firestore();

const app = express();
app.use(bodyParser.json());
app.use(cors());
const port = process.env.PORT || 3000;

const configuration = new Configuration({
    apiKey: process.env.OPENAI_API_KEY,
});
const openai = new OpenAIApi(configuration);

app.post('/api/sentiment', async (req, res) => {
    const { sentiment } = req.body;
    await db.collection('sentiments').add({ sentiment });
    res.status(200).send('Sentimento enviado!');
});

app.get('/api/sentiments', async (req, res) => {
    const snapshot = await db.collection('sentiments').get();
    const sentiments = snapshot.docs.map(doc => doc.data().sentiment);
    res.json(sentiments);
});

app.post('/api/generate-text', async (req, res) => {
    const snapshot = await db.collection('sentiments').get();
    const sentiments = snapshot.docs.map(doc => doc.data().sentiment);
    const prompt = sentiments.join(', ');
    const completion = await openai.createCompletion({
        model: 'text-davinci-003',
        prompt: `Crie um texto usando as seguintes palavras: ${prompt}`,
        max_tokens: 150,
    });
    const text = completion.data.choices[0].text.trim();
    await db.collection('generatedText').add({ text, timestamp: admin.firestore.FieldValue.serverTimestamp() });
    res.status(200).send('Texto gerado!');
});

app.get('/api/generated-text', async (req, res) => {
    const snapshot = await db.collection('generatedText').orderBy('timestamp', 'desc').limit(1).get();
    const text = snapshot.docs[0].data().text;
    res.json({ text });
});

app.use(express.static('public'));

app.listen(port, () => {
    console.log(`Servidor rodando na porta ${port}`);
});
