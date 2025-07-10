import React, { useState, useRef } from 'react';
import { cn } from '@/utils/cn';

export interface UploadFile {
  uid: string;
  name: string;
  status?: 'uploading' | 'done' | 'error';
  response?: any;
  error?: any;
  size?: number;
  type?: string;
  url?: string;
  thumbUrl?: string;
  originFileObj?: File;
  percent?: number;
}

export interface UploadProps {
  accept?: string;
  multiple?: boolean;
  disabled?: boolean;
  directory?: boolean;
  maxCount?: number;
  fileList?: UploadFile[];
  defaultFileList?: UploadFile[];
  showUploadList?: boolean;
  listType?: 'text' | 'picture' | 'picture-card';
  className?: string;
  style?: React.CSSProperties;
  beforeUpload?: (file: File, fileList: File[]) => boolean | Promise<void>;
  onChange?: (info: { file: UploadFile; fileList: UploadFile[] }) => void;
  onPreview?: (file: UploadFile) => void;
  onRemove?: (file: UploadFile) => boolean | void;
  onProgress?: (percent: number, file: UploadFile) => void;
  customRequest?: (options: any) => void;
  children?: React.ReactNode;
}

const Upload: React.FC<UploadProps> = ({
  accept,
  multiple = false,
  disabled = false,
  directory = false,
  maxCount,
  fileList,
  defaultFileList = [],
  showUploadList = true,
  listType = 'text',
  className,
  style,
  beforeUpload,
  onChange,
  onPreview,
  onRemove,
  onProgress,
  customRequest,
  children,
}) => {
  const [internalFileList, setInternalFileList] = useState<UploadFile[]>(
    fileList || defaultFileList
  );
  const fileInputRef = useRef<HTMLInputElement>(null);

  const currentFileList = fileList || internalFileList;

  const handleFileInputChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    
    if (files.length === 0) return;

    // Check maxCount
    if (maxCount && currentFileList.length + files.length > maxCount) {
      console.warn(`Cannot upload more than ${maxCount} files`);
      return;
    }

    for (const file of files) {
      // Run beforeUpload if provided
      if (beforeUpload) {
        const result = await beforeUpload(file, files);
        if (result === false) {
          continue;
        }
      }

      const uploadFile: UploadFile = {
        uid: Date.now().toString() + Math.random().toString(36).substr(2, 9),
        name: file.name,
        status: 'uploading',
        size: file.size,
        type: file.type,
        originFileObj: file,
        percent: 0,
      };

      const newFileList = [...currentFileList, uploadFile];
      
      if (fileList === undefined) {
        setInternalFileList(newFileList);
      }

      onChange?.({ file: uploadFile, fileList: newFileList });

      // Start upload
      if (customRequest) {
        customRequest({
          file,
          onProgress: (percent: number) => {
            const updatedFile = { ...uploadFile, percent };
            const updatedFileList = newFileList.map(f => 
              f.uid === uploadFile.uid ? updatedFile : f
            );
            
            if (fileList === undefined) {
              setInternalFileList(updatedFileList);
            }
            
            onProgress?.(percent, updatedFile);
            onChange?.({ file: updatedFile, fileList: updatedFileList });
          },
          onSuccess: (response: any) => {
            const updatedFile = { ...uploadFile, status: 'done' as const, response, percent: 100 };
            const updatedFileList = newFileList.map(f => 
              f.uid === uploadFile.uid ? updatedFile : f
            );
            
            if (fileList === undefined) {
              setInternalFileList(updatedFileList);
            }
            
            onChange?.({ file: updatedFile, fileList: updatedFileList });
          },
          onError: (error: any) => {
            const updatedFile = { ...uploadFile, status: 'error' as const, error };
            const updatedFileList = newFileList.map(f => 
              f.uid === uploadFile.uid ? updatedFile : f
            );
            
            if (fileList === undefined) {
              setInternalFileList(updatedFileList);
            }
            
            onChange?.({ file: updatedFile, fileList: updatedFileList });
          },
        });
      } else {
        // Default behavior - just mark as done
        setTimeout(() => {
          const updatedFile = { ...uploadFile, status: 'done' as const, percent: 100 };
          const updatedFileList = newFileList.map(f => 
            f.uid === uploadFile.uid ? updatedFile : f
          );
          
          if (fileList === undefined) {
            setInternalFileList(updatedFileList);
          }
          
          onChange?.({ file: updatedFile, fileList: updatedFileList });
        }, 1000);
      }
    }

    // Clear input value
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleRemove = (file: UploadFile) => {
    const shouldRemove = onRemove ? onRemove(file) : true;
    
    if (shouldRemove !== false) {
      const newFileList = currentFileList.filter(f => f.uid !== file.uid);
      
      if (fileList === undefined) {
        setInternalFileList(newFileList);
      }
      
      onChange?.({ file, fileList: newFileList });
    }
  };

  const handlePreview = (file: UploadFile) => {
    onPreview?.(file);
  };

  const handleClick = () => {
    if (!disabled && fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const renderFileList = () => {
    if (!showUploadList || currentFileList.length === 0) {
      return null;
    }

    return (
      <div className="mt-2">
        {currentFileList.map(file => (
          <div
            key={file.uid}
            className={cn(
              'flex items-center gap-2 p-2 border border-gray-200 rounded mb-2',
              file.status === 'error' && 'border-red-200 bg-red-50'
            )}
          >
            <div className="flex-1">
              <div className="text-sm font-medium truncate">{file.name}</div>
              {file.status === 'uploading' && (
                <div className="w-full bg-gray-200 rounded-full h-1 mt-1">
                  <div
                    className="bg-blue-600 h-1 rounded-full transition-all duration-300"
                    style={{ width: `${file.percent || 0}%` }}
                  />
                </div>
              )}
              {file.status === 'error' && (
                <div className="text-xs text-red-600">Upload failed</div>
              )}
            </div>
            <div className="flex items-center gap-1">
              {file.status === 'done' && (
                <button
                  className="text-blue-600 hover:text-blue-800 text-sm"
                  onClick={() => handlePreview(file)}
                >
                  Preview
                </button>
              )}
              <button
                className="text-red-600 hover:text-red-800 text-sm"
                onClick={() => handleRemove(file)}
              >
                Remove
              </button>
            </div>
          </div>
        ))}
      </div>
    );
  };

  const uploadClasses = cn(
    'inline-block',
    className
  );

  const uploaderClasses = cn(
    'border-2 border-dashed border-gray-300 rounded-lg p-6 text-center transition-colors cursor-pointer hover:border-blue-500',
    disabled && 'cursor-not-allowed opacity-50 hover:border-gray-300'
  );

  const canUpload = !maxCount || currentFileList.length < maxCount;

  return (
    <div className={uploadClasses} style={style}>
      <input
        ref={fileInputRef}
        type="file"
        accept={accept}
        multiple={multiple}
        disabled={disabled}
        className="hidden"
        onChange={handleFileInputChange}
        {...(directory && { webkitdirectory: true })}
      />
      
      {canUpload && (
        <div className={uploaderClasses} onClick={handleClick}>
          {children || (
            <div className="flex flex-col items-center gap-2">
              <svg
                className="w-8 h-8 text-gray-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 48 48"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02"
                />
              </svg>
              <div className="text-sm text-gray-600">
                Click or drag file to this area to upload
              </div>
              <div className="text-xs text-gray-400">
                Support for a single or bulk upload
              </div>
            </div>
          )}
        </div>
      )}
      
      {renderFileList()}
    </div>
  );
};

export { Upload };