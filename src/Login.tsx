import React, { useState } from 'react';

type Props = {
  onSuccess: () => void;
};

export default function Login({ onSuccess }: Props) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleLogin = () => {
    if (username === 'admin' && password === 'Vnvc@2026') {
      onSuccess();
    } else {
      setError('Sai username hoặc password');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-100">
      <div className="bg-white p-8 rounded-xl shadow w-96 space-y-4">
        <h2 className="text-2xl font-bold">Đăng nhập</h2>
        <input
          type="text"
          placeholder="Username"
          value={username}
          onChange={e => setUsername(e.target.value)}
          className="w-full border rounded p-2"
        />
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={e => setPassword(e.target.value)}
          className="w-full border rounded p-2"
        />
        {error && <p className="text-red-500">{error}</p>}
        <button
          onClick={handleLogin}
          className="w-full bg-indigo-600 text-white py-2 rounded"
        >
          Đăng nhập
        </button>
      </div>
    </div>
  );
}
