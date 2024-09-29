import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const config = {
  env: {
    GOOGLE_DRIVE_FOLDER_ID: process.env.GOOGLE_DRIVE_FOLDER_ID,
  },
  webpack: (config, { isServer }) => {
    if (isServer) {
      config.resolve.alias['clientsecret.json'] = path.resolve(__dirname, './clientsecret.json');
    }
    return config;
  },
};

export default config;