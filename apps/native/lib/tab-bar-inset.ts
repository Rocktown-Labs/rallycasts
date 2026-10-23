import { useSafeAreaInsets } from "react-native-safe-area-context";

/**
 * Bottom room for the floating native tab bar. The iOS 26 glass bar overlays
 * content instead of consuming layout space, so vertical scroll content needs
 * explicit padding to clear it: the device safe-area inset plus the bar.
 */
export function useTabContentInset() {
  const { bottom } = useSafeAreaInsets();

  return bottom + 88;
}
