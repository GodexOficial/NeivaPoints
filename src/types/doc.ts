export interface VectorShape {
  id: string;
  type: 'rectangle' | 'rounded-rectangle' | 'circle' | 'triangle' | 'arrow-right' | 'arrow-left' | 'star' | 'heart' | 'line';
  label?: string;
  fillColor: string;
  borderColor: string;
  borderWidth: number;
  width: number;
  height: number;
  align: 'left' | 'center' | 'right';
  maskImageSrc?: string;
}

export interface BitmapImage {
  id: string;
  src: string;
  alt: string;
  caption?: string;
  width: number;
  height?: number;
  align: 'left' | 'center' | 'right';
}

export interface ActiveFormatting {
  bold: boolean;
  italic: boolean;
  underline: boolean;
  strikeThrough: boolean;
  subscript: boolean;
  superscript: boolean;
  align: 'left' | 'center' | 'right' | 'justify';
  fontFamily: string;
  fontSize: string;
  fontSizePt?: number;
  textColor: string;
  bgColor: string;
  lineBgColor: string;
  formatBlock: 'p' | 'h1' | 'h2' | 'h3' | 'blockquote' | string;
  unorderedList: boolean;
  orderedList: boolean;
}

export interface WordDocument {
  id: string;
  title: string;
  content: string; // HTML content of the document
  pages?: string[]; // Array of HTML strings per page
  shapes: VectorShape[];
  images: BitmapImage[];
  ownerId?: string;
  createdAt: string;
  updatedAt: string;
  paperTheme?: 'white' | 'sepia' | 'dark';
  paperMargin?: 'normal' | 'narrow' | 'wide';
  leftMarginCm?: number;
  rightMarginCm?: number;
  topMarginCm?: number;
  bottomMarginCm?: number;
  firstLineIndentCm?: number;
  watermarkText?: string;
  orientation?: 'portrait' | 'landscape';
  pageSize?: 'a4' | 'letter';
  headerText?: string;
  footerText?: string;
  pageNumbers?: boolean;
  comments?: { id: string; text: string; quote: string; createdAt: string }[];
}

export type SaveStatus = 'saved' | 'saving' | 'draft_restored' | 'unsaved' | 'error';
