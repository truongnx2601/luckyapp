import React, { useEffect, useMemo, useRef, useState } from 'react';
import * as XLSX from 'xlsx';
import Login from './Login';
import SettingsModal from './SettingsModal';

/* ================= TYPES ================= */

export type Participant = {
  id: string | number;
  name: string;
  center?: string;
  position?: string;
};

export type Award = {
  id: string;
  title: string;
  count: number;
  winners: Participant[];
};

/* ================= HELPERS ================= */

const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

const STORAGE_KEY = 'lucky-draw-state';

const waitForAudioReady = (audio: HTMLAudioElement) =>
  new Promise<void>(resolve => {
    if (!isNaN(audio.duration) && audio.duration > 0) return resolve();
    audio.onloadedmetadata = () => resolve();
  });

const getNextAvailableAwardIndex = (awards: Award[]) =>
  awards.findIndex(a => a.winners.length < a.count);

/* ================= APP ================= */

export default function App() {
  /* ---------- AUTH ---------- */
  const [authed, setAuthed] = useState<boolean>(() => {
    return localStorage.getItem('authed') === 'true';
  });

  /* ---------- DATA ---------- */
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [awards, setAwards] = useState<Award[]>([]);
  const [currentAwardIndex, setCurrentAwardIndex] = useState(0);
  const [isResetting, setIsResetting] = useState(false);

  /* ---------- UI ---------- */
  const [showSettings, setShowSettings] = useState(false);
  const [isSpinning, setIsSpinning] = useState(false);
  const [rolling, setRolling] = useState<Participant | null>(null);

  /* ---------- AUDIO ---------- */
  const audioRef = useRef<HTMLAudioElement>(null);
  const [audioUnlocked, setAudioUnlocked] = useState(false);

  /* ---------- EFFECT ---------- */
  useEffect(() => {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;

      try {
        const parsed = JSON.parse(raw);
        setParticipants(parsed.participants || []);
        setAwards(parsed.awards || []);
        setCurrentAwardIndex(parsed.currentAwardIndex || 0);
      } catch {
        localStorage.removeItem(STORAGE_KEY);
      }
  }, []);

  useEffect(() => {
    if (participants.length === 0 || awards.length === 0) {
      setShowSettings(true);
    }
  }, [participants.length, awards.length]);

  useEffect(() => {
    if (isResetting) return;
    if (participants.length !== 0 || awards.length !== 0){
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          participants,
          awards,
          currentAwardIndex,
        })
      );}
  }, [participants, awards, currentAwardIndex, isResetting]);

  

  /* ---------- DERIVED ---------- */

  const usedIds = useMemo(
    () => new Set(awards.flatMap(a => a.winners.map(w => w.id))),
    [awards]
  );

  const pool = useMemo(
    () => participants.filter(p => !usedIds.has(p.id)),
    [participants, usedIds]
  );

  const currentAward = awards[currentAwardIndex];

  /* ================= AUTH ================= */

  if (!authed) {
    return (
      <Login
        onSuccess={() => {
          setAuthed(true);
          localStorage.setItem('authed', 'true');
        }}
      />
    );
  }

  /* ================= LOGIC ================= */

  const unlockAudio = async () => {
    if (!audioRef.current || audioUnlocked) return;
    try {
      audioRef.current.muted = true;
      await audioRef.current.play();
      audioRef.current.pause();
      audioRef.current.muted = false;
      setAudioUnlocked(true);
    } catch {}
  };

  const importExcel = (file: File) => {
    const reader = new FileReader();
    reader.onload = e => {
      const wb = XLSX.read(e.target?.result, { type: 'array' });
      const sheet = wb.Sheets[wb.SheetNames[0]];
      const rows: any[] = XLSX.utils.sheet_to_json(sheet, {
        range: 1,
        defval: '',
      });

      setParticipants(
        rows.map((r, i) => ({
          id: r['Mã nhân viên'] || i + 1,
          name: r['Họ tên'],
        }))
      );
    };
    reader.readAsArrayBuffer(file);
  };

  const exportResults = () => {
    if (awards.length === 0) return;

    const wb = XLSX.utils.book_new();

    awards.forEach(award => {
      if (award.winners.length === 0) return;

      const rows = award.winners.map(w => ({
        'Giải thưởng': award.title,
        'Mã nhân viên': w.id,
        'Họ tên': w.name,
      }));

      const ws = XLSX.utils.json_to_sheet(rows);

      XLSX.utils.book_append_sheet(
        wb,
        ws,
        award.title.slice(0, 31) // Excel giới hạn tên sheet
      );
    });

    XLSX.writeFile(wb, `ket-qua-quay-thuong-${Date.now()}.xlsx`);
  };

  const resetAll = () => {
    setIsResetting(true);
    localStorage.clear();
    sessionStorage.clear();
    setAuthed(false);
    setParticipants([]);
    setAwards([]);
    setCurrentAwardIndex(0);
    setShowSettings(false);
    setIsSpinning(false);
    setRolling(null);

    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
    setAudioUnlocked(false);
    window.location.reload();
  };


  const spin = async () => {
    if (!currentAward || isSpinning || pool.length === 0) return;

    await unlockAudio();

    const audio = audioRef.current!;
    audio.currentTime = 0;
    await waitForAudioReady(audio);
    audio.play();

    setIsSpinning(true);

    const duration = audio.duration;
    const interval = duration / currentAward.count;

    //for (let i = currentAward.winners.length; i < currentAward.count; i++) {
      const start = Date.now();

      while (Date.now() - start < interval * 800) {
        setRolling(pool[Math.floor(Math.random() * pool.length)]);
        await sleep(80);
      }
      // let winner : Participant | undefined;
      // if(currentAward.title === 'Giải Nhất') {
      //   winner = pool.find(p => p.id === 'MN9668');
      // }
      // if(!winner){
      //   winner = pool[Math.floor(Math.random() * pool.length)];
      // }
      const winner = pool[Math.floor(Math.random() * pool.length)];
      setRolling(winner);

      setAwards(prev =>
        prev.map((a, idx) =>
          idx === currentAwardIndex
            ? { ...a, winners: [...a.winners, winner] }
            : a
        )
      );

      await sleep(interval * 200);
    //}

    audio.pause();
    audio.currentTime = 0;
    setRolling(null);
    setIsSpinning(false);

    setAwards(prev => {
      const nextIdx = getNextAvailableAwardIndex(prev);
      if (nextIdx !== -1) setCurrentAwardIndex(nextIdx);
      return prev;
    });
  };

  /* ================= RENDER ================= */

  return (
    <div className="min-h-screen bg-slate-100 px-6 py-6">
      <audio ref={audioRef} src="/src/assets/audio.mp3" preload="metadata" />
      <button
        disabled={isSpinning}
        onClick={() => setShowSettings(true)}
        className="fixed top-4 right-4 text-2xl"
      >
        ⚙️
      </button>
      <button
        onClick={exportResults}
        className="fixed top-4 left-4 bg-emerald-600 text-white px-4 py-2 rounded shadow"
      >
          Xuất kết quả
      </button>

      <SettingsModal
        isOpen={showSettings}
        isSpinning={isSpinning}
        participantsLoaded={participants.length > 0}
        awards={awards}
        onImportExcel={importExcel}
        onSave={(configs) => {
          setAwards(prev => {
            const merged = configs.map(c => {
              const old = prev.find(p => p.id === c.id);
              return old
                ? { ...c, winners: old.winners }
                : { ...c, winners: [] };
            });

            const nextIdx = getNextAvailableAwardIndex(merged);
            if (nextIdx !== -1) setCurrentAwardIndex(nextIdx);

            return merged;
          });
        }}
        onClose={() => setShowSettings(false)}
        onReset={() => resetAll()}
      />

      <div className="max-w-[1600px] mx-auto">
        <h1 className="text-3xl font-bold text-center mb-6">
           VÒNG QUAY MAY MẮN
        </h1>
        <div className="h-10 flex items-center justify-center text-4xl font-bold">
          {rolling && ` ${rolling.name} `}
        </div>
        {currentAward && (
          <div className="text-center mt-4">
            <button
              disabled={isSpinning}
              onClick={spin}
              className="px-8 py-3 bg-indigo-600 text-white rounded disabled:opacity-50"
            >
              {isSpinning
                ? 'ĐANG QUAY...'
                : `Quay ${currentAward.title}`}
            </button>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 mt-10">
          {awards.map(a => (
            <div key={a.id} className="bg-white rounded-xl shadow">
              <h3 className="p-4 font-bold border-b">
                {a.title} ({a.winners.length}/{a.count})
              </h3>

              {a.winners.length === 0 ? (
                <p className="p-4 text-gray-400">Chưa có người trúng</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full text-sm">
                    <thead className="bg-gray-100">
                      <tr>
                        <th className="px-4 py-2 text-left">Mã NV</th>
                        <th className="px-4 py-2 text-left">Họ tên</th>
                      </tr>
                    </thead>
                    <tbody>
                      {a.winners.map(w => (
                        <tr key={w.id} className="border-b">
                          <td className="px-4 py-2 whitespace-nowrap">{w.id}</td>
                          <td className="px-4 py-2 whitespace-nowrap">{w.name}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
