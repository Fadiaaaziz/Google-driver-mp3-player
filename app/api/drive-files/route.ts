import { google } from 'googleapis';
import { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const auth = new google.auth.GoogleAuth({
      credentials: {
        client_email: process.env.GOOGLE_CLIENT_EMAIL,
        private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      },
      scopes: ['https://www.googleapis.com/auth/drive.readonly'],
    });

    const drive = google.drive({ version: 'v3', auth });

    const folderId = req.query.folderId as string || process.env.GOOGLE_DRIVE_FOLDER_ID;
    const resourceKey = process.env.GOOGLE_DRIVE_RESOURCE_KEY;

    const response = await drive.files.list({
      q: `'${folderId}' in parents and mimeType = 'application/vnd.google-apps.folder'`,
      fields: 'files(id, name, mimeType, webViewLink)',
      supportsAllDrives: true,
      includeItemsFromAllDrives: true,
      driveId: folderId,
      corpora: 'drive',
      resourceKey: resourceKey,
    });

    res.status(200).json(response.data.files);
  } catch (error) {
    console.error('Error fetching folder contents:', error);
    res.status(500).json({ error: 'Error fetching folder contents' });
  }
}