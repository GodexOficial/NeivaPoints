import type { WordDocument } from '../types/doc';

const STORAGE_KEY_DOCS = 'sistema_pontos_word_documents_v1';
const DRAFT_PREFIX = 'sistema_pontos_word_draft_';

const DEFAULT_DOCUMENTS: WordDocument[] = [
  {
    id: 'doc-sample-1',
    title: 'Redação: A Importância da Tecnologia na Educação',
    content: `
      <h1 style="text-align: center; color: #1e3a8a; margin-bottom: 12px;">A Importância da Tecnologia na Educação</h1>
      <p style="text-align: center; font-style: italic; color: #64748b; margin-bottom: 24px;">Por Aluno Dedicado • Turma do 8º Ano</p>

      <h2>1. Introdução</h2>
      <p>A tecnologia transformou profundamente a forma como aprendemos e ensinamos no século XXI. Com o acesso à internet e a ferramentas digitais, salas de aula tornaram-se ambientes dinâmicos e interativos.</p>

      <h2>2. Benefícios Principais</h2>
      <p>Dentre os principais benefícios do uso de tecnologias nas escolas, destacam-se:</p>
      <ul>
        <li><strong>Acesso rápido à informação:</strong> Pesquisas escolares podem ser feitas instantaneamente.</li>
        <li><strong>Aprendizado personalizado:</strong> Cada estudante pode progredir no seu próprio ritmo.</li>
        <li><strong>Colaboração em grupo:</strong> Produção de documentos e projetos de forma compartilhada.</li>
      </ul>

      <h2>3. Conclusão</h2>
      <p>Em suma, a integração de sistemas de pontos, editores de texto e aplicativos educativos incentiva o engajamento dos alunos e prepara os estudantes para o futuro digital.</p>
    `,
    shapes: [],
    images: [],
    createdAt: new Date(Date.now() - 86400000 * 2).toISOString(),
    updatedAt: new Date(Date.now() - 3600000 * 3).toISOString(),
    paperTheme: 'white',
    paperMargin: 'normal'
  }
];

export const getLocalDocuments = (): WordDocument[] => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_DOCS);
    if (!raw) {
      localStorage.setItem(STORAGE_KEY_DOCS, JSON.stringify(DEFAULT_DOCUMENTS));
      return DEFAULT_DOCUMENTS;
    }
    return JSON.parse(raw);
  } catch (e) {
    console.error('Failed to load local documents', e);
    return DEFAULT_DOCUMENTS;
  }
};

export const saveLocalDocument = (doc: WordDocument): WordDocument => {
  try {
    const docs = getLocalDocuments();
    const existingIndex = docs.findIndex((d) => d.id === doc.id);
    const updatedDoc = { ...doc, updatedAt: new Date().toISOString() };

    if (existingIndex >= 0) {
      docs[existingIndex] = updatedDoc;
    } else {
      docs.unshift(updatedDoc);
    }

    localStorage.setItem(STORAGE_KEY_DOCS, JSON.stringify(docs));
    return updatedDoc;
  } catch (e) {
    console.error('Failed to save document locally', e);
    return doc;
  }
};

export const deleteLocalDocument = (id: string): void => {
  try {
    const docs = getLocalDocuments().filter((d) => d.id !== id);
    localStorage.setItem(STORAGE_KEY_DOCS, JSON.stringify(docs));
    clearAutoSaveDraft(id);
  } catch (e) {
    console.error('Failed to delete document', e);
  }
};

export const saveAutoSaveDraft = (docId: string, content: string, title: string): void => {
  try {
    const draftData = {
      docId,
      title,
      content,
      savedAt: new Date().toISOString(),
    };
    localStorage.setItem(`${DRAFT_PREFIX}${docId}`, JSON.stringify(draftData));
  } catch (e) {
    console.error('Failed to save draft locally', e);
  }
};

export const getAutoSaveDraft = (docId: string): { docId: string; title: string; content: string; savedAt: string } | null => {
  try {
    const raw = localStorage.getItem(`${DRAFT_PREFIX}${docId}`);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
};

export const clearAutoSaveDraft = (docId: string): void => {
  try {
    localStorage.removeItem(`${DRAFT_PREFIX}${docId}`);
  } catch {
    // ignore
  }
};

export const createNewDocument = (title = 'Novo Documento'): WordDocument => {
  const newDoc: WordDocument = {
    id: `doc-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    title,
    content: '<p>Comece a digitar seu texto aqui...</p>',
    shapes: [],
    images: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    paperTheme: 'white',
    paperMargin: 'normal'
  };
  return saveLocalDocument(newDoc);
};
