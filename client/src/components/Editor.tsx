import { useKeystrokeLogger } from "../hooks/useKeystrokeLogger";
import { useSessionContext } from "../contexts/sessionContextStore";
import Toast from "./Toast";

interface EditorProps {
  value: string;
  onChange: (value: string) => void;
}

const Editor = ({ value, onChange }: EditorProps) => {
  const { handleKeyDown, handleKeyUp, logPaste, logTextChange, scheduleSync } =
    useKeystrokeLogger();
  const { lastSyncError, clearLastSyncError } = useSessionContext();

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const nextValue = e.target.value;
    logTextChange(value, nextValue);
    onChange(nextValue);
    scheduleSync();
  };

  return (
    <div className="editor-wrapper">
      <textarea
        placeholder="Start writing..."
        value={value}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        onKeyUp={handleKeyUp}
        onPaste={(e) => {
          logPaste(e);
          scheduleSync();
        }}
      />

      {lastSyncError && (
        <Toast
          message={lastSyncError}
          type="error"
          onClose={clearLastSyncError}
        />
      )}
    </div>
  );
};

export default Editor;
