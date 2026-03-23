import { useState } from "react";
import { useKeystrokeLogger } from "../hooks/useKeystrokeLogger";
import { useSessionContext } from "../contexts/sessionContextStore";
import Toast from "./Toast";

const Editor = () => {
  const [text, setText] = useState("");

  const { handleKeyDown, handleKeyUp, logPaste, logTextChange, scheduleSync } =
    useKeystrokeLogger();
  const { lastSyncError, clearLastSyncError } = useSessionContext();

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    logTextChange(text, value);
    setText(value);
    scheduleSync();
  };

  return (
    <div className="editor-wrapper">
      <textarea
        placeholder="Start writing..."
        value={text}
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
