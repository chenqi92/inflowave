import React, { useRef, useState, useCallback } from 'react';
import { Typography } from '@/components/ui';
import { cn } from '@/lib/utils';
import { Button } from './button';
import { X, Upload as UploadIcon } from 'lucide-react';

export interface UploadFile {
  uid: string;
  name: string;
  status?: 'uploading' | 'done' | 'error' | 'removed';
  size?: number;
  type?: string;
  lastModified?: number;
  lastModifiedDate?: Date;
  originFileObj?: File;
}

export interface UploadProps {
  accept?: string;
  multiple?: boolean;
  maxCount?: number;
  fileList?: UploadFile[];
  beforeUpload?: (file: File, fileList: File[]) => boolean | Promise<boolean>;
  onChange?: (info: { file: UploadFile; fileList: UploadFile[] }) => void;
  onRemove?: (file: UploadFile) => void;
  disabled?: boolean;
  className?: string;
  children?: React.ReactNode;
  showUploadList?: boolean;
}

export interface DraggerProps extends UploadProps {
  children?: React.ReactNode;
}

const Upload: React.FC<UploadProps> & {
  Dragger: React.FC<DraggerProps>;
} = ({
  accept,
  multiple = false,
  maxCount = 1,
  fileList = [],
  beforeUpload,
  onChange,
  onRemove,
  disabled = false,
  className,
  children,
  showUploadList = true,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleClick = () => {
    if (!disabled && fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleFileChange = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const files = Array.from(event.target.files || []);

    for (const file of files) {
      if (maxCount && fileList.length >= maxCount) {
        break;
      }

      let shouldUpload = true;
      if (beforeUpload) {
        shouldUpload = await beforeUpload(file, files);
      }

      if (shouldUpload) {
        const uploadFile: UploadFile = {
          uid: `${Date.now()}-${Math.random()}`,
          name: file.name,
          size: file.size,
          type: file.type,
          status: 'done',
          originFileObj: file,
        };

        const newFileList = multiple ? [...fileList, uploadFile] : [uploadFile];
        onChange?.({ file: uploadFile, fileList: newFileList });
      }
    }

    // Reset input value
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleRemove = (file: UploadFile) => {
    onRemove?.(file);
    const newFileList = fileList.filter(f => f.uid !== file.uid);
    onChange?.({ file, fileList: newFileList });
  };

  return (
    <div className={cn('space-y-2', className)}>
      <input
        ref={fileInputRef}
        type='file'
        accept={accept}
        multiple={multiple}
        onChange={handleFileChange}
        className='hidden'
        disabled={disabled}
      />

      <div onClick={handleClick}>
        {children || (
          <Button variant='outline' disabled={disabled}>
            <UploadIcon className='w-4 h-4 mr-2' />
            选择文件
          </Button>
        )}
      </div>

      {showUploadList && fileList.length > 0 && (
        <div className='space-y-2'>
          {fileList.map(file => (
            <div
              key={file.uid}
              className='flex items-center justify-between p-2 border rounded-md bg-muted/50'
            >
              <div className='flex items-center space-x-2'>
                <span className='text-sm text-muted-foreground'>
                  {file.name}
                </span>
                {file.size && (
                  <span className='text-xs text-muted-foreground'>
                    ({(file.size / 1024).toFixed(1)} KB)
                  </span>
                )}
              </div>
              <Button
                variant='ghost'
                size='sm'
                onClick={() => handleRemove(file)}
                className='h-6 w-6 p-0'
              >
                <X className='w-3 h-3' />
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

const Dragger: React.FC<DraggerProps> = ({
  children,
  className,
  disabled,
  ...props
}) => {
  const [isDragOver, setIsDragOver] = useState(false);

  const handleDragOver = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      if (!disabled) {
        setIsDragOver(true);
      }
    },
    [disabled]
  );

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback(
    async (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragOver(false);

      if (disabled) return;

      const files = Array.from(e.dataTransfer.files);

      for (const file of files) {
        if (props.maxCount && (props.fileList?.length || 0) >= props.maxCount) {
          break;
        }

        let shouldUpload = true;
        if (props.beforeUpload) {
          shouldUpload = await props.beforeUpload(file, files);
        }

        if (shouldUpload) {
          const uploadFile: UploadFile = {
            uid: `${Date.now()}-${Math.random()}`,
            name: file.name,
            size: file.size,
            type: file.type,
            status: 'done',
            originFileObj: file,
          };

          const newFileList = props.multiple
            ? [...(props.fileList || []), uploadFile]
            : [uploadFile];
          props.onChange?.({ file: uploadFile, fileList: newFileList });
        }
      }
    },
    [disabled, props]
  );

  return (
    <div
      className={cn(
        'border-2 border-dashed border-border rounded-lg p-8 text-center cursor-pointer transition-colors',
        isDragOver && 'border-primary bg-primary/5',
        disabled && 'cursor-not-allowed opacity-50',
        className
      )}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <Upload {...props} showUploadList={false} className='w-full'>
        <div className='space-y-2'>
          {children || (
            <>
              <UploadIcon className='w-8 h-8 mx-auto text-muted-foreground' />
              <Typography.Text className='text-muted-foreground'>
                点击或拖拽文件到此区域上传
              </Typography.Text>
            </>
          )}
        </div>
      </Upload>

      {props.showUploadList !== false &&
        props.fileList &&
        props.fileList.length > 0 && (
          <div className='mt-4 space-y-2'>
            {props.fileList.map(file => (
              <div
                key={file.uid}
                className='flex items-center justify-between p-2 border rounded-md bg-muted/50'
              >
                <div className='flex items-center space-x-2'>
                  <span className='text-sm text-muted-foreground'>
                    {file.name}
                  </span>
                  {file.size && (
                    <span className='text-xs text-muted-foreground'>
                      ({(file.size / 1024).toFixed(1)} KB)
                    </span>
                  )}
                </div>
                <Button
                  variant='ghost'
                  size='sm'
                  onClick={() => props.onRemove?.(file)}
                  className='h-6 w-6 p-0'
                >
                  <X className='w-3 h-3' />
                </Button>
              </div>
            ))}
          </div>
        )}
    </div>
  );
};

Upload.Dragger = Dragger;

export { Upload };
export type { UploadFile as UploadFileType, UploadProps as UploadPropsType };
