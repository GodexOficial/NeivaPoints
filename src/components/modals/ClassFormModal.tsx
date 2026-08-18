import React, { useState, useEffect } from "react";
import { GraduationCap, Edit3, X, AlertCircle, Palette } from "lucide-react";
import type { ClassInfo } from "../../types";
import { useStudentContext } from "../../context/StudentContext";
import { useLanguage } from "../../context/LanguageContext";

interface ClassFormModalProps {
  isOpen: boolean;
  classToEdit?: ClassInfo | null;
  onClose: () => void;
  onSuccess?: (classInfo: ClassInfo) => void;
}

const COLOR_PRESETS = [
  { id: "blue", label: "Blue", bg: "bg-blue-600", ring: "ring-blue-500" },
  {
    id: "indigo",
    label: "Indigo",
    bg: "bg-indigo-600",
    ring: "ring-indigo-500",
  },
  {
    id: "purple",
    label: "Purple",
    bg: "bg-purple-600",
    ring: "ring-purple-500",
  },
  {
    id: "violet",
    label: "Violet",
    bg: "bg-violet-600",
    ring: "ring-violet-500",
  },
  {
    id: "emerald",
    label: "Emerald",
    bg: "bg-emerald-600",
    ring: "ring-emerald-500",
  },
  { id: "amber", label: "Amber", bg: "bg-amber-600", ring: "ring-amber-500" },
  { id: "rose", label: "Rose", bg: "bg-rose-600", ring: "ring-rose-500" },
  { id: "cyan", label: "Cyan", bg: "bg-cyan-600", ring: "ring-cyan-500" },
];

export const ClassFormModal: React.FC<ClassFormModalProps> = ({
  isOpen,
  classToEdit,
  onClose,
  onSuccess,
}) => {
  const { addClass, updateClass } = useStudentContext();
  const { t } = useLanguage();

  const [name, setName] = useState("");
  const [gradeNumber, setGradeNumber] = useState<string>("");
  const [shortName, setShortName] = useState("");
  const [color, setColor] = useState("blue");
  const [description, setDescription] = useState("");
  const [error, setError] = useState<string | null>(null);

  const isEditing = !!classToEdit;

  useEffect(() => {
    if (isOpen) {
      if (classToEdit) {
        setName(classToEdit.name);
        setGradeNumber(
          classToEdit.gradeNumber !== undefined
            ? String(classToEdit.gradeNumber)
            : "",
        );
        setShortName(classToEdit.shortName || "");
        setColor(classToEdit.color || "blue");
        setDescription(classToEdit.description || "");
      } else {
        setName("");
        setGradeNumber("");
        setShortName("");
        setColor("blue");
        setDescription("");
      }
      setError(null);
    }
  }, [isOpen, classToEdit]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const trimmedName = name.trim();
    if (!trimmedName) {
      setError(t("classForm.errorName"));
      return;
    }

    handleSaveAsync();
  };

  const handleSaveAsync = async () => {
    try {
      if (isEditing && classToEdit) {
        const updated = await updateClass(classToEdit.id, {
          name: name.trim(),
          gradeNumber: gradeNumber.trim() ? Number(gradeNumber) : undefined,
          shortName: shortName.trim() || undefined,
          color,
          description: description.trim(),
        });
        if (onSuccess) onSuccess(updated);
        onClose();
      } else {
        const created = await addClass({
          name: name.trim(),
          gradeNumber: gradeNumber.trim() ? Number(gradeNumber) : undefined,
          shortName: shortName.trim() || undefined,
          color,
          description: description.trim(),
        });
        if (onSuccess) onSuccess(created);
        onClose();
      }
    } catch (err: any) {
      setError(err.message || "Failed to save class.");
    }
  };

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 dark:bg-black/70 backdrop-blur-xs cursor-pointer"
      role="dialog"
      aria-modal="true"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl shadow-xl border border-slate-200 dark:border-slate-800 overflow-hidden animate-in fade-in zoom-in-95 duration-150 cursor-default"
      >
        <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/60 dark:bg-slate-800/60">
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 rounded-xl">
              {isEditing ? <Edit3 size={18} /> : <GraduationCap size={18} />}
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                {isEditing ? t("classForm.editTitle") : t("classForm.newTitle")}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {isEditing
                  ? t("classForm.editSubtitle")
                  : t("classForm.newSubtitle")}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-800 rounded-xl flex items-center gap-2.5 text-xs text-red-700 dark:text-red-300 font-medium">
              <AlertCircle size={16} className="text-red-500 dark:text-red-400 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
              {t("classForm.name")} <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                if (error) setError(null);
              }}
              placeholder={t("classForm.namePlaceholder")}
              autoFocus
              className="w-full px-3.5 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-semibold text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                {t("classForm.gradeNumber")}
              </label>
              <input
                type="number"
                min="1"
                max="100"
                value={gradeNumber}
                onChange={(e) => setGradeNumber(e.target.value)}
                placeholder={t("classForm.gradePlaceholder")}
                className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-medium text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                {t("classForm.shortName")}
              </label>
              <input
                type="text"
                maxLength={8}
                value={shortName}
                onChange={(e) => setShortName(e.target.value)}
                placeholder={t("classForm.shortNamePlaceholder")}
                className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-medium text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <Palette size={13} className="text-slate-400 dark:text-slate-500" />
              <span>{t("classForm.color")}</span>
            </label>
            <div className="flex items-center gap-2.5 flex-wrap">
              {COLOR_PRESETS.map((p) => {
                const isSelected = color === p.id;
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => setColor(p.id)}
                    className={`w-7 h-7 rounded-full ${p.bg} transition-all cursor-pointer ${
                      isSelected
                        ? "ring-3 ring-offset-2 ring-blue-600 scale-110 shadow-sm"
                        : "hover:scale-105 opacity-80 hover:opacity-100"
                    }`}
                    title={p.label}
                  />
                );
              })}
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
              {t("classForm.description")}
            </label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={t("classForm.descPlaceholder")}
              className="w-full px-3.5 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-medium text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all resize-none"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-semibold text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors cursor-pointer"
            >
              {t("classForm.cancel")}
            </button>
            <button
              type="submit"
              className="px-5 py-2 text-sm font-bold rounded-xl text-white bg-blue-600 hover:bg-blue-700 transition-colors shadow-xs focus:outline-hidden focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 cursor-pointer"
            >
              {isEditing ? t("classForm.saveBtn") : t("classForm.createBtn")}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
