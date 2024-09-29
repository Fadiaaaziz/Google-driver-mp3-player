'use client'
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Menu, Search, X } from 'lucide-react';
import { ErrorBoundary } from 'react-error-boundary';
import Player from '../player/page';

// Define a color palette
const colors = {
  primary: '#4FD1C5',
  primaryDark: '#319795',
  secondary: '#2D3748',
  background: '#F7FAFC',
  text: '#1A202C',
  textLight: '#718096',
  white: '#FFFFFF',
};

// Define a typography scale
const typography = {
  h1: 'text-2xl font-bold sm:text-3xl md:text-4xl lg:text-5xl',
  h2: 'text-xl font-semibold sm:text-2xl md:text-3xl lg:text-4xl',
  h3: 'text-lg font-medium sm:text-xl md:text-2xl lg:text-3xl',
  body: 'text-sm sm:text-base md:text-lg',
  small: 'text-xs sm:text-sm md:text-base',
};

// Define a spacing scale
const spacing = {
  xs: 'p-1 sm:p-2',
  sm: 'p-2 sm:p-3',
  md: 'p-3 sm:p-4 lg:p-5',
  lg: 'p-4 sm:p-6 lg:p-8',
  xl: 'p-6 sm:p-8 lg:p-10',
};

interface File {
  id: string;
  name: string;
  mimeType: string;
  folderId: string;
}

interface Folder {
  id: string;
  name: string;
}

const API_KEY = 'AIzaSyDLcMWPDMRjrf74olIkuccJVWeemWofIRI';
const FOLDER_IDS = [
  '1H5BS9AQn9NFpttoT67gZhwXtiEoYAUtw',
  '1oU1UvI3i2BF_q1wxXcQyYv0v_stTVJQ-',
  '1jDthCEB6UYlMAxI0X6jqyfDDtqEmWUHr',
  '1Pnu0NWqEdLliX8cxD6g6V7DCQpBBlgJ2'
];
const PAGE_SIZE = 50;

const SayahdeenDashboard: React.FC = () => {
  const [folders, setFolders] = useState<Folder[]>([]);
  const [currentTrack, setCurrentTrack] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [files, setFiles] = useState<File[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMorePages, setHasMorePages] = useState(true);
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
  const [openedFolderId, setOpenedFolderId] = useState(null);
  const [selected, setSelected] = useState(false);
  const audioRef = useRef(null);

  useEffect(() => {
    getFolders();
  }, []);

  const getFolders = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const folderPromises = FOLDER_IDS.map(id =>
        fetch(`https://www.googleapis.com/drive/v3/files/${id}?fields=id,name&key=${API_KEY}`)
          .then(response => response.json())
      );
      const folderData = await Promise.all(folderPromises);
      setFolders(folderData);
    } catch (error) {
      setError('Error fetching folders');
      console.error('Error fetching folders:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const loadFilesInFolder = useCallback(async (folderId: string, page: number) => {
    setIsLoading(true);
    setError(null);
    try {
      const url = `https://www.googleapis.com/drive/v3/files?q='${folderId}'+in+parents&fields=nextPageToken,files(id,name,mimeType)&pageSize=${PAGE_SIZE}&orderBy=name&pageToken=${page > 1 ? files[files.length - 1].id : ''}&key=${API_KEY}`;
      const response = await fetch(url);
      const data = await response.json();

      if (data.files) {
        const filesWithoutExtensions = data.files.map((file: File) => ({
          ...file,
          name: file.name.split('.').slice(0, -1).join('.') || file.name,
          folderId
        }));
        setFiles(prevFiles => [...prevFiles, ...filesWithoutExtensions]);
        setHasMorePages(!!data.nextPageToken);
      }
    } catch (error) {
      setError('Error loading files');
      console.error('Error loading files:', error);
    } finally {
      setIsLoading(false);
    }
  }, [files]);

  const handleFolderClick = useCallback((folderId: string) => {
    setOpenedFolderId(openedFolderId === folderId ? null : folderId);
    setFiles([]);
    setCurrentPage(1);
    setHasMorePages(true);
    setSelectedFolderId(folderId);
    loadFilesInFolder(folderId, 1);
  }, [loadFilesInFolder, openedFolderId]);

  const handleTrackSelect = useCallback((fileId: string) => {
    setSelected((prev) => !prev);
    setCurrentTrack(fileId);
  }, []);

  const handleLoadMore = () => {
    if (hasMorePages && !isLoading && selectedFolderId) {
      setCurrentPage(prevPage => prevPage + 1);
      loadFilesInFolder(selectedFolderId, currentPage + 1);
    }
  };

  const filteredFiles = files.filter(file =>
    file.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Animations for list items
  const listItemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: -20 },
  };

  const LogoSVG: React.FC<{ className?: string }> = ({ className }) => (
    <svg className={className} viewBox="0 0 40 40">
      <motion.circle
        cx="20"
        cy="20"
        r="18"
        fill={colors.primary}
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ duration: 0.5, type: "spring" }}
      />
      <motion.path
        d="M12 20 L 18 26 L 28 16"
        stroke={colors.white}
        strokeWidth="3"
        fill="none"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 0.5, delay: 0.3 }}
      />
    </svg>
  );

  const ErrorFallback: React.FC<{ error: Error }> = ({ error }) => (
    <div className={`text-center ${spacing.md} bg-red-100 text-red-800 rounded-lg`}>
      <h2 className={`${typography.h2} mb-2`}>عذرًا، حدث خطأ غير متوقع</h2>
      <p className={typography.body}>{error.message}</p>
    </div>
  );

  const SkeletonLoader: React.FC = () => (
    <div className={`${spacing.md} space-y-4`}>
      {[...Array(5)].map((_, index) => (
        <div key={index} className="animate-pulse flex space-x-4">
          <div className={`rounded-lg bg-gray-200 h-12 w-full`}></div>
        </div>
      ))}
    </div>
  );

  // Animations for sidebar
  const sidebarVariants = {
    open: { x: 0 },
    closed: { x: '-100%' },
  };

  return (
    <ErrorBoundary FallbackComponent={ErrorFallback}>
    <div className={`flex flex-col h-screen bg-${colors.background} text-${colors.text} font-['Noto Kufi Arabic', sans-serif] overflow-hidden`}>
      {/* Header */}
      <header className={`bg-${colors.white} shadow-sm ${spacing.sm} flex justify-between items-center sticky top-0 z-10`}>
        {!isMenuOpen && (
          <motion.button
            className={`text-${colors.textLight} hover:text-${colors.text}`}
            onClick={() => setIsMenuOpen(true)}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
          >
            <Menu className="w-6 h-6" />
          </motion.button>
        )}
        {!isMenuOpen && (
          <div className="relative w-full max-w-xs sm:max-w-sm md:max-w-md lg:max-w-lg xl:max-w-xl mx-2">
            <input
              type="text"
              placeholder="بحث..."
              className={`w-full pl-10 pr-4 py-2 rounded-full bg-${colors.background} focus:outline-none focus:ring-2 focus:ring-${colors.primary} ${typography.body}`}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <Search className={`absolute left-3 top-1/2 transform -translate-y-1/2 text-${colors.textLight} w-5 h-5`} />
          </div>
        )}
      </header>

      {/* Main content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar */}
        <motion.div
          className={`bg-${colors.white} w-64 sm:w-72 lg:w-80 shadow-lg overflow-y-auto fixed inset-y-0 left-0 z-20`}
          variants={sidebarVariants}
          initial="closed"
          animate={isMenuOpen ? "open" : "closed"}
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
        >
          <div className={`${spacing.md} flex items-center justify-between`}>
            <div className="flex items-center space-x-2">
              <LogoSVG className="w-8 h-8 sm:w-10 sm:h-10" />
              <h1 className={`${typography.h2} text-${colors.primary}`}>سيهدين</h1>
            </div>
            <motion.button
              className={`text-${colors.textLight} hover:text-${colors.text}`}
              onClick={() => setIsMenuOpen(false)}
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
            >
              <X className="w-6 h-6" />
            </motion.button>
          </div>
            <nav className={`mt-4 ${spacing.sm}`}>
              {folders.map(folder => (
                <motion.button
                  key={folder.id}
                  className={`w-full text-right ${spacing.sm} flex items-center space-x-3 text-${colors.textLight} hover:bg-${colors.background}`}
                  onClick={() => handleFolderClick(folder.id)}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <span className={typography.h3}>
                    {openedFolderId === folder.id ? '📂' : '📁'}
                  </span>
                  <span className={typography.body}>{folder.name}</span>
                </motion.button>
              ))}
            </nav>
          </motion.div>

          {/* File list */}
          <main className={`flex-1 overflow-y-auto ${spacing.md} ${isMenuOpen ? 'ml-64 sm:ml-72 lg:ml-80' : ''}`}>
            {isLoading ? (
              <SkeletonLoader />
            ) : error ? (
              <div className={`text-center text-red-500 ${typography.body}`}>{error}</div>
            ) : (
              <AnimatePresence>
                {filteredFiles.map((file, index) => (
                  <motion.div
                    key={file.id}
                    variants={listItemVariants}
                    initial="hidden"
                    animate="visible"
                    exit="exit"
                    transition={{ duration: 0.3, delay: index * 0.05 }}
                  >
                    <motion.button
                      className={`w-full text-right ${spacing.sm} mb-2 rounded-lg shadow-md flex justify-between items-center ${
                        currentTrack === file.id ? `bg-${colors.primary} text-${colors.white}` : `bg-${colors.white} text-${colors.text} hover:bg-${colors.background}`
                      }`}
                      onClick={() => handleTrackSelect(file.id)}
                      whileHover={{ scale: 1.03 }}
                      whileTap={{ scale: 0.98 }}
                      animate={currentTrack === file.id ? { scale: [1, 1.05, 1] } : {}}
                      transition={{ duration: 0.3 }}
                    >
                      <span className={`font-medium ${typography.body}`}>{file.name}</span>
                      <span className={`${typography.small} text-${colors.textLight}`}>{file.mimeType}</span>
                    </motion.button>
                  </motion.div>
                ))}
              </AnimatePresence>
            )}
            {hasMorePages && (
              <motion.button
                className={`w-full ${spacing.sm} mt-4 bg-${colors.primary} text-${colors.white} rounded-lg shadow-md hover:bg-${colors.primaryDark} ${typography.body}`}
                onClick={handleLoadMore}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                تحميل المزيد
              </motion.button>
            )}
          </main>
        </div>
        
        {/* Player */}
        <div className="sticky bottom-0 w-full bg-white shadow-lg">
          {selected && (
            <Player files={files} currentTrack={currentTrack} setCurrentTrack={setCurrentTrack} audioRef={audioRef}/>
          )}
        </div>
      </div>
    </ErrorBoundary>
  );
};

export default SayahdeenDashboard;