import React from 'react';

const EMOJI_LIST = [
  '😀','😃','😄','😁','😆','😅','🤣','😂','🙂','🙃','😉','😊','😇','😍','🤩','😘','😜','🤪','🤓','🫠',
  '👍','👎','👏','🙏','💪','🤝','🔥','⭐','💯','💖','🎉','🎯','🤖','🧠','🩺'
];

interface EmojiPickerProps {
  onSelect: (emoji: string) => void;
}

export default function EmojiPicker({ onSelect }: EmojiPickerProps) {
  return (
    <div className="p-2 bg-white border rounded shadow-sm w-64">
      <div className="grid grid-cols-8 gap-2">
        {EMOJI_LIST.map((e) => (
          <button
            key={e}
            onClick={() => onSelect(e)}
            className="p-1 hover:bg-slate-100 rounded text-lg"
            aria-label={`emoji-${e}`}
          >
            {e}
          </button>
        ))}
      </div>
    </div>
  );
}
