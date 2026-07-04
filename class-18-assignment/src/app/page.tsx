"use client";
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import { useMemo, useState, useSyncExternalStore } from 'react';

interface Album {
  userId: number;
  id: number;
  title: string;
}

const fetchAlbums = async (): Promise<Album[]> => {
  const { data } = await axios.get('https://jsonplaceholder.typicode.com/albums');
  return data;
};

const STORAGE_KEY = 'userAlbums';

const listeners = new Set<() => void>();

function subscribe(callback: () => void) {
  listeners.add(callback);
  window.addEventListener('storage', callback);
  return () => {
    listeners.delete(callback);
    window.removeEventListener('storage', callback);
  };
}

function getSnapshot(): string | null {
  try {
    return localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

function getServerSnapshot(): string | null {
  return null;
}

function notifyListeners() {
  listeners.forEach(cb => cb());
}

function writeStoredAlbums(albums: Album[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(albums));
    notifyListeners();
  } catch {
  }
}

export default function Home() {
  const rawStored = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  const storedAlbums = useMemo<Album[] | null>(() => {
    if (!rawStored) return null;
    try {
      return JSON.parse(rawStored) as Album[];
    } catch {
      return null;
    }
  }, [rawStored]);

  const [editing, setEditing] = useState<{ id: number; value: string } | null>(null);

  const { data: fetchedAlbums, isLoading } = useQuery({
    queryKey: ['albums'],
    queryFn: fetchAlbums,
  });

  const displayAlbums = useMemo(() => {
    if (storedAlbums !== null) return storedAlbums;
    return fetchedAlbums ?? [];
  }, [storedAlbums, fetchedAlbums]);

  const saveToStorage = (newAlbums: Album[]) => {
    writeStoredAlbums(newAlbums);
  };

  const handleDelete = (id: number) => {
    const updatedAlbums = displayAlbums.filter(album => album.id !== id);
    saveToStorage(updatedAlbums);
  };

  const commitReorder = (currentIndex: number, newIndexStr: string) => {
    let newIndex = parseInt(newIndexStr, 10) - 1;

    if (isNaN(newIndex) || newIndex < 0) newIndex = 0;
    if (newIndex >= displayAlbums.length) newIndex = displayAlbums.length - 1;

    if (newIndex === currentIndex) return;

    const updatedAlbums = [...displayAlbums];
    const [movedItem] = updatedAlbums.splice(currentIndex, 1);
    if (!movedItem) return;
    updatedAlbums.splice(newIndex, 0, movedItem);

    saveToStorage(updatedAlbums);
  };

  const stillResolving = rawStored === null && storedAlbums === null && isLoading;

  return (
    <main className="p-8 min-h-screen bg-gray-50 text-slate-800">
      <h1 className="text-3xl mb-8">Class 18 Assignment - Web Storage</h1>

      {stillResolving && displayAlbums.length === 0 ? (
        <p className="text-sm text-slate-500">Loading albums...</p>
      ) : null}

      <div className="flex flex-wrap gap-4">
        {displayAlbums.map((album, index) => (
          <div
            key={album.id}
            className="flex flex-col justify-between w-full sm:w-[calc(50%-1rem)] md:w-[calc(33.33%-1rem)] lg:w-[calc(25%-1rem)] p-4 bg-white border border-gray-200 rounded-lg shadow-sm hover:shadow-md transition-shadow"
          >
            <div>
              <p className="text-xs text-gray-400 mb-1">Album ID: {album.id}</p>
              <h2 className="text-lg font-semibold capitalize mb-4 line-clamp-2">{album.title}</h2>
            </div>

            <div className="flex items-center gap-2 mt-4 pt-4 border-t border-gray-100">
              <label className="text-sm text-gray-600 whitespace-nowrap">Order:</label>
              <input
                type="number"
                min="1"
                max={displayAlbums.length}
                value={editing?.id === album.id ? editing.value : String(index + 1)}
                onChange={(e) => setEditing({ id: album.id, value: e.target.value })}
                onBlur={(e) => {
                  commitReorder(index, e.target.value);
                  setEditing(null);
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    (e.target as HTMLInputElement).blur();
                  }
                }}
                className="w-16 p-1 text-sm border border-gray-300 rounded focus:outline-blue-500"
              />
              <button
                onClick={() => handleDelete(album.id)}
                className="ml-auto px-3 py-1 text-sm text-red-600 bg-red-50 hover:bg-red-100 rounded transition-colors"
              >
                Delete
              </button>
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}