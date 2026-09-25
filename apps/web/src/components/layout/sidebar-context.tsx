import { createContext, useContext } from "react";

export interface SidebarContextType {
  collapsed: boolean;
  setCollapsed: (collapsed: boolean | ((prev: boolean) => boolean)) => void;
  toggleSidebar: () => void;
}

const noop = () => {
  // Default no-op for context
};

export const SidebarContext = createContext<SidebarContextType>({
  collapsed: false,
  setCollapsed: noop,
  toggleSidebar: noop,
});

export const useSidebar = () => useContext(SidebarContext);
