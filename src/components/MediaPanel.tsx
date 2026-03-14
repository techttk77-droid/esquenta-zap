import React, { useEffect, useState, useRef } from 'react';
import * as api from '../api';
import styles from './MediaPanel.module.css';
import { Upload, Trash2 } from 'lucide-react';

const BACKEND = import.meta.env.DEV
  ? ''
  : 'https://api-esquenta-zap-production.up.railway.app';

const UPLOAD_PATHS: Record<string, string> = {
  audio: 'audios',
  sticker: 'stickers',
  image: 'images',
  video: 'videos',
};

interface Media {
  id: string;
  name: string;
  type: string;
  filename: string;
  created_at: string;
}

type Tab = 'audio' | 'sticker' | 'image' | 'video';

const TAB_CONFIG: Record<Tab, { label: string; icon: string; accept: string; hint: string }> = {
  audio:   { label: 'Áudios',    icon: '🎵', accept: 'audio/*,.ogg,.mp3,.opus', hint: '.ogg, .mp3, .opus' },
  sticker: { label: 'Figurinhas', icon: '🎭', accept: 'image/webp,.webp',           hint: '.webp' },
  image:   { label: 'Imagens',    icon: '🖼️', accept: 'image/*',                   hint: '.jpg, .png, .gif, .webp' },
  video:   { label: 'Vídeos',    icon: '📹', accept: 'video/*',                   hint: '.mp4, .mov, .webm' },
};

export default function MediaPanel() {
  const [media, setMedia] = useState<Media[]>([]);
  const [tab, setTab] = useState<Tab>('audio');
  const inputRefs = {
    audio:   useRef<HTMLInputElement>(null),
    sticker: useRef<HTMLInputElement>(null),
    image:   useRef<HTMLInputElement>(null),
    video:   useRef<HTMLInputElement>(null),
  };
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    api.getMedia().then(setMedia).catch(() => {});
  }, []);

  const handleUpload = async (file: File, type: Tab) => {
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('name', file.name);
      let result;
      if (type === 'audio')   result = await api.uploadAudio(fd);
      else if (type === 'sticker') result = await api.uploadSticker(fd);
      else if (type === 'image')   result = await api.uploadImage(fd);
      else                         result = await api.uploadVideo(fd);
      setMedia((prev) => [...prev, { ...result, type }]);
    } catch (e: any) {
      alert('Erro no upload: ' + (e.response?.data?.error || e.message));
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Remover arquivo?')) return;
    try {
      await api.deleteMedia(id);
      setMedia((prev) => prev.filter((m) => m.id !== id));
    } catch (e: any) {
      alert('Erro ao remover: ' + e.message);
    }
  };

  const cfg = TAB_CONFIG[tab];
  const filtered = media.filter((m) => m.type === tab);

  return (
    <div>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Biblioteca de Mídia</h1>
          <p className={styles.subtitle}>Áudios, figurinhas, imagens e vídeos usados nas conversas automáticas</p>
        </div>
      </div>

      <div className={styles.tabs}>
        {(Object.keys(TAB_CONFIG) as Tab[]).map((t) => (
          <button
            key={t}
            className={`${styles.tab} ${tab === t ? styles.tabActive : ''}`}
            onClick={() => setTab(t)}
          >
            {TAB_CONFIG[t].icon} {TAB_CONFIG[t].label} ({media.filter((m) => m.type === t).length})
          </button>
        ))}
      </div>

      {/* Upload zone */}
      <div
        className={styles.uploadZone}
        onClick={() => inputRefs[tab].current?.click()}
      >
        {(Object.keys(TAB_CONFIG) as Tab[]).map((t) => (
          <input
            key={t}
            ref={inputRefs[t]}
            type="file"
            accept={TAB_CONFIG[t].accept}
            style={{ display: 'none' }}
            onChange={(e) => e.target.files?.[0] && handleUpload(e.target.files[0], t)}
          />
        ))}
        <Upload size={28} className={styles.uploadIcon} />
        <p className={styles.uploadText}>
          {uploading
            ? 'Enviando...'
            : `Clique para enviar ${cfg.label.toLowerCase()} (${cfg.hint})`}
        </p>
      </div>

      {/* Media list */}
      {filtered.length === 0 ? (
        <div className={styles.empty}>
          <span>{cfg.icon}</span>
          <p>Nenhum arquivo enviado ainda.</p>
        </div>
      ) : (
        <div className={styles.mediaGrid}>
          {filtered.map((m) => {
            const src = `${BACKEND}/uploads/${UPLOAD_PATHS[m.type]}/${m.filename}`;
            return (
              <div key={m.id} className={styles.mediaCard}>
                <div className={styles.mediaIcon}>{cfg.icon}</div>
                <div className={styles.mediaInfo}>
                  <div className={styles.mediaName}>{m.name}</div>
                  <div className={styles.mediaDate}>
                    {new Date(m.created_at).toLocaleDateString('pt-BR')}
                  </div>
                </div>
                {tab === 'audio' && (
                  <audio controls className={styles.audioPlayer} src={src} />
                )}
                {tab === 'sticker' && (
                  <img className={styles.stickerPreview} src={src} alt={m.name} />
                )}
                {tab === 'image' && (
                  <img className={styles.imagePreview} src={src} alt={m.name} />
                )}
                {tab === 'video' && (
                  <video controls className={styles.videoPlayer} src={src} />
                )}
                <button className={styles.btnDelete} onClick={() => handleDelete(m.id)}>
                  <Trash2 size={14} />
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
