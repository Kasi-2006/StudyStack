import { google } from 'googleapis';
import { Readable } from 'stream';
import fs from 'fs';
import path from 'path';

/**
 * DriveService — Server-side Google Drive API Integration
 * Supports:
 * 1. Personal Gmail Account via OAuth 2.0 (Client ID + Client Secret + Refresh Token)
 * 2. Service Account Key JSON (studystack.json)
 * 3. Service Account Environment Variables
 */

export const SCOPES = ['https://www.googleapis.com/auth/drive'];

export function getOAuth2Client(redirectUri?: string) {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const uri = redirectUri || process.env.GOOGLE_REDIRECT_URI || 'http://localhost:3000/api/drive/oauth2callback';

  if (!clientId || !clientSecret || clientId.includes('YOUR_CLIENT_ID')) {
    return null;
  }

  const oauth2Client = new google.auth.OAuth2(clientId, clientSecret, uri);

  if (process.env.GOOGLE_REFRESH_TOKEN) {
    oauth2Client.setCredentials({ refresh_token: process.env.GOOGLE_REFRESH_TOKEN });
  }

  return oauth2Client;
}

function getDriveClient() {
  // Option 1: Google OAuth 2.0 with Refresh Token (Personal Gmail Account Storage)
  const oauth2Client = getOAuth2Client();
  if (oauth2Client && process.env.GOOGLE_REFRESH_TOKEN && !process.env.GOOGLE_REFRESH_TOKEN.includes('YOUR_REFRESH_TOKEN')) {
    return google.drive({ version: 'v3', auth: oauth2Client });
  }

  // Option 2: Load credentials directly from studystack.json key file if present
  const jsonKeyPath = path.resolve(process.cwd(), 'studystack.json');
  if (fs.existsSync(jsonKeyPath)) {
    try {
      const auth = new google.auth.GoogleAuth({
        keyFile: jsonKeyPath,
        scopes: SCOPES,
      });
      return google.drive({ version: 'v3', auth });
    } catch (err: any) {
      console.warn('[DriveService] Failed to load key from studystack.json:', err.message);
    }
  }

  // Option 3: Fallback to Service Account environment variables
  const clientEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  let privateKey = process.env.GOOGLE_PRIVATE_KEY;

  if (clientEmail && privateKey && !privateKey.includes('YOUR_PRIVATE_KEY_HERE')) {
    privateKey = privateKey.replace(/\\n/g, '\n');
    const auth = new google.auth.JWT({
      email: clientEmail,
      key: privateKey,
      scopes: SCOPES,
    });
    return google.drive({ version: 'v3', auth });
  }

  console.warn('[DriveService] Warning: Google Drive credentials not configured.');
  return null;
}

/**
 * Ensure subfolder exists for organizing files by Category.
 * Reuses existing folder or creates a new one.
 */
async function ensureSubfolder(drive: any, parentId: string, folderName: string): Promise<string> {
  try {
    const safeName = folderName.replace(/'/g, "\\'");
    const query = `mimeType='application/vnd.google-apps.folder' and name='${safeName}' and '${parentId}' in parents and trashed=false`;

    const res = await drive.files.list({
      q: query,
      fields: 'files(id, name)',
      spaces: 'drive',
    });

    if (res.data.files && res.data.files.length > 0) {
      return res.data.files[0].id;
    }

    // Create subfolder
    const folderMetadata = {
      name: folderName,
      mimeType: 'application/vnd.google-apps.folder',
      parents: [parentId],
    };

    const folder = await drive.files.create({
      requestBody: folderMetadata,
      fields: 'id',
    });

    return folder.data.id;
  } catch (err: any) {
    console.error(`[DriveService] Error in ensureSubfolder for '${folderName}':`, err.message);
    return parentId; // Fallback to parent folder if subfolder creation fails
  }
}

export interface UploadOptions {
  buffer: Buffer;
  fileName: string;
  mimeType: string;
  category?: string;
}

export interface UploadResult {
  fileId: string;
  fileUrl: string;
  webViewLink: string;
}

export const driveService = {
  /**
   * Upload file to Google Drive under organized category folder.
   */
  uploadFile: async (options: UploadOptions): Promise<UploadResult> => {
    const drive = getDriveClient();
    if (!drive) {
      throw new Error('Google Drive API client is not configured. Please set GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, and GOOGLE_REFRESH_TOKEN in .env or run the /api/drive/auth-url setup flow.');
    }

    const rootFolderId = process.env.GOOGLE_DRIVE_FOLDER_ID || 'root';
    let targetFolderId = rootFolderId;

    if (options.category) {
      targetFolderId = await ensureSubfolder(drive, rootFolderId, options.category);
    }

    const mediaStream = new Readable();
    mediaStream.push(options.buffer);
    mediaStream.push(null);

    // Upload file
    const response = await drive.files.create({
      requestBody: {
        name: options.fileName,
        parents: [targetFolderId],
      },
      media: {
        mimeType: options.mimeType,
        body: mediaStream,
      },
      fields: 'id, webViewLink, webContentLink',
    });

    const fileId = response.data.id;
    if (!fileId) throw new Error('Google Drive file creation returned empty file ID');

    // Make file shareable (Public read access)
    try {
      await drive.permissions.create({
        fileId: fileId,
        requestBody: {
          role: 'reader',
          type: 'anyone',
        },
      });
    } catch (permError: any) {
      console.warn(`[DriveService] Warning setting permission for file ${fileId}:`, permError.message);
    }

    // Generate permanent shareable URL
    const shareableUrl = `https://drive.google.com/uc?id=${fileId}&export=download`;
    const webViewLink = response.data.webViewLink || `https://drive.google.com/file/d/${fileId}/view?usp=sharing`;

    return {
      fileId,
      fileUrl: shareableUrl,
      webViewLink,
    };
  },

  /**
   * Delete file from Google Drive.
   */
  deleteFile: async (fileId: string): Promise<void> => {
    const drive = getDriveClient();
    if (!drive) {
      console.warn('[DriveService] Cannot delete Google Drive file: Credentials not configured.');
      return;
    }

    try {
      await drive.files.delete({ fileId });
      console.log(`[DriveService] File ${fileId} deleted from Google Drive successfully.`);
    } catch (err: any) {
      console.error(`[DriveService] Failed to delete file ${fileId} from Google Drive:`, err.message);
      if (err.code !== 404) {
        throw err;
      }
    }
  },

  /**
   * Replace file in Google Drive (removes old, uploads new).
   */
  replaceFile: async (oldFileId: string | null, options: UploadOptions): Promise<UploadResult> => {
    if (oldFileId) {
      try {
        await driveService.deleteFile(oldFileId);
      } catch (err: any) {
        console.warn(`[DriveService] Failed to remove old file ${oldFileId} during replacement:`, err.message);
      }
    }
    return await driveService.uploadFile(options);
  }
};
