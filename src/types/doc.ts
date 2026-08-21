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

export interface WordDocument {
  id: string;
  title: string;
  content: string; // HTML content of the document
  shapes: VectorShape[];
  images: BitmapImage[];
  ownerId?: string;
  createdAt: string;
  updatedAt: string;
  paperTheme?: 'white' | 'sepia' | 'dark';
  paperMargin?: 'normal' | 'narrow' | 'wide';
}

export type SaveStatus = 'saved' | 'saving' | 'draft_restored' | 'unsaved' | 'error';
