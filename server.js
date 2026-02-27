import express from 'express';
import { Client } from '@notionhq/client';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
app.use(express.json());

const notion = new Client({
    auth: process.env.VITE_NOTION_API_KEY,
});

const databaseId = process.env.VITE_NOTION_DATABASE_ID;

app.get('/api/notion/test', async (req, res) => {
    try {
        const response = await globalThis.fetch(`https://api.notion.com/v1/databases/${databaseId}/query`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${process.env.VITE_NOTION_API_KEY}`,
                'Notion-Version': '2022-06-28',
                'Content-Type': 'application/json'
            }
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.message || 'Notion API Error');
        }

        console.log("Notion connection successful, fetched entries count:", data.results?.length);
        res.json({ success: true, data: data });
    } catch (error) {
        console.error("Notion API Error:", error.message);
        res.status(500).json({ success: false, error: error.message });
    }
});

const PORT = 3001;
app.listen(PORT, () => {
    console.log(`Notion helper server running on http://localhost:${PORT}`);
});
