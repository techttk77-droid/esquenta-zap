import React, { useEffect, useState, useRef } from 'react';
import * as api from '../api';
import styles from './MediaPanel.module.css';
import { Upload, Trash2 } from 'lucide-react';

interface Media {
  id: string;
  name: string;
  type: string;
  filename: string;
  created_at: string;
}

export default function MediaPanel() {
  const [media, setMedia] = useState<Media[]>([]);
  const [tab, setTab] = useState<'audio' | 'sticker'>('audio');
  const audioRef = useRef<HTMLInputElement>(null);
  const stickerRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    api.getMedia().then(setMedia).catch(() => {});
  }, []);

  const handleUpload = async (file: File, type: 'audio' | 'sticker') => {
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('name', file.name);
      const result = type === 'audio' ? await api.uploadAudio(fd) : await api.uploadSticker(fd);
      setMedia((prev) => [...prev, { ...result, type }]);
    } catch (e: any) {
      alert('Erro no upload: ' + e.message);
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Remover arquivo?')) return;
    await api.deleteMedia(id);
    setMedia((prev) => prev.filter((m) => m.id !== id));
  };

  const filtered = media.filter((m) => m.type === tab);

  return (
    <div>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Biblioteca de Mídia</h1>
          <p className={styles.subtitle}>Áudios e figurinhas usados nas conversas automáticas</p>
        </div>
      </div>

      <div className={styles.tabs}>
        <button
          className={`${styles.tab} ${tab === 'audio' ? styles.tabActive : ''}`}
          onClick={() => setTab('audio')}
        >
          🎵 Áudios ({media.filter((m) => m.type === 'audio').length})
        </button>
        <button
          className={`${styles.tab} ${tab === 'sticker' ? styles.tabActive : ''}`}
          onClick={() => setTab('sticker')}
        >
          🎭 Figurinhas ({media.filter((m) => m.type === 'sticker').length})
        </button>
      </div>

      {/* Upload zone */}
      <div
        className={styles.uploadZone}
        onClick={() => (tab === 'audio' ? audioRef : stickerRef).current?.click()}
      >
        <input
          ref={audioRef}
          type="file"
          accept="audio/*,.ogg,.mp3,.opus"
          style={{ display: 'none' }}
          onChange={(e) => e.target.files?.[0] && handleUpload(e.target.files[0], 'audio')}
        />
        <input
          ref={stickerRef}
          type="file"
          accept="image/webp,.webp"
          style={{ display: 'none' }}
          onChange={(e) => e.target.files?.[0] && handleUpload(e.target.files[0], 'sticker')}
        />
        <Upload size={28} className={styles.uploadIcon} />
        <p className={styles.uploadText}>
          {uploading
            ? 'Enviando...'
            : tab === 'audio'
            ? 'Clique para enviar áudio (.ogg, .mp3, .opus)'
            : 'Clique para enviar figurinha (.webp)'}
        </p>
      </div>

      {/* Media list */}
      {filtered.length === 0 ? (
        <div className={styles.empty}>
          <span>{tab === 'audio' ? '🎵' : '🎭'}</span>
          <p>Nenhum arquivo enviado ainda.</p>
        </div>
      ) : (
        <div className={styles.mediaGrid}>
          {filtered.map((m) => (
            <div key={m.id} className={styles.mediaCard}>
              <div className={styles.mediaIcon}>{tab === 'audio' ? '🎵' : '🎭'}</div>
              <div className={styles.mediaInfo}>
                <div className={styles.mediaName}>{m.name}</div>
                <div className={styles.mediaDate}>
                  {new Date(m.created_at).toLocaleDateString('pt-BR')}
                </div>
              </div>
              {tab === 'audio' && (
                <audio
                  controls
                  className={styles.audioPlayer}
                  src={`/uploads/audios/${m.filename}`}
                />
              )}
              {tab === 'sticker' && (
                <img
                  className={styles.stickerPreview}
                  src={`/uploads/stickers/${m.filename}`}
                  alt={m.name}
                />
              )}
              <button
                className={styles.btnDelete}
                onClick={() => handleDelete(m.id)}
              >
                <Trash2 size={14} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
