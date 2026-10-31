"use client";
import React from "react";
import Notelist from "./Notelist";
import { NotesType } from "@/app/(DashboardLayout)/types/apps/notes";

interface NotesSidebarProps {
  notes: NotesType[];
  loading: boolean;
  selectedNoteId: number | null;
  onSelectNote: (noteId: number) => void;
  onDeleteNote: (noteId: number) => void;
}

const NotesSidebar: React.FC<NotesSidebarProps> = ({ notes, loading, selectedNoteId, onSelectNote, onDeleteNote }) => {

  return (
    <>
      <div className="left-part">
        <Notelist
          notes={notes}
          loading={loading}
          selectedNoteId={selectedNoteId}
          onSelectNote={onSelectNote}
          onDeleteNote={onDeleteNote}
        />
      </div>
    </>
  );
};

export default NotesSidebar;
