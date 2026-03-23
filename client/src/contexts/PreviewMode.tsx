import { createContext, useContext, useState, useCallback, type ReactNode } from "react";

interface PreviewModeContextType {
  isPreviewMode: boolean;
  togglePreview: () => void;
  exitPreview: () => void;
}

const PreviewModeContext = createContext<PreviewModeContextType>({
  isPreviewMode: false,
  togglePreview: () => {},
  exitPreview: () => {},
});

export function PreviewModeProvider({ children }: { children: ReactNode }) {
  const [isPreviewMode, setIsPreviewMode] = useState(false);

  const togglePreview = useCallback(() => {
    setIsPreviewMode((prev) => !prev);
  }, []);

  const exitPreview = useCallback(() => {
    setIsPreviewMode(false);
  }, []);

  return (
    <PreviewModeContext.Provider value={{ isPreviewMode, togglePreview, exitPreview }}>
      {children}
    </PreviewModeContext.Provider>
  );
}

export function usePreviewMode() {
  return useContext(PreviewModeContext);
}
