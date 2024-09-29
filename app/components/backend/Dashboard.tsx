'use client'
'use client'
import React, { useState, useEffect } from 'react';
import { gapi } from 'gapi-script';
import { ChevronRight, Search, Loader } from 'lucide-react';
import Head from 'next/head';

const GOOGLE_DRIVE_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_DRIVE_API_KEY;
const GOOGLE_DRIVE_CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_DRIVE_CLIENT_ID;
const ROOT_FOLDER_ID = process.env.NEXT_PUBLIC_ROOT_FOLDER_ID;

interface DriveFile {
  id: string;
  name: string;
  mimeType: string;
}

interface FolderData {
  id: string;
  name: string;
  items: DriveFile[];
  nextPageToken: string | null;
}

const FolderIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-yellow-500" viewBox="0 0 20 20" fill="currentColor">
    <path fillRule="evenodd" d="M2 6a2 2 0 012-2h4l2 2h4a2 2 0 012 2v1H8a3 3 0 00-3 3v1.5a1.5 1.5 0 01-3 0V6z" clipRule="evenodd" />
    <path d="M6 12a2 2 0 012-2h8a2 2 0 012 2v4a2 2 0 01-2 2H8a2 2 0 01-2-2v-4z" />
  </svg>
);

const FileIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-blue-500" viewBox="0 0 20 20" fill="currentColor">
    <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" clipRule="evenodd" />
  </svg>
);

const OpenFileIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-gray-400" viewBox="0 0 20 20" fill="currentColor">
    <path d="M11 3a1 1 0 100 2h2.586l-6.293 6.293a1 1 0 101.414 1.414L15 6.414V9a1 1 0 102 0V4a1 1 0 00-1-1h-5z" />
    <path d="M5 5a2 2 0 00-2 2v8a2 2 0 002 2h8a2 2 0 002-2v-3a1 1 0 10-2 0v3H5V7h3a1 1 0 000-2H5z" />
  </svg>
);

const initializeGoogleDriveAPI = (): Promise<void> => {
  return new Promise((resolve) => {
    gapi.load('client', () => {
      gapi.client.init({
        apiKey: GOOGLE_DRIVE_API_KEY,
        clientId: GOOGLE_DRIVE_CLIENT_ID,
        discoveryDocs: ['https://www.googleapis.com/discovery/v1/apis/drive/v3/rest'],
        scope: 'https://www.googleapis.com/auth/drive.readonly',
      }).then(() => {
        resolve();
      });
    });
  });
};

const fetchData = async (folderId: string, searchTerm: string = '', pageToken: string | null = null): Promise<FolderData> => {
  await initializeGoogleDriveAPI();

  let query = `'${folderId}' in parents`;
  if (searchTerm) {
    query += ` and name contains '${searchTerm}'`;
  }

  const response = await gapi.client.drive.files.list({
    q: query,
    fields: 'nextPageToken, files(id, name, mimeType)',
    pageSize: 20,
    pageToken: pageToken || undefined,
  });

  const files = response.result.files || [];

  return {
    id: folderId,
    name: folderId === ROOT_FOLDER_ID ? 'Root' : files.find(f => f.id === folderId)?.name || 'Unknown',
    items: files,
    nextPageToken: response.result.nextPageToken || null,
  };
};

const FileExplorer: React.FC = () => {
  const [folderStack, setFolderStack] = useState<FolderData[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchTerm, setSearchTerm] = useState<string>('');

  useEffect(() => {
    loadFolder(ROOT_FOLDER_ID);
  }, []);

  const loadFolder = async (folderId: string, isSearch: boolean = false) => {
    setLoading(true);
    try {
      const result = await fetchData(folderId, isSearch ? searchTerm : '');
      if (isSearch) {
        setFolderStack([result]);
      } else {
        setFolderStack(prevStack => [...prevStack, result]);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    }
    setLoading(false);
  };

  const handleFolderClick = (folder: DriveFile) => {
    loadFolder(folder.id);
    setSearchTerm('');
  };

  const handleFileClick = async (file: DriveFile) => {
    try {
      setLoading(true);
      const response = await gapi.client.drive.files.get({
        fileId: file.id,
        fields: 'webViewLink, webContentLink',
      });

      const { webViewLink, webContentLink } = response.result;
      const fileUrl = webViewLink || webContentLink;

      if (fileUrl) {
        window.open(fileUrl, '_blank');
      } else {
        alert('Unable to open this file. It might not be accessible or supported.');
      }
    } catch (error) {
      console.error('Error opening file:', error);
      alert('An error occurred while trying to open the file.');
    } finally {
      setLoading(false);
    }
  };

  const handleBreadcrumbClick = (index: number) => {
    setFolderStack(prevStack => prevStack.slice(0, index + 1));
    setSearchTerm('');
  };

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
    if (e.target.value) {
      loadFolder(folderStack[folderStack.length - 1].id, true);
    } else {
      loadFolder(folderStack[folderStack.length - 1].id);
    }
  };

  const handleLoadMore = async () => {
    setLoading(true);
    try {
      const currentFolder = folderStack[folderStack.length - 1];
      const result = await fetchData(currentFolder.id, searchTerm, currentFolder.nextPageToken);
      setFolderStack(prevStack => {
        const newStack = [...prevStack];
        newStack[newStack.length - 1] = {
          ...currentFolder,
          items: [...currentFolder.items, ...result.items],
          nextPageToken: result.nextPageToken,
        };
        return newStack;
      });
    } catch (error) {
      console.error('Error loading more items:', error);
    }
    setLoading(false);
  };

  const currentFolder = folderStack[folderStack.length - 1];

  return (
    <>
      <Head>
        <title>Google Drive Explorer</title>
        <meta name="description" content="Browse your Google Drive files" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <main className="min-h-screen bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 p-8">
        <div className="bg-white rounded-lg shadow-2xl p-8 max-w-4xl mx-auto">
          <h1 className="text-3xl font-bold mb-6 text-gray-800">My Google Drive</h1>
          
          {/* Breadcrumbs */}
          <nav className="flex items-center space-x-2 mb-6 bg-gray-100 p-3 rounded-md">
            {folderStack.map((folder, index) => (
              <React.Fragment key={folder.id}>
                {index > 0 && <ChevronRight className="w-4 h-4 text-gray-500" />}
                <button
                  onClick={() => handleBreadcrumbClick(index)}
                  className="text-blue-600 hover:underline font-medium"
                >
                  {folder.name}
                </button>
              </React.Fragment>
            ))}
          </nav>

          {/* Search */}
          <div className="mb-6 relative">
            <input
              type="text"
              placeholder="Search files and folders"
              value={searchTerm}
              onChange={handleSearch}
              className="w-full p-3 pr-10 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
            <Search className="absolute right-3 top-3 text-gray-400" />
          </div>

          {loading && folderStack.length === 1 ? (
            <div className="flex justify-center items-center h-64">
              <Loader className="w-12 h-12 text-purple-600 animate-spin" />
            </div>
          ) : (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-semibold mb-3 text-gray-700">Folders</h2>
                <ul className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                  {currentFolder?.items.filter(item => item.mimeType === 'application/vnd.google-apps.folder').map((folder) => (
                    <li
                      key={folder.id}
                      onClick={() => handleFolderClick(folder)}
                      className="flex items-center space-x-3 bg-gray-50 hover:bg-gray-100 p-3 rounded-md cursor-pointer transition duration-200"
                    >
                      <FolderIcon />
                      <span className="truncate">{folder.name}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <h2 className="text-xl font-semibold mb-3 text-gray-700">Files</h2>
                <ul className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                  {currentFolder?.items.filter(item => item.mimeType !== 'application/vnd.google-apps.folder').map((file) => (
                    <li
                      key={file.id}
                      onClick={() => handleFileClick(file)}
                      className="flex items-center justify-between bg-gray-50 hover:bg-gray-100 p-3 rounded-md cursor-pointer transition duration-200"
                    >
                      <div className="flex items-center space-x-3 truncate">
                        <FileIcon />
                        <span className="truncate">{file.name}</span>
                      </div>
                      <OpenFileIcon />
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}

          {currentFolder?.nextPageToken && (
            <button
              onClick={handleLoadMore}
              className="mt-6 bg-purple-500 text-white px-6 py-2 rounded-md hover:bg-purple-600 transition duration-200 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-opacity-50"
            >
              Load More
            </button>
          )}

          {loading && folderStack.length > 1 && (
            <div className="flex justify-center items-center mt-6">
              <Loader className="w-8 h-8 text-purple-600 animate-spin" />
            </div>
          )}
        </div>
      </main>
    </>
  );
};

export default FileExplorer;