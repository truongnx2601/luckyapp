import { useEffect, useState } from 'react';
import { Award } from './App';

type AwardConfig = {
  id: string;
  title: string;
  count: number;
};

type Props = {
  isOpen: boolean;
  isSpinning: boolean;
  participantsLoaded: boolean;
  awards: Award[];
  onImportExcel: (file: File) => void;
  onSave: (configs: AwardConfig[]) => void;
  onClose: () => void;
  onReset: () => void;
};

export default function SettingsModal({
  isOpen,
  isSpinning,
  participantsLoaded,
  awards,
  onImportExcel,
  onSave,
  onClose,
  onReset
}: Props) {
  const [configs, setConfigs] = useState<AwardConfig[]>([]);

  /* sync từ App → local */
  useEffect(() => {
    setConfigs(
      awards.map(a => ({
        id: a.id,
        title: a.title,
        count: a.count,
      }))
    );
  }, [awards]);

  if (!isOpen) return null;

  const addAward = () => {
    setConfigs(prev => [
      ...prev,
      {
        id: crypto.randomUUID(),
        title: 'Giải mới',
        count: 1,
      },
    ]);
  };

  const updateAward = (
    id: string,
    field: 'title' | 'count',
    value: string | number
  ) => {
    setConfigs(prev =>
      prev.map(a =>
        a.id === id ? { ...a, [field]: value } : a
      )
    );
  };

  const removeAward = (id: string) => {
    const used = awards.find(a => a.id === id)?.winners.length;
    if (used && used > 0) return; // không cho xoá giải đã quay

    setConfigs(prev => prev.filter(a => a.id !== id));
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center">
      <div className="bg-white w-[420px] rounded-xl p-6 space-y-4 max-h-[90vh] overflow-y-auto">
        <h2 className="text-xl font-bold">Cài đặt</h2>

        {/* Import Excel */}
        <div>
          <span>
            <a href="/src/assets/template.xlsx" download style={{ color: '#2563eb', textDecoration: 'underline' }}>Tải file mẫu</a>
          </span>
          <label className="text-sm font-medium block mb-1">
            Import danh sách (Excel)
          </label>
          <input
            type="file"
            accept=".xlsx,.xls"
            disabled={participantsLoaded}
            onChange={e =>
              e.target.files && onImportExcel(e.target.files[0])
            }
          />
          {participantsLoaded && (
            <p className="text-xs text-gray-400 mt-1">
              Danh sách đã import
            </p>
          )}
        </div>

        {/* Awards */}
        <div className="space-y-2">
          {configs.map(cfg => {
            const used =
              awards.find(a => a.id === cfg.id)?.winners.length || 0;

            return (
              <div
                key={cfg.id}
                className="flex gap-2 items-center"
              >
                <input
                  className="border rounded p-1 flex-1"
                  value={cfg.title}
                  disabled={used > 0}
                  onChange={e =>
                    updateAward(cfg.id, 'title', e.target.value)
                  }
                />

                <input
                  type="number"
                  min={used || 1}
                  className="border rounded p-1 w-20"
                  value={cfg.count}
                  onChange={e =>
                    updateAward(
                      cfg.id,
                      'count',
                      Number(e.target.value)
                    )
                  }
                />

                <button
                  disabled={used > 0}
                  onClick={() => removeAward(cfg.id)}
                  className="text-red-500 disabled:opacity-30"
                >
                  ✕
                </button>
              </div>
            );
          })}

          <button
            onClick={addAward}
            className="w-full bg-emerald-600 text-white py-2 rounded"
          >
            ➕ Thêm giải
          </button>
        </div>

        <button
          onClick={() => {
            onSave(configs);
            onClose();
          }}
          className="w-full bg-indigo-600 text-white py-2 rounded"
        >
          Lưu & Đóng
        </button>

        <button
            type='button'
            onClick={() => {
                const ok = confirm(
                'Thoát và xoá toàn bộ dữ liệu?\n\nDanh sách, giải thưởng và kết quả quay sẽ bị xoá.'
                );
                if (ok) onReset();
            }}
            className="w-full bg-red-600 text-white py-2 rounded"
            >
            Thoát
        </button>
      </div>
    </div>
  );
}
