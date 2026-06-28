import React, { useState, useRef } from 'react';
import { UploadCloud, Music, Check, AlertCircle } from 'lucide-react';

interface UploaderProps {
  room: string;
  onUploadSuccess: () => void;
}

interface UploadTask {
  name: string;
  size: number;
  progress: number;
  status: 'uploading' | 'completed' | 'failed';
  error?: string;
}

export default function Uploader({ room, onUploadSuccess }: UploaderProps) {
  const [isDragOver, setIsDragOver] = useState(false);
  const [tasks, setTasks] = useState<UploadTask[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFiles(e.dataTransfer.files);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFiles(e.target.files);
    }
  };

  const handleFiles = (fileList: FileList) => {
    const audioFiles = Array.from(fileList).filter((file) => file.type.startsWith('audio/'));

    if (audioFiles.length === 0) {
      alert('Please select valid audio files only (MP3, WAV, M4A, etc.)');
      return;
    }

    // Initialize tasks
    const newTasks = audioFiles.map((file) => ({
      name: file.name,
      size: file.size,
      progress: 0,
      status: 'uploading' as const,
    }));

    setTasks((prev) => [...newTasks, ...prev]);

    // Upload each file
    audioFiles.forEach((file, index) => {
      uploadFile(file, newTasks[index].name);
    });
  };

  const uploadFile = (file: File, taskName: string) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('room', room);

    const xhr = new XMLHttpRequest();

    xhr.upload.addEventListener('progress', (e) => {
      if (e.lengthComputable) {
        const percentComplete = Math.round((e.loaded / e.total) * 100);
        updateTaskProgress(taskName, percentComplete);
      }
    });

    xhr.addEventListener('load', () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          const res = JSON.parse(xhr.responseText);
          if (res.success) {
            updateTaskStatus(taskName, 'completed');
            onUploadSuccess();
          } else {
            updateTaskStatus(taskName, 'failed', res.message || 'Upload failed');
          }
        } catch (e) {
          updateTaskStatus(taskName, 'failed', 'Invalid server response');
        }
      } else {
        updateTaskStatus(taskName, 'failed', `Error: ${xhr.statusText || xhr.status}`);
      }
    });

    xhr.addEventListener('error', () => {
      updateTaskStatus(taskName, 'failed', 'Network error occurred');
    });

    xhr.open('POST', '/api/upload');
    xhr.send(formData);
  };

  const updateTaskProgress = (name: string, progress: number) => {
    setTasks((prev) =>
      prev.map((t) => (t.name === name && t.status === 'uploading' ? { ...t, progress } : t))
    );
  };

  const updateTaskStatus = (name: string, status: 'completed' | 'failed', error?: string) => {
    setTasks((prev) =>
      prev.map((t) => (t.name === name ? { ...t, status, progress: status === 'completed' ? 100 : t.progress, error } : t))
    );
  };

  const formatSize = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const activeTasks = tasks.filter((t) => t.status === 'uploading');
  const completedTasks = tasks.filter((t) => t.status === 'completed');
  const failedTasks = tasks.filter((t) => t.status === 'failed');

  return (
    <div className="space-y-6" id="uploader-section">
      <div
        id="drag-drop-zone"
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`border-2 border-dashed rounded-3xl p-8 text-center cursor-pointer transition-all ${
          isDragOver
            ? 'border-slate-800 bg-slate-50'
            : 'border-gray-200 hover:border-gray-300 bg-white'
        }`}
      >
        <input
          id="hidden-file-input"
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          accept="audio/*"
          multiple
          className="hidden"
        />

        <div className="flex flex-col items-center">
          <div className="p-4 bg-slate-50 rounded-2xl mb-4 border border-slate-100">
            <UploadCloud className="w-8 h-8 text-slate-800" />
          </div>
          <h3 className="text-base font-semibold text-gray-900">Upload Music Files</h3>
          <p className="text-xs text-gray-500 mt-1 max-w-xs mx-auto">
            Drag and drop your MP3, WAV, or audio files here, or <span className="text-slate-900 font-medium underline underline-offset-2">browse files</span>.
          </p>
          <span className="text-[10px] text-gray-400 mt-3 block uppercase tracking-wider font-semibold">
            High-speed local Wi-Fi transfer
          </span>
        </div>
      </div>

      {tasks.length > 0 && (
        <div className="bg-white border border-gray-100 rounded-3xl p-6 shadow-sm space-y-4" id="upload-status-panel">
          <div className="flex items-center justify-between border-b border-gray-50 pb-3">
            <h4 className="text-sm font-semibold text-gray-800">Transfer Status</h4>
            <span className="text-xs font-medium text-gray-500">
              {activeTasks.length > 0 ? `Uploading (${activeTasks.length})` : 'All transfers done'}
            </span>
          </div>

          <div className="max-h-60 overflow-y-auto space-y-3 pr-1">
            {tasks.map((task, idx) => (
              <div key={idx} className="flex items-start gap-3 p-3 bg-slate-50 rounded-2xl border border-gray-100/50">
                <div className="p-2 bg-white rounded-xl text-slate-600 border border-gray-100">
                  <Music className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-xs font-semibold text-gray-800 truncate" title={task.name}>
                      {task.name}
                    </p>
                    <span className="text-[10px] text-gray-500 flex-shrink-0 font-medium">
                      {formatSize(task.size)}
                    </span>
                  </div>

                  <div className="mt-2 flex items-center gap-3">
                    <div className="flex-1 bg-gray-200 rounded-full h-1.5 overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-300 ${
                          task.status === 'failed'
                            ? 'bg-red-500'
                            : task.status === 'completed'
                            ? 'bg-emerald-500'
                            : 'bg-slate-800'
                        }`}
                        style={{ width: `${task.progress}%` }}
                      ></div>
                    </div>
                    <span className="text-[10px] font-bold text-gray-600 w-8 text-right">
                      {task.progress}%
                    </span>
                  </div>

                  {task.status === 'failed' && (
                    <div className="mt-1 flex items-center gap-1 text-[10px] text-red-500">
                      <AlertCircle className="w-3 h-3 flex-shrink-0" />
                      <span className="truncate">{task.error || 'Upload failed'}</span>
                    </div>
                  )}

                  {task.status === 'completed' && (
                    <div className="mt-1 flex items-center gap-1 text-[10px] text-emerald-600">
                      <Check className="w-3 h-3 flex-shrink-0" />
                      <span>Synced successfully</span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
