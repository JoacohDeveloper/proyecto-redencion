import { Fira_Code as FontMono, Inter as FontSans } from "next/font/google";

import { Playfair_Display as Playfair, Questrial } from "next/font/google";

export const fontSans = FontSans({
  subsets: ["latin"],
  variable: "--font-sans",
});

export const fontMono = FontMono({
  subsets: ["latin"],
  variable: "--font-mono",
});

export const fontPlayfair = Playfair({
  subsets: ["latin"],
});

export const fontQuestrial = Questrial({
  subsets: ["latin"],
  weight: ["400"],
});
