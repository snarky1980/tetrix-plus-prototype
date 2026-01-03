import React, { useState, useEffect, useCallback } from 'react';
import * as noteService from '../../services/noteService';
import {
  Note,
  TypeEntiteNote,
  CategorieNote,
  VisibiliteNote,
  CreerNoteInput,
  ModifierNoteInput,
  CATEGORIES_LABELS,
  CATEGORIES_ICONES,
  VISIBILITES_LABELS,
  VISIBILITES_ICONES,
  formatTailleFichier,
  getIconeTypeMime,
} from '../../services/noteService';

// ============================================
// TYPES
// ============================================

interface NotesPanelProps {
  entiteType: TypeEntiteNote;
  entiteId: string;
  titre?: string;
  compact?: boolean;
  className?: string;
}

type ModeEdition = 'liste' | 'creer' | 'modifier';

// ============================================
// COMPOSANT PRINCIPAL
// ============================================

export default function NotesPanel({
  entiteType,
  entiteId,
  titre = 'Notes',
  compact = false,
  className = '',
}: NotesPanelProps) {
  // État
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const [erreur, setErreur] = useState<string | null>(null);
  const [mode, setMode] = useState<ModeEdition>('liste');
  const [noteEnEdition, setNoteEnEdition] = useState<Note | null>(null);
  const [noteExpandue, setNoteExpandue] = useState<string | null>(null);
  const [filtreCategorie, setFiltreCategorie] = useState<CategorieNote | ''>('');
  const [recherche, setRecherche] = useState('');

  // Charger les notes
  const chargerNotes = useCallback(async () => {
    try {
      setLoading(true);
      setErreur(null);
      const data = await noteService.obtenirNotesEntite(entiteType, entiteId);
      setNotes(data);
    } catch (err: any) {
      setErreur(err.response?.data?.erreur || 'Erreur lors du chargement');
    } finally {
      setLoading(false);
    }
  }, [entiteType, entiteId]);

  useEffect(() => {
    chargerNotes();
  }, [chargerNotes]);

  // Filtrer les notes
  const notesFiltrees = notes.filter(note => {
    if (filtreCategorie && note.categorie !== filtreCategorie) return false;
    if (recherche) {
      const searchLower = recherche.toLowerCase();
      return (
        note.titre.toLowerCase().includes(searchLower) ||
        note.contenu.toLowerCase().includes(searchLower) ||
        note.tags.some(t => t.toLowerCase().includes(searchLower))
      );
    }
    return true;
  });

  // Handlers
  const handleCreer = async (data: CreerNoteInput) => {
    try {
      await noteService.creerNote(data);
      setMode('liste');
      chargerNotes();
    } catch (err: any) {
      throw new Error(err.response?.data?.erreur || 'Erreur lors de la création');
    }
  };

  const handleModifier = async (id: string, data: ModifierNoteInput) => {
    try {
      await noteService.modifierNote(id, data);
      setMode('liste');
      setNoteEnEdition(null);
      chargerNotes();
    } catch (err: any) {
      throw new Error(err.response?.data?.erreur || 'Erreur lors de la modification');
    }
  };

  const handleSupprimer = async (id: string) => {
    if (!confirm('Supprimer cette note ?')) return;
    try {
      await noteService.supprimerNote(id);
      chargerNotes();
    } catch (err: any) {
      alert(err.response?.data?.erreur || 'Erreur lors de la suppression');
    }
  };

  const handleToggleEpingle = async (id: string) => {
    try {
      await noteService.toggleEpingle(id);
      chargerNotes();
    } catch (err: any) {
      alert(err.response?.data?.erreur || 'Erreur');
    }
  };

  // Rendu compact (pour sidebar ou preview)
  if (compact) {
    return (
      <div className={`bg-white rounded-lg shadow p-4 ${className}`}>
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-gray-800 flex items-center gap-2">
            📝 {titre}
            <span className="text-sm font-normal text-gray-500">({notes.length})</span>
          </h3>
          <button
            onClick={() => setMode('creer')}
            className="text-blue-600 hover:text-blue-800 text-sm"
          >
            + Ajouter
          </button>
        </div>

        {loading ? (
          <div className="text-center py-4 text-gray-500">Chargement...</div>
        ) : notes.length === 0 ? (
          <div className="text-center py-4 text-gray-500 text-sm">
            Aucune note
          </div>
        ) : (
          <ul className="space-y-2 max-h-64 overflow-y-auto">
            {notes.slice(0, 5).map(note => (
              <li
                key={note.id}
                className="text-sm p-2 bg-gray-50 rounded hover:bg-gray-100 cursor-pointer"
                onClick={() => setNoteExpandue(note.id)}
              >
                <div className="flex items-center gap-2">
                  {note.epingle && <span title="Épinglée">📌</span>}
                  <span className="font-medium truncate">{note.titre}</span>
                </div>
                <div className="text-gray-500 text-xs truncate mt-1">
                  {note.contenu.slice(0, 100)}...
                </div>
              </li>
            ))}
            {notes.length > 5 && (
              <li className="text-center text-sm text-blue-600">
                + {notes.length - 5} autres notes
              </li>
            )}
          </ul>
        )}

        {/* Modal création rapide */}
        {mode === 'creer' && (
          <NoteFormModal
            entiteType={entiteType}
            entiteId={entiteId}
            onSaveCreer={handleCreer}
            onSaveModifier={async () => {}}
            onCancel={() => setMode('liste')}
          />
        )}

        {/* Modal détail note */}
        {noteExpandue && (
          <NoteDetailModal
            note={notes.find(n => n.id === noteExpandue)!}
            onClose={() => setNoteExpandue(null)}
            onEdit={(note) => {
              setNoteEnEdition(note);
              setMode('modifier');
              setNoteExpandue(null);
            }}
            onDelete={handleSupprimer}
            onToggleEpingle={handleToggleEpingle}
          />
        )}

        {/* Modal édition */}
        {mode === 'modifier' && noteEnEdition && (
          <NoteFormModal
            entiteType={entiteType}
            entiteId={entiteId}
            note={noteEnEdition}
            onSaveCreer={handleCreer}
            onSaveModifier={(data) => handleModifier(noteEnEdition.id, data)}
            onCancel={() => {
              setMode('liste');
              setNoteEnEdition(null);
            }}
          />
        )}
      </div>
    );
  }

  // Rendu complet
  return (
    <div className={`bg-white rounded-lg shadow ${className}`}>
      {/* En-tête */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
            📝 {titre}
            <span className="text-sm font-normal text-gray-500">
              ({notesFiltrees.length} note{notesFiltrees.length !== 1 ? 's' : ''})
            </span>
          </h2>
          <button
            onClick={() => setMode('creer')}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition flex items-center gap-2"
          >
            <span>+</span> Nouvelle note
          </button>
        </div>

        {/* Filtres */}
        <div className="flex flex-wrap gap-3">
          <input
            type="text"
            placeholder="Rechercher..."
            value={recherche}
            onChange={(e) => setRecherche(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
          <select
            value={filtreCategorie}
            onChange={(e) => setFiltreCategorie(e.target.value as CategorieNote | '')}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Toutes les catégories</option>
            {Object.entries(CATEGORIES_LABELS).map(([key, label]) => (
              <option key={key} value={key}>
                {CATEGORIES_ICONES[key as CategorieNote]} {label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Contenu */}
      <div className="p-4">
        {loading ? (
          <div className="text-center py-8 text-gray-500">
            <div className="animate-spin inline-block w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full mb-2"></div>
            <p>Chargement des notes...</p>
          </div>
        ) : erreur ? (
          <div className="text-center py-8 text-red-500">
            <p>❌ {erreur}</p>
            <button
              onClick={chargerNotes}
              className="mt-2 text-blue-600 hover:underline"
            >
              Réessayer
            </button>
          </div>
        ) : notesFiltrees.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <p className="text-4xl mb-2">📝</p>
            <p>Aucune note {recherche || filtreCategorie ? 'correspondante' : ''}</p>
            <button
              onClick={() => setMode('creer')}
              className="mt-4 text-blue-600 hover:underline"
            >
              Créer la première note
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Notes épinglées en premier */}
            {notesFiltrees
              .sort((a, b) => {
                if (a.epingle && !b.epingle) return -1;
                if (!a.epingle && b.epingle) return 1;
                return new Date(b.creeLe).getTime() - new Date(a.creeLe).getTime();
              })
              .map(note => (
                <NoteCard
                  key={note.id}
                  note={note}
                  onEdit={() => {
                    setNoteEnEdition(note);
                    setMode('modifier');
                  }}
                  onDelete={() => handleSupprimer(note.id)}
                  onToggleEpingle={() => handleToggleEpingle(note.id)}
                />
              ))}
          </div>
        )}
      </div>

      {/* Modal création */}
      {mode === 'creer' && (
        <NoteFormModal
          entiteType={entiteType}
          entiteId={entiteId}
          onSaveCreer={handleCreer}
          onSaveModifier={async () => {}}
          onCancel={() => setMode('liste')}
        />
      )}

      {/* Modal édition */}
      {mode === 'modifier' && noteEnEdition && (
        <NoteFormModal
          entiteType={entiteType}
          entiteId={entiteId}
          note={noteEnEdition}
          onSaveCreer={handleCreer}
          onSaveModifier={(data) => handleModifier(noteEnEdition.id, data)}
          onCancel={() => {
            setMode('liste');
            setNoteEnEdition(null);
          }}
        />
      )}
    </div>
  );
}

// ============================================
// SOUS-COMPOSANTS
// ============================================

interface NoteCardProps {
  note: Note;
  onEdit: () => void;
  onDelete: () => void;
  onToggleEpingle: () => void;
}

function NoteCard({ note, onEdit, onDelete, onToggleEpingle }: NoteCardProps) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div
      className={`border rounded-lg p-4 ${
        note.epingle ? 'border-amber-300 bg-amber-50' : 'border-gray-200 bg-white'
      } hover:shadow-md transition`}
    >
      {/* En-tête */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            {note.epingle && <span title="Épinglée">📌</span>}
            <span className="text-lg">
              {CATEGORIES_ICONES[note.categorie]}
            </span>
            <h3 className="font-semibold text-gray-800 truncate">{note.titre}</h3>
            <span
              className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-600"
              title={VISIBILITES_LABELS[note.visibilite]}
            >
              {VISIBILITES_ICONES[note.visibilite]} {VISIBILITES_LABELS[note.visibilite]}
            </span>
          </div>
          <div className="text-xs text-gray-500 mt-1">
            Par {note.creePar} • {new Date(note.creeLe).toLocaleDateString('fr-CA')}
            {note.modifiePar && (
              <span> • Modifié par {note.modifiePar}</span>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1">
          <button
            onClick={onToggleEpingle}
            className={`p-2 rounded hover:bg-gray-100 ${
              note.epingle ? 'text-amber-600' : 'text-gray-400'
            }`}
            title={note.epingle ? 'Désépingler' : 'Épingler'}
          >
            📌
          </button>
          <button
            onClick={onEdit}
            className="p-2 rounded text-blue-600 hover:bg-blue-50"
            title="Modifier"
          >
            ✏️
          </button>
          <button
            onClick={onDelete}
            className="p-2 rounded text-red-600 hover:bg-red-50"
            title="Supprimer"
          >
            🗑️
          </button>
        </div>
      </div>

      {/* Contenu */}
      <div className="mt-3">
        <p
          className={`text-gray-700 whitespace-pre-wrap ${
            !expanded && note.contenu.length > 300 ? 'line-clamp-3' : ''
          }`}
        >
          {note.contenu}
        </p>
        {note.contenu.length > 300 && (
          <button
            onClick={() => setExpanded(!expanded)}
            className="text-blue-600 hover:underline text-sm mt-1"
          >
            {expanded ? 'Voir moins' : 'Voir plus...'}
          </button>
        )}
      </div>

      {/* Tags */}
      {note.tags.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-3">
          {note.tags.map(tag => (
            <span
              key={tag}
              className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded-full"
            >
              #{tag}
            </span>
          ))}
        </div>
      )}

      {/* Pièces jointes */}
      {note.piecesJointes.length > 0 && (
        <div className="mt-3 pt-3 border-t border-gray-200">
          <p className="text-xs text-gray-500 mb-2">
            📎 {note.piecesJointes.length} pièce{note.piecesJointes.length > 1 ? 's' : ''} jointe{note.piecesJointes.length > 1 ? 's' : ''}
          </p>
          <div className="flex flex-wrap gap-2">
            {note.piecesJointes.map(pj => (
              <button
                key={pj.id}
                onClick={() => noteService.telechargerPieceJointe(pj.id, pj.nomOriginal)}
                className="flex items-center gap-1 px-2 py-1 bg-gray-100 rounded hover:bg-gray-200 text-sm"
              >
                <span>{getIconeTypeMime(pj.typeMime)}</span>
                <span className="truncate max-w-[150px]">{pj.nomOriginal}</span>
                <span className="text-gray-500">({formatTailleFichier(pj.taille)})</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================
// MODAL FORMULAIRE
// ============================================

interface NoteFormModalProps {
  entiteType: TypeEntiteNote;
  entiteId: string;
  note?: Note;
  onSaveCreer: (data: CreerNoteInput) => Promise<void>;
  onSaveModifier: (data: ModifierNoteInput) => Promise<void>;
  onCancel: () => void;
}

function NoteFormModal({
  entiteType,
  entiteId,
  note,
  onSaveCreer,
  onSaveModifier,
  onCancel,
}: NoteFormModalProps) {
  const [titre, setTitre] = useState(note?.titre || '');
  const [contenu, setContenu] = useState(note?.contenu || '');
  const [categorie, setCategorie] = useState<CategorieNote>(note?.categorie || 'GENERALE');
  const [visibilite, setVisibilite] = useState<VisibiliteNote>(note?.visibilite || 'EQUIPE');
  const [tags, setTags] = useState(note?.tags.join(', ') || '');
  const [epingle, setEpingle] = useState(note?.epingle || false);
  const [fichiers, setFichiers] = useState<File[]>([]);
  const [saving, setSaving] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErreur(null);
    setSaving(true);

    try {
      const tagsArray = tags
        .split(',')
        .map(t => t.trim())
        .filter(t => t.length > 0);

      if (note) {
        // Modification
        await onSaveModifier({
          titre,
          contenu,
          categorie,
          visibilite,
          tags: tagsArray,
          epingle,
        });
      } else {
        // Création
        await onSaveCreer({
          titre,
          contenu,
          categorie,
          visibilite,
          entiteType,
          entiteId,
          tags: tagsArray,
          epingle,
        });
      }

      // Upload des fichiers si présents
      // Note: Pour l'instant, on ne gère pas les pièces jointes à la création
      // car il faudrait d'abord créer la note puis attacher les fichiers
    } catch (err: any) {
      setErreur(err.message || 'Erreur lors de la sauvegarde');
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <form onSubmit={handleSubmit}>
          {/* En-tête */}
          <div className="p-4 border-b border-gray-200 flex items-center justify-between">
            <h3 className="text-lg font-semibold">
              {note ? 'Modifier la note' : 'Nouvelle note'}
            </h3>
            <button
              type="button"
              onClick={onCancel}
              className="text-gray-500 hover:text-gray-700"
            >
              ✕
            </button>
          </div>

          {/* Contenu */}
          <div className="p-4 space-y-4">
            {erreur && (
              <div className="p-3 bg-red-50 text-red-700 rounded-lg">
                ❌ {erreur}
              </div>
            )}

            {/* Titre */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Titre *
              </label>
              <input
                type="text"
                value={titre}
                onChange={(e) => setTitre(e.target.value)}
                required
                maxLength={200}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Titre de la note"
              />
            </div>

            {/* Contenu */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Contenu *
              </label>
              <textarea
                value={contenu}
                onChange={(e) => setContenu(e.target.value)}
                required
                rows={6}
                maxLength={50000}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-y"
                placeholder="Contenu de la note (Markdown supporté)"
              />
              <p className="text-xs text-gray-500 mt-1">
                {contenu.length}/50000 caractères
              </p>
            </div>

            {/* Catégorie et Visibilité */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Catégorie
                </label>
                <select
                  value={categorie}
                  onChange={(e) => setCategorie(e.target.value as CategorieNote)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  {Object.entries(CATEGORIES_LABELS).map(([key, label]) => (
                    <option key={key} value={key}>
                      {CATEGORIES_ICONES[key as CategorieNote]} {label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Visibilité
                </label>
                <select
                  value={visibilite}
                  onChange={(e) => setVisibilite(e.target.value as VisibiliteNote)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  {Object.entries(VISIBILITES_LABELS).map(([key, label]) => (
                    <option key={key} value={key}>
                      {VISIBILITES_ICONES[key as VisibiliteNote]} {label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Tags */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Tags (séparés par des virgules)
              </label>
              <input
                type="text"
                value={tags}
                onChange={(e) => setTags(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                placeholder="urgent, terminologie, cisr"
              />
            </div>

            {/* Épingler */}
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="epingle"
                checked={epingle}
                onChange={(e) => setEpingle(e.target.checked)}
                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
              <label htmlFor="epingle" className="text-sm text-gray-700">
                📌 Épingler cette note (apparaît en premier)
              </label>
            </div>

            {/* Upload fichiers (si nouvelle note) */}
            {!note && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Pièces jointes
                </label>
                <input
                  type="file"
                  multiple
                  onChange={(e) => setFichiers(Array.from(e.target.files || []))}
                  className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                />
                {fichiers.length > 0 && (
                  <div className="mt-2 text-sm text-gray-600">
                    {fichiers.length} fichier(s) sélectionné(s)
                  </div>
                )}
                <p className="text-xs text-gray-500 mt-1">
                  Max 10 MB par fichier. Types: PDF, Word, Excel, images, texte, ZIP
                </p>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="p-4 border-t border-gray-200 flex justify-end gap-3">
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition"
              disabled={saving}
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={saving || !titre.trim() || !contenu.trim()}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {saving && (
                <span className="animate-spin">⏳</span>
              )}
              {note ? 'Enregistrer' : 'Créer'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ============================================
// MODAL DÉTAIL
// ============================================

interface NoteDetailModalProps {
  note: Note;
  onClose: () => void;
  onEdit: (note: Note) => void;
  onDelete: (id: string) => void;
  onToggleEpingle: (id: string) => void;
}

function NoteDetailModal({
  note,
  onClose,
  onEdit,
  onDelete,
  onToggleEpingle,
}: NoteDetailModalProps) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* En-tête */}
        <div className="p-4 border-b border-gray-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            {note.epingle && <span>📌</span>}
            <span>{CATEGORIES_ICONES[note.categorie]}</span>
            <h3 className="text-lg font-semibold">{note.titre}</h3>
          </div>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            ✕
          </button>
        </div>

        {/* Métadonnées */}
        <div className="px-4 py-2 bg-gray-50 text-sm text-gray-600 flex flex-wrap gap-4">
          <span>
            {VISIBILITES_ICONES[note.visibilite]} {VISIBILITES_LABELS[note.visibilite]}
          </span>
          <span>Par {note.creePar}</span>
          <span>{new Date(note.creeLe).toLocaleString('fr-CA')}</span>
          {note.modifiePar && (
            <span>Modifié par {note.modifiePar}</span>
          )}
        </div>

        {/* Contenu */}
        <div className="p-4">
          <p className="text-gray-700 whitespace-pre-wrap">{note.contenu}</p>

          {/* Tags */}
          {note.tags.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-4">
              {note.tags.map(tag => (
                <span
                  key={tag}
                  className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded-full"
                >
                  #{tag}
                </span>
              ))}
            </div>
          )}

          {/* Pièces jointes */}
          {note.piecesJointes.length > 0 && (
            <div className="mt-4 pt-4 border-t border-gray-200">
              <p className="font-medium mb-2">
                📎 Pièces jointes ({note.piecesJointes.length})
              </p>
              <div className="space-y-2">
                {note.piecesJointes.map(pj => (
                  <button
                    key={pj.id}
                    onClick={() => noteService.telechargerPieceJointe(pj.id, pj.nomOriginal)}
                    className="flex items-center gap-2 w-full p-2 bg-gray-100 rounded hover:bg-gray-200 text-left"
                  >
                    <span className="text-2xl">{getIconeTypeMime(pj.typeMime)}</span>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{pj.nomOriginal}</p>
                      <p className="text-xs text-gray-500">
                        {formatTailleFichier(pj.taille)} • {pj.typeMime}
                      </p>
                    </div>
                    <span className="text-blue-600">⬇️</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="p-4 border-t border-gray-200 flex justify-between">
          <button
            onClick={() => onToggleEpingle(note.id)}
            className={`px-4 py-2 rounded-lg transition ${
              note.epingle
                ? 'bg-amber-100 text-amber-700 hover:bg-amber-200'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            📌 {note.epingle ? 'Désépingler' : 'Épingler'}
          </button>
          <div className="flex gap-2">
            <button
              onClick={() => onEdit(note)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
            >
              ✏️ Modifier
            </button>
            <button
              onClick={() => {
                onDelete(note.id);
                onClose();
              }}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition"
            >
              🗑️ Supprimer
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
