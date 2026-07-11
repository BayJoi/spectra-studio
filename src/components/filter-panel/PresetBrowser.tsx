import { useRef, useState } from "react";
import { useAtomValue, useSetAtom } from "jotai";
import {
  presetBrowserOpenAtom,
  setPresetBrowserOpenAtom,
  customPresetsAtom,
  saveCurrentAsPresetAtom,
  deleteCustomPresetAtom,
  loadCustomPresetAtom,
} from "../../store/atoms";

interface PresetBrowserProps {
  disabled: boolean;
}

export function PresetBrowser({ disabled }: PresetBrowserProps) {
  const presetOpen = useAtomValue(presetBrowserOpenAtom);
  const setPresetOpen = useSetAtom(setPresetBrowserOpenAtom);
  const customPresets = useAtomValue(customPresetsAtom);
  const saveCustomPreset = useSetAtom(saveCurrentAsPresetAtom);
  const deleteCustomPreset = useSetAtom(deleteCustomPresetAtom);
  const loadCustomPreset = useSetAtom(loadCustomPresetAtom);
  const [presetName, setPresetName] = useState("");
  const [showSavePrompt, setShowSavePrompt] = useState(false);
  const presetRef = useRef<HTMLDivElement>(null);

  return (
    <div className="relative" ref={presetRef}>
      <button
        onClick={() => setPresetOpen(!presetOpen)}
        disabled={disabled}
        className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium rounded-md bg-neutral-800 border border-neutral-700 text-neutral-400 hover:text-neutral-200 hover:border-neutral-600 hover:scale-105 active:scale-95 disabled:text-neutral-600 disabled:hover:scale-100 disabled:hover:border-neutral-700 disabled:cursor-not-allowed transition-all duration-150 cursor-pointer"
      >
        <div className="i-lucide-folder-open text-14px" />
        Presets
      </button>
      {presetOpen && (
        <div className="absolute bottom-full right-0 mb-6 w-56 bg-neutral-900 border border-neutral-700 rounded-xl shadow-2xl z-50 animate-drop-in overflow-hidden">
          <div className="max-h-80 overflow-y-auto custom-scrollbar p-2 space-y-1">
            {showSavePrompt ? (
              <div className="p-2 space-y-2">
                <input
                  type="text"
                  value={presetName}
                  onChange={(e) => setPresetName(e.target.value)}
                  placeholder="Preset name..."
                  className="w-full px-2 py-1.5 text-xs bg-neutral-800 border border-neutral-700 rounded text-neutral-200 placeholder-neutral-600 focus:outline-none focus:border-orange-500"
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && presetName.trim()) {
                      saveCustomPreset(presetName.trim());
                      setPresetName("");
                      setShowSavePrompt(false);
                      setPresetOpen(false);
                    }
                    if (e.key === "Escape") setShowSavePrompt(false);
                  }}
                />
                <div className="flex gap-2">
                  <button
                    onClick={() => { setShowSavePrompt(false); setPresetName(""); }}
                    className="flex-1 py-1 text-xs rounded bg-neutral-800 text-neutral-500 hover:text-neutral-300 hover:scale-[1.02] active:scale-[0.98] transition-all duration-150 cursor-pointer"
                  >Cancel</button>
                  <button
                    onClick={() => { if (presetName.trim()) { saveCustomPreset(presetName.trim()); setPresetName(""); setShowSavePrompt(false); setPresetOpen(false); } }}
                    className="flex-1 py-1 text-xs rounded bg-orange-600 text-white hover:bg-orange-500 hover:scale-[1.02] active:scale-[0.98] transition-all duration-150 cursor-pointer"
                  >Save</button>
                </div>
              </div>
            ) : (
              <>
                <button
                  onClick={() => setShowSavePrompt(true)}
                  className="w-full text-left px-3 py-2 text-sm text-neutral-300 hover:bg-neutral-800 hover:text-white rounded-lg flex items-center gap-2 hover:scale-[1.02] active:scale-[0.98] transition-all duration-150 cursor-pointer"
                >
                  <div className="i-lucide-save text-14px" />
                  Save Current...
                </button>
                <div className="h-px bg-neutral-800 my-1" />
                {customPresets.length === 0 && (
                  <div className="px-3 py-4 text-center text-xs text-neutral-600">
                    No saved presets
                  </div>
                )}
                {customPresets.length > 0 && (
                  <>
                    <div className="px-3 py-1 text-[10px] font-semibold text-neutral-600 tracking-widest uppercase">Custom</div>
                    {customPresets.map((preset, idx) => (
                      <div key={`custom-${idx}`} className="flex items-center gap-1 group/preset">
                        <button
                          onClick={() => { loadCustomPreset(idx); setPresetOpen(false); }}
                          className="flex-1 text-left px-3 py-2 text-sm text-neutral-300 hover:bg-neutral-800 hover:text-white rounded-lg truncate hover:scale-[1.02] active:scale-[0.98] transition-all duration-150 cursor-pointer"
                        >{preset.name}</button>
                        <button
                          onClick={() => deleteCustomPreset(idx)}
                          className="p-2 text-neutral-600 hover:text-red-400 opacity-0 group-hover/preset:opacity-100 transition-all duration-150 hover:scale-110 active:scale-90 cursor-pointer"
                        ><div className="i-lucide-x text-12px" /></button>
                      </div>
                    ))}
                  </>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
