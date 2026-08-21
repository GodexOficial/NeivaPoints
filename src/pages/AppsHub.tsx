import React, { useState, useEffect } from 'react';
import {
  FileText,
  Table as TableIcon,
  Presentation,
  Plus,
  Trash2,
  Copy,
  Clock,
  Download,
  Sparkles,
  ArrowRight,
  FolderOpen,
  CheckCircle2,
  HardDrive,
} from 'lucide-react';
import type { WordDocument } from '../types/doc';
import {
  getLocalDocuments,
  createNewDocument,
  deleteLocalDocument,
  saveLocalDocument,
} from '../services/docService';
import { WordEditor } from '../components/apps/word/WordEditor';
import { exportToDocx } from '../utils/docxExporter';

export const AppsHub: React.FC = () => {
  const [activeApp, setActiveApp] = useState<'hub' | 'word'>('hub');
  const [documents, setDocuments] = useState<WordDocument[]>([]);
  const [selectedDocument, setSelectedDocument] = useState<WordDocument | null>(null);

  // Load documents
  useEffect(() => {
    const docs = getLocalDocuments();
    setDocuments(docs);
  }, []);

  const refreshDocuments = () => {
    setDocuments(getLocalDocuments());
  };

  const handleOpenWord = (doc?: WordDocument) => {
    if (doc) {
      setSelectedDocument(doc);
    } else {
      const newDoc = createNewDocument('Novo Documento Word');
      setSelectedDocument(newDoc);
      refreshDocuments();
    }
    setActiveApp('word');
  };

  const handleDuplicateDoc = (doc: WordDocument, e: React.MouseEvent) => {
    e.stopPropagation();
    const dupDoc: WordDocument = {
      ...doc,
      id: `doc-${Date.now()}`,
      title: `${doc.title} (Cópia)`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    saveLocalDocument(dupDoc);
    refreshDocuments();
  };

  const handleDeleteDoc = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (window.confirm('Tem certeza que deseja excluir este documento?')) {
      deleteLocalDocument(id);
      refreshDocuments();
    }
  };

  const handleDownloadDocx = async (doc: WordDocument, e: React.MouseEvent) => {
    e.stopPropagation();
    await exportToDocx(doc);
  };

  if (activeApp === 'word' && selectedDocument) {
    return (
      <WordEditor
        initialDocument={selectedDocument}
        onBackToHub={() => {
          setActiveApp('hub');
          refreshDocuments();
        }}
      />
    );
  }

  return (
    <div className="space-y-8">
      {/* Page Title & Hero */}
      <div className="p-6 sm:p-8 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 text-white rounded-3xl shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-6 relative overflow-hidden">
        <div className="space-y-2 max-w-xl z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/20 backdrop-blur-md rounded-xl text-xs font-bold uppercase tracking-wider">
            <Sparkles size={14} />
            <span>Suíte de Aplicativos</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight">
            Central de Apps do Sistema
          </h1>
          <p className="text-sm text-blue-100 leading-relaxed font-medium">
            Crie e edite documentos, planilhas e apresentações com salvamento automático local e exportação no formato .docx!
          </p>
        </div>

        <button
          type="button"
          onClick={() => handleOpenWord()}
          className="inline-flex items-center gap-2.5 px-6 py-3.5 bg-white text-blue-700 hover:bg-blue-50 font-extrabold text-sm rounded-2xl shadow-lg transition-transform hover:scale-105 cursor-pointer z-10 shrink-0"
        >
          <Plus size={18} />
          <span>Criar Documento Word</span>
        </button>
      </div>

      {/* Apps Selection Grid */}
      <div className="space-y-4">
        <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <span>Aplicativos Disponíveis</span>
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Word Card */}
          <div
            onClick={() => handleOpenWord()}
            className="group bg-white dark:bg-slate-900 rounded-3xl p-6 border-2 border-blue-500/80 hover:border-blue-600 shadow-md hover:shadow-xl transition-all cursor-pointer relative overflow-hidden flex flex-col justify-between space-y-4"
          >
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="w-12 h-12 rounded-2xl bg-blue-600 text-white flex items-center justify-center font-bold shadow-md group-hover:scale-110 transition-transform">
                  <FileText size={24} />
                </div>
                <span className="text-xs font-extrabold uppercase tracking-wider text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-2.5 py-1 rounded-lg border border-emerald-200 dark:border-emerald-800">
                  Ativo & Pronto
                </span>
              </div>

              <div>
                <h3 className="text-lg font-black text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                  Word (Editor de Texto)
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                  Editor completo para redações e trabalhos. Formatação rica, adição de vetores, imagens bitmaps, tabelas e salvamento automático local.
                </p>
              </div>
            </div>

            <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs font-bold text-blue-600 dark:text-blue-400">
              <span>Abrir Editor</span>
              <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
            </div>
          </div>

          {/* Excel Card (Coming Soon) */}
          <div className="bg-white/80 dark:bg-slate-900/80 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-2xs relative flex flex-col justify-between space-y-4 opacity-90">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="w-12 h-12 rounded-2xl bg-emerald-600 text-white flex items-center justify-center font-bold shadow-md">
                  <TableIcon size={24} />
                </div>
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-2.5 py-1 rounded-lg">
                  Em Breve
                </span>
              </div>

              <div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                  Excel (Planilhas)
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                  Crie planilhas, tabelas de dados, fórmulas matemáticas e gráficos estatísticos.
                </p>
              </div>
            </div>

            <div className="pt-2 border-t border-slate-100 dark:border-slate-800 text-xs font-medium text-slate-400">
              Módulo em desenvolvimento
            </div>
          </div>

          {/* PowerPoint Card (Coming Soon) */}
          <div className="bg-white/80 dark:bg-slate-900/80 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-2xs relative flex flex-col justify-between space-y-4 opacity-90">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="w-12 h-12 rounded-2xl bg-orange-600 text-white flex items-center justify-center font-bold shadow-md">
                  <Presentation size={24} />
                </div>
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-2.5 py-1 rounded-lg">
                  Em Breve
                </span>
              </div>

              <div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                  PowerPoint (Apresentações)
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                  Monte slides para apresentações de trabalhos escolares com fotos, formas e animações.
                </p>
              </div>
            </div>

            <div className="pt-2 border-t border-slate-100 dark:border-slate-800 text-xs font-medium text-slate-400">
              Módulo em desenvolvimento
            </div>
          </div>
        </div>
      </div>

      {/* Recent Documents Section */}
      <div className="space-y-4 pt-2">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <FolderOpen size={20} className="text-blue-600 dark:text-blue-400" />
            <span>Meus Documentos Salvos</span>
          </h2>

          <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 bg-white dark:bg-slate-900 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800">
            <HardDrive size={14} className="text-emerald-500" />
            <span>Salvamento Local Automático + Servidor</span>
          </div>
        </div>

        {documents.length === 0 ? (
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-8 text-center space-y-3">
            <FileText size={36} className="mx-auto text-slate-400" />
            <p className="text-sm font-bold text-slate-700 dark:text-slate-300">Nenhum documento salvo ainda.</p>
            <p className="text-xs text-slate-500">Clique em "Criar Documento Word" para começar seu primeiro trabalho!</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {documents.map((doc) => (
              <div
                key={doc.id}
                onClick={() => handleOpenWord(doc)}
                className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-5 hover:border-blue-500 dark:hover:border-blue-500 hover:shadow-md transition-all cursor-pointer space-y-4 flex flex-col justify-between group"
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="p-2.5 bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 rounded-2xl group-hover:bg-blue-600 group-hover:text-white transition-colors">
                      <FileText size={20} />
                    </div>
                    <span className="text-[11px] font-bold text-slate-400 flex items-center gap-1">
                      <Clock size={12} />
                      {new Date(doc.updatedAt).toLocaleDateString()}
                    </span>
                  </div>

                  <h3 className="font-bold text-slate-900 dark:text-white text-sm line-clamp-2 leading-snug group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                    {doc.title}
                  </h3>
                </div>

                <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                  <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                    <CheckCircle2 size={12} />
                    Salvo
                  </span>

                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={(e) => handleDownloadDocx(doc, e)}
                      className="p-1.5 text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
                      title="Baixar como .docx"
                    >
                      <Download size={14} />
                    </button>
                    <button
                      type="button"
                      onClick={(e) => handleDuplicateDoc(doc, e)}
                      className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
                      title="Duplicar Documento"
                    >
                      <Copy size={14} />
                    </button>
                    <button
                      type="button"
                      onClick={(e) => handleDeleteDoc(doc.id, e)}
                      className="p-1.5 text-slate-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
                      title="Excluir Documento"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
