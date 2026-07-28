import { IncomingMessage, ServerResponse } from 'http';
import { driveService, getOAuth2Client, SCOPES } from './driveService';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || '';
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY || '';

const supabase = (SUPABASE_URL && SUPABASE_ANON_KEY)
  ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
  : null;

const MAX_FILE_SIZE_BYTES = 20 * 1024 * 1024; // 20 MB
const ALLOWED_MIME_TYPES = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png'];

/** Helper to parse JSON body from incoming HTTP request */
function getRequestBody(req: IncomingMessage): Promise<any> {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => {
      body += chunk.toString();
      if (body.length > 25 * 1024 * 1024) { // limit raw request body
        reject(new Error('Request payload exceeds limit'));
      }
    });
    req.on('end', () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch (err) {
        reject(new Error('Invalid JSON request body'));
      }
    });
    req.on('error', reject);
  });
}

function sendJsonResponse(res: ServerResponse, statusCode: number, data: any) {
  res.statusCode = statusCode;
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify(data));
}

export async function handleDriveApiRequest(req: IncomingMessage, res: ServerResponse): Promise<boolean> {
  const url = req.url || '';

  // Only handle /api/drive routes
  if (!url.startsWith('/api/drive')) {
    return false;
  }

  try {
    // ── OAUTH HELPER: GET AUTHORIZATION URL (/api/drive/auth-url) ─────────────
    if (req.method === 'GET' && (url === '/api/drive/auth-url' || url.startsWith('/api/drive/auth-url?'))) {
      const oauth2Client = getOAuth2Client();
      if (!oauth2Client) {
        sendJsonResponse(res, 400, {
          error: 'GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET are required in .env'
        });
        return true;
      }

      const authUrl = oauth2Client.generateAuthUrl({
        access_type: 'offline',
        scope: SCOPES,
        prompt: 'consent'
      });

      res.statusCode = 302;
      res.setHeader('Location', authUrl);
      res.end();
      return true;
    }

    // ── OAUTH HELPER: OAUTH CALLBACK (/api/drive/oauth2callback) ──────────────
    if (req.method === 'GET' && url.startsWith('/api/drive/oauth2callback')) {
      const urlObj = new URL(url, `http://${req.headers.host || 'localhost:3000'}`);
      const code = urlObj.searchParams.get('code');

      if (!code) {
        sendJsonResponse(res, 400, { error: 'No authorization code found in callback query.' });
        return true;
      }

      const oauth2Client = getOAuth2Client();
      if (!oauth2Client) {
        sendJsonResponse(res, 400, { error: 'OAuth2 client unconfigured in .env.' });
        return true;
      }

      const { tokens } = await oauth2Client.getToken(code);
      const refreshToken = tokens.refresh_token;

      res.statusCode = 200;
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.end(`
        <!DOCTYPE html>
        <html lang="en">
        <head>
          <meta charset="UTF-8">
          <title>Google Drive OAuth Success</title>
          <style>
            body { font-family: system-ui, -apple-system, sans-serif; background: #0f172a; color: #f8fafc; display: flex; justify-content: center; align-items: center; min-height: 100vh; margin: 0; padding: 20px; }
            .card { background: #1e293b; border: 1px solid #334155; border-radius: 24px; padding: 40px; max-width: 550px; width: 100%; box-shadow: 0 25px 50px -12px rgba(0,0,0,0.5); text-align: center; }
            h1 { color: #38bdf8; margin-top: 0; }
            p { color: #94a3b8; font-size: 14px; line-height: 1.6; }
            .code-box { background: #090d16; color: #4ade80; font-family: monospace; padding: 16px; border-radius: 12px; word-break: break-all; font-size: 13px; text-align: left; margin: 20px 0; border: 1px solid #1e293b; user-select: all; }
            .btn { display: inline-block; background: #0284c7; color: white; text-decoration: none; padding: 12px 24px; border-radius: 12px; font-weight: bold; margin-top: 10px; }
            .btn:hover { background: #0369a1; }
          </style>
        </head>
        <body>
          <div class="card">
            <h1>✅ Authorization Successful!</h1>
            <p>Your personal Gmail account has been successfully connected to StudyStack.</p>
            <p><strong>Copy your Refresh Token below and paste it into your <code>.env</code> file:</strong></p>
            <div class="code-box">GOOGLE_REFRESH_TOKEN=${refreshToken || 'No refresh token returned (Consent may already be granted. Try revoking app access or clearing prompt)'}</div>
            <p style="font-size:12px; color:#64748b;">Save your <code>.env</code> file after pasting this key, then enjoy uploading directly to your personal Drive!</p>
            <a href="/" class="btn">Return to StudyStack App</a>
          </div>
        </body>
        </html>
      `);
      return true;
    }

    // ── 1. UPLOAD FILE & SAVE METADATA (POST /api/drive/upload) ───────────────
    if (req.method === 'POST' && url === '/api/drive/upload') {
      const payload = await getRequestBody(req);
      const { file_content, file_name, category, subject_id, student_name, roll_no, unit_no, user_id } = payload;

      // ── Validations ──
      if (!file_content) {
        sendJsonResponse(res, 400, { error: 'Missing file content data' });
        return true;
      }

      // Detect MIME type and extract base64 data
      const mimeMatch = file_content.match(/^data:([^;]+);base64,/);
      const mimeType = mimeMatch ? mimeMatch[1] : 'application/pdf';

      if (!ALLOWED_MIME_TYPES.includes(mimeType)) {
        sendJsonResponse(res, 400, {
          error: `Invalid file type: ${mimeType}. Only PDF, JPG, JPEG, and PNG files are allowed.`
        });
        return true;
      }

      const base64Data = file_content.replace(/^data:[^;]+;base64,/, '');
      const fileBuffer = Buffer.from(base64Data, 'base64');

      if (fileBuffer.length > MAX_FILE_SIZE_BYTES) {
        sendJsonResponse(res, 400, {
          error: `File size (${(fileBuffer.length / (1024 * 1024)).toFixed(2)} MB) exceeds maximum allowed limit of 20 MB.`
        });
        return true;
      }

      const extMap: Record<string, string> = {
        'application/pdf': 'pdf',
        'image/jpeg': 'jpg',
        'image/jpg': 'jpg',
        'image/png': 'png'
      };
      const ext = extMap[mimeType] || 'pdf';
      const cleanFileName = `${Date.now()}_${(file_name || 'file').replace(/\s+/g, '_')}.${ext}`;

      // Step A: Upload to Google Drive
      let driveResult;
      try {
        driveResult = await driveService.uploadFile({
          buffer: fileBuffer,
          fileName: cleanFileName,
          mimeType: mimeType,
          category: category || 'General',
        });
      } catch (uploadError: any) {
        console.error('[DriveApiHandler] Google Drive upload failed:', uploadError.message);
        sendJsonResponse(res, 500, { error: `Google Drive upload failed: ${uploadError.message}` });
        return true;
      }

      const { fileId, fileUrl } = driveResult;

      // Step B: Save Metadata into Supabase Database
      if (!supabase) {
        // Rollback Google Drive upload if database client is unavailable
        await driveService.deleteFile(fileId);
        sendJsonResponse(res, 500, { error: 'Supabase client is not configured on server' });
        return true;
      }

      const metadataRecord = {
        subject_id,
        category,
        file_name,
        file_url: fileUrl,
        drive_file_id: fileId,
        student_name,
        roll_no,
        unit_no: unit_no || null,
        uploaded_at: new Date().toISOString()
      };

      const { data: dbData, error: dbError } = await supabase
        .from('files')
        .insert([metadataRecord])
        .select()
        .single();

      if (dbError) {
        console.error('[DriveApiHandler] Supabase insert failed. Rolling back Google Drive upload...', dbError.message);
        // ATOMIC ROLLBACK: Delete Google Drive file if database insertion fails
        try {
          await driveService.deleteFile(fileId);
          console.log(`[DriveApiHandler] Rollback complete: Deleted Drive file ${fileId}`);
        } catch (rollbackErr: any) {
          console.error('[DriveApiHandler] Failed during rollback deletion:', rollbackErr.message);
        }

        sendJsonResponse(res, 500, { error: `Database insert failed (file rolled back): ${dbError.message}` });
        return true;
      }

      sendJsonResponse(res, 200, { success: true, data: dbData });
      return true;
    }

    // ── 2. DELETE FILE & METADATA (DELETE /api/drive/file/:id) ─────────────────
    if (req.method === 'DELETE' && url.startsWith('/api/drive/file/')) {
      const fileId = url.replace('/api/drive/file/', '');

      if (!fileId || !supabase) {
        sendJsonResponse(res, 400, { error: 'Invalid file ID or Supabase unconfigured' });
        return true;
      }

      // Step A: Retrieve file metadata from Supabase
      const { data: fileRecord, error: fetchErr } = await supabase
        .from('files')
        .select('id, file_url, drive_file_id')
        .eq('id', fileId)
        .single();

      if (fetchErr || !fileRecord) {
        sendJsonResponse(res, 404, { error: 'File record not found in database' });
        return true;
      }

      // Step B: Extract Google Drive file ID
      let driveFileId = fileRecord.drive_file_id;
      if (!driveFileId && fileRecord.file_url) {
        const match = fileRecord.file_url.match(/id=([a-zA-Z0-9_-]+)/);
        if (match) driveFileId = match[1];
      }

      // Step C: Delete from Google Drive
      if (driveFileId) {
        try {
          await driveService.deleteFile(driveFileId);
        } catch (driveErr: any) {
          console.warn('[DriveApiHandler] Drive deletion warning:', driveErr.message);
        }
      }

      // Step D: Delete metadata from Supabase
      const { error: dbDeleteErr } = await supabase
        .from('files')
        .delete()
        .eq('id', fileId);

      if (dbDeleteErr) {
        sendJsonResponse(res, 500, { error: `Failed to delete database record: ${dbDeleteErr.message}` });
        return true;
      }

      sendJsonResponse(res, 200, { success: true, message: 'File deleted successfully from Google Drive & database' });
      return true;
    }

    // ── 3. REPLACE FILE (PUT /api/drive/file/:id) ──────────────────────────────
    if (req.method === 'PUT' && url.startsWith('/api/drive/file/')) {
      const fileId = url.replace('/api/drive/file/', '');
      const payload = await getRequestBody(req);

      if (!fileId || !supabase) {
        sendJsonResponse(res, 400, { error: 'Invalid file ID or Supabase unconfigured' });
        return true;
      }

      const { file_content, file_name, category, ...otherFields } = payload;

      if (file_content) {
        // Fetch old file record
        const { data: oldRecord } = await supabase
          .from('files')
          .select('drive_file_id, file_url, category')
          .eq('id', fileId)
          .single();

        let oldDriveFileId = oldRecord?.drive_file_id;
        if (!oldDriveFileId && oldRecord?.file_url) {
          const match = oldRecord.file_url.match(/id=([a-zA-Z0-9_-]+)/);
          if (match) oldDriveFileId = match[1];
        }

        const mimeMatch = file_content.match(/^data:([^;]+);base64,/);
        const mimeType = mimeMatch ? mimeMatch[1] : 'application/pdf';

        if (!ALLOWED_MIME_TYPES.includes(mimeType)) {
          sendJsonResponse(res, 400, { error: `Invalid file type: ${mimeType}` });
          return true;
        }

        const base64Data = file_content.replace(/^data:[^;]+;base64,/, '');
        const fileBuffer = Buffer.from(base64Data, 'base64');

        if (fileBuffer.length > MAX_FILE_SIZE_BYTES) {
          sendJsonResponse(res, 400, { error: 'File exceeds 20 MB limit' });
          return true;
        }

        const driveResult = await driveService.replaceFile(oldDriveFileId, {
          buffer: fileBuffer,
          fileName: file_name || 'replaced_file',
          mimeType: mimeType,
          category: category || oldRecord?.category || 'General'
        });

        payload.file_url = driveResult.fileUrl;
        payload.drive_file_id = driveResult.fileId;
        delete payload.file_content;
      }

      const { data: updatedData, error: updateErr } = await supabase
        .from('files')
        .update(payload)
        .eq('id', fileId)
        .select()
        .single();

      if (updateErr) {
        sendJsonResponse(res, 500, { error: updateErr.message });
        return true;
      }

      sendJsonResponse(res, 200, { success: true, data: updatedData });
      return true;
    }

    sendJsonResponse(res, 404, { error: 'Drive API endpoint not found' });
    return true;

  } catch (err: any) {
    console.error('[DriveApiHandler] Internal error:', err);
    sendJsonResponse(res, 500, { error: err.message || 'Internal server error' });
    return true;
  }
}
