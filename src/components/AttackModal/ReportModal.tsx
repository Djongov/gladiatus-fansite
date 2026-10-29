import React, { useEffect } from 'react';
import styles from './AttackModal.module.css';

type ReportModalProps = {
  readonly title: string;
  readonly onClose: () => void;
  readonly children: React.ReactNode;
};

/** The battle-report dialog: a titled box over a dimmed page, closed by ×, Escape or a click outside. */
export default function ReportModal({ title, onClose, children }: ReportModalProps): React.ReactElement {
  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === 'Escape') onClose();
    }
    globalThis.addEventListener('keydown', onKey);
    return () => globalThis.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div className={styles.backdrop} onClick={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <div className={styles.dialog} role="dialog" aria-modal="true">
        <div className={styles.header}>
          <span>{title}</span>
          <button className={styles.closeButton} onClick={onClose} aria-label="Close">×</button>
        </div>
        <div className={styles.body}>{children}</div>
      </div>
    </div>
  );
}
