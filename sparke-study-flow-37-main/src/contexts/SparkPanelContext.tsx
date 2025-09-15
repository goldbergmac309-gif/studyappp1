
import React, { createContext, useContext, useState } from "react";

interface SparkPanelContextType {
  isSparkPanelOpen: boolean;
  toggleSparkPanel: () => void;
  openSparkPanel: () => void;
  closeSparkPanel: () => void;
}

const SparkPanelContext = createContext<SparkPanelContextType | undefined>(undefined);

export const SparkPanelProvider = ({ children }: { children: React.ReactNode }) => {
  const [isSparkPanelOpen, setIsSparkPanelOpen] = useState(false);

  const toggleSparkPanel = () => setIsSparkPanelOpen(prev => !prev);
  const openSparkPanel = () => setIsSparkPanelOpen(true);
  const closeSparkPanel = () => setIsSparkPanelOpen(false);

  return (
    <SparkPanelContext.Provider
      value={{ isSparkPanelOpen, toggleSparkPanel, openSparkPanel, closeSparkPanel }}
    >
      {children}
    </SparkPanelContext.Provider>
  );
};

export const useSparkPanel = () => {
  const context = useContext(SparkPanelContext);
  if (context === undefined) {
    throw new Error("useSparkPanel must be used within a SparkPanelProvider");
  }
  return context;
};
