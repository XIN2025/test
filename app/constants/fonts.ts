import { Platform } from "react-native";

export const fontFamilies = {
  GANDHI_SERIF: {
    regular: "GandhiSerifRegular",
    bold: "GandhiSerifBold",
    italic: "GandhiSerifItalic",
    boldItalic: "GandhiSerifBoldItalic",
  },
};

export const getFontFamily = (
  weight: "regular" | "bold" | "italic" | "boldItalic"
) => {
  return fontFamilies.GANDHI_SERIF[weight];
};
