import { useEffect } from 'react';

/**
 * Modal lightbox para ver imágenes ampliadas en alta resolución con soporte para tecla Esc y cierre al hacer clic afuera.
 */
export function ImageModal({ selectedImage, onClose }) {
  useEffect(() => {
    if (!selectedImage) return;

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [selectedImage, onClose]);

  if (!selectedImage) return null;

  return (
    <div
      role="presentation"
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px',
        background: 'rgba(8, 14, 28, 0.88)',
        backdropFilter: 'blur(5px)',
        cursor: 'zoom-out',
      }}
    >
      <button
        type="button"
        aria-label="Cerrar imagen ampliada"
        onClick={onClose}
        style={{
          position: 'absolute',
          top: '18px',
          right: '22px',
          width: '44px',
          height: '44px',
          border: '1px solid rgba(255,255,255,.35)',
          borderRadius: '50%',
          color: '#fff',
          background: 'rgba(255,255,255,.12)',
          fontSize: '28px',
          lineHeight: 1,
          cursor: 'pointer',
        }}
      >
        ×
      </button>

      <img
        src={selectedImage.src}
        alt={selectedImage.alt}
        onClick={(event) => event.stopPropagation()}
        style={{
          display: 'block',
          maxWidth: 'min(100%, 1000px)',
          maxHeight: '85vh',
          width: 'auto',
          height: 'auto',
          objectFit: 'contain',
          borderRadius: '16px',
          boxShadow: '0 20px 70px rgba(0,0,0,.4)',
          cursor: 'default',
        }}
      />

      <span
        style={{
          position: 'absolute',
          bottom: '18px',
          left: '16px',
          right: '16px',
          textAlign: 'center',
          color: '#fff',
          fontSize: '14px',
        }}
      >
        {selectedImage.alt} · Tocá fuera de la imagen o presioná Esc para cerrar
      </span>
    </div>
  );
}

export default ImageModal;
