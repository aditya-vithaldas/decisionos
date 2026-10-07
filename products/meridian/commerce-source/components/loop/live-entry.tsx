'use client';
import { useEffect, useState } from 'react';
import { Mic, X } from 'lucide-react';
const key = 'loop-live-onboarding-seen';
export function dismissLiveHint() {
  try {
    localStorage.setItem(key, '1');
  } catch {}
}
export function LiveEntry({ onStart }: { onStart?: () => void }) {
  const [showHint, setShowHint] = useState(false);
  useEffect(() => {
    try {
      setShowHint(localStorage.getItem(key) !== '1');
    } catch {
      setShowHint(true);
    }
  }, []);
  function dismiss() {
    dismissLiveHint();
    setShowHint(false);
  }
  function start() {
    dismiss();
    onStart?.();
  }
  const buttonContent = (
    <>
      <Mic size={18} /> Live Shopping
    </>
  );
  return (
    <div className={'live-entry ' + (showHint ? 'has-hint' : '')}>
      {onStart ? (
        <button
          className="button dark live-entry-button"
          onClick={start}
          aria-describedby={showHint ? 'live-entry-hint' : undefined}
        >
          {buttonContent}
        </button>
      ) : (
        <a
          className="button dark live-entry-button"
          href="/commerce/search?live=1"
          onClick={start}
          aria-describedby={showHint ? 'live-entry-hint' : undefined}
        >
          {buttonContent}
        </a>
      )}
      {showHint && (
        <div className="live-entry-pointer">
          <svg viewBox="0 0 110 65" aria-hidden="true">
            <path d="M 8 59 C 55 58 81 38 84 8 M 73 18 L 84 7 L 91 21" />
          </svg>
          <div className="live-entry-caption">
            <span id="live-entry-hint">Start here—shop by voice.</span>
            <button
              type="button"
              onClick={dismiss}
              aria-label="Dismiss live shopping hint"
            >
              <X size={14} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
