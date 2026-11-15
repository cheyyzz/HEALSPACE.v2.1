import React, { useState } from 'react';
import { useHealSpace } from '../context/HealSpaceContext';
import { CheckCircle2, AlertCircle } from 'lucide-react';

export const AuthViews: React.FC = () => {
  const {
    authScreenMode,
    setAuthScreenMode,
    login,
    registerMahasiswa,
  } = useHealSpace();

  // Registration state
  const [nama, setNama] = useState('');
  const [nim, setNim] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  // Login state
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  const [feedback, setFeedback] = useState<{ ok: boolean; text: string } | null>(null);

  const handleNimChange = (val: string) => {
    setNim(val);
    setFeedback(null);
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await registerMahasiswa({ nama, nim, email, password });
    setFeedback({ ok: res.ok, text: res.message });
  };

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await login(loginEmail, loginPassword);
    setFeedback({ ok: res.ok, text: res.message });
  };

  return (
    <div className="min-h-screen grid grid-cols-1 lg:grid-cols-2 bg-[#F7F8F7]">
      {/* Left Brand Panel — Matches Page 25 Top */}
      <div className="bg-[#2D736B] text-white flex flex-col justify-between px-8 py-12 sm:px-14 lg:px-20 lg:py-16">
        <div className="hidden lg:block" />

        <div className="max-w-md my-auto py-8">
          <h1 className="text-4xl sm:text-[42px] font-bold tracking-tight text-white">
            HealSpace
          </h1>
          <p className="mt-4 text-lg sm:text-xl text-white/90 leading-relaxed font-normal [text-wrap:balance]">
            Ruang aman untuk telekonseling kesehatan mental mahasiswa.
          </p>
        </div>

      </div>

      {/* Right Form Container — Matches Page 25 Top */}
      <div className="flex items-center justify-center px-6 py-12 sm:px-12 lg:px-16 bg-[#F7F8F7]">
        <div className="w-full max-w-[440px] bg-white border border-[#E5E8E6] rounded-xl p-7 sm:p-9">
          {authScreenMode === 'register' ? (
            <>
              <h2 className="text-xl font-bold text-[#1A2421] tracking-tight">
                Daftar akun mahasiswa
              </h2>
              <p className="mt-1 text-sm text-[#63706C]">
                Data akademik diverifikasi melalui SIAKAD.
              </p>

              {feedback && (
                <div
                  className={`mt-4 p-3 rounded-lg border text-xs flex items-start gap-2 ${
                    feedback.ok
                      ? 'bg-[#EAF4F2] border-[#CBE3DF] text-[#215750]'
                      : 'bg-[#FDF2F0] border-[#F3D0CA] text-[#9E3829]'
                  }`}
                >
                  {feedback.ok ? (
                    <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
                  ) : (
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  )}
                  <span>{feedback.text}</span>
                </div>
              )}

              <form onSubmit={handleRegisterSubmit} className="mt-6 space-y-4">
                <div>
                  <label
                    htmlFor="reg-nama"
                    className="block text-xs font-medium text-[#2E3A36] mb-1.5"
                  >
                    Nama lengkap
                  </label>
                  <input
                    id="reg-nama"
                    type="text"
                    value={nama}
                    onChange={(e) => {
                      setNama(e.target.value);
                      setFeedback(null);
                    }}
                    placeholder="Nama sesuai KRS"
                    className="w-full px-3.5 py-2.5 text-sm bg-white border border-[#D7DDD9] rounded-lg text-[#1A2421] placeholder:text-[#98A39F] focus:outline-none focus:border-[#2D736B] focus:ring-2 focus:ring-[#2D736B]/15 transition-colors"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label
                      htmlFor="reg-nim"
                      className="block text-xs font-medium text-[#2E3A36]"
                    >
                      NIM
                    </label>
                    <span className="text-[11px] text-[#63706C] font-mono tabular-nums">
                      Contoh SIAKAD: 10502221001
                    </span>
                  </div>
                  <input
                    id="reg-nim"
                    type="text"
                    value={nim}
                    onChange={(e) => handleNimChange(e.target.value)}
                    placeholder="NIM"
                    className="w-full px-3.5 py-2.5 text-sm font-mono tabular-nums bg-white border border-[#D7DDD9] rounded-lg text-[#1A2421] placeholder:font-sans placeholder:text-[#98A39F] focus:outline-none focus:border-[#2D736B] focus:ring-2 focus:ring-[#2D736B]/15 transition-colors"
                  />
                </div>

                <div>
                  <label
                    htmlFor="reg-email"
                    className="block text-xs font-medium text-[#2E3A36] mb-1.5"
                  >
                    Email
                  </label>
                  <input
                    id="reg-email"
                    type="email"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      setFeedback(null);
                    }}
                    placeholder="nama@kampus.ac.id"
                    className="w-full px-3.5 py-2.5 text-sm bg-white border border-[#D7DDD9] rounded-lg text-[#1A2421] placeholder:text-[#98A39F] focus:outline-none focus:border-[#2D736B] focus:ring-2 focus:ring-[#2D736B]/15 transition-colors"
                  />
                </div>

                <div>
                  <label
                    htmlFor="reg-pass"
                    className="block text-xs font-medium text-[#2E3A36] mb-1.5"
                  >
                    Kata sandi
                  </label>
                  <input
                    id="reg-pass"
                    type="password"
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      setFeedback(null);
                    }}
                    placeholder="Minimal 8 karakter"
                    className="w-full px-3.5 py-2.5 text-sm bg-white border border-[#D7DDD9] rounded-lg text-[#1A2421] placeholder:text-[#98A39F] focus:outline-none focus:border-[#2D736B] focus:ring-2 focus:ring-[#2D736B]/15 transition-colors"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full mt-2 py-2.5 px-4 text-sm font-semibold text-white bg-[#2D736B] hover:bg-[#235B54] rounded-lg transition-colors whitespace-nowrap"
                >
                  Verifikasi NIM dan daftar
                </button>
              </form>

              <p className="mt-5 text-center text-xs text-[#63706C]">
                Sudah punya akun?{' '}
                <button
                  type="button"
                  onClick={() => {
                    setFeedback(null);
                    setAuthScreenMode('login');
                  }}
                  className="font-semibold text-[#2D736B] underline underline-offset-2 hover:text-[#235B54]"
                >
                  Masuk
                </button>
              </p>
            </>
          ) : (
            <>
              <h2 className="text-xl font-bold text-[#1A2421] tracking-tight">
                Masuk ke HealSpace
              </h2>
              <p className="mt-1 text-sm text-[#63706C]">
                Gunakan akun Mahasiswa, Konselor, atau Administrator.
              </p>

              {feedback && (
                <div
                  className={`mt-4 p-3 rounded-lg border text-xs flex items-start gap-2 ${
                    feedback.ok
                      ? 'bg-[#EAF4F2] border-[#CBE3DF] text-[#215750]'
                      : 'bg-[#FDF2F0] border-[#F3D0CA] text-[#9E3829]'
                  }`}
                >
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{feedback.text}</span>
                </div>
              )}

              <form onSubmit={handleLoginSubmit} className="mt-6 space-y-4">
                <div>
                  <label
                    htmlFor="login-email"
                    className="block text-xs font-medium text-[#2E3A36] mb-1.5"
                  >
                    Email
                  </label>
                  <input
                    id="login-email"
                    type="email"
                    value={loginEmail}
                    onChange={(e) => {
                      setLoginEmail(e.target.value);
                      setFeedback(null);
                    }}
                    placeholder="nama@kampus.ac.id"
                    className="w-full px-3.5 py-2.5 text-sm bg-white border border-[#D7DDD9] rounded-lg text-[#1A2421] placeholder:text-[#98A39F] focus:outline-none focus:border-[#2D736B] focus:ring-2 focus:ring-[#2D736B]/15 transition-colors"
                  />
                </div>

                <div>
                  <label
                    htmlFor="login-pass"
                    className="block text-xs font-medium text-[#2E3A36] mb-1.5"
                  >
                    Kata sandi
                  </label>
                  <input
                    id="login-pass"
                    type="password"
                    value={loginPassword}
                    onChange={(e) => {
                      setLoginPassword(e.target.value);
                      setFeedback(null);
                    }}
                    placeholder="Masukkan kata sandi"
                    className="w-full px-3.5 py-2.5 text-sm bg-white border border-[#D7DDD9] rounded-lg text-[#1A2421] placeholder:text-[#98A39F] focus:outline-none focus:border-[#2D736B] focus:ring-2 focus:ring-[#2D736B]/15 transition-colors"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full mt-2 py-2.5 px-4 text-sm font-semibold text-white bg-[#2D736B] hover:bg-[#235B54] rounded-lg transition-colors whitespace-nowrap"
                >
                  Masuk
                </button>
              </form>

              <div className="mt-5 pt-4 border-t border-[#E5E8E6]">
                <p className="text-[11px] text-[#63706C] mb-2">
                  Isi kredensial otomatis untuk pengujian:
                </p>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setLoginEmail('cheiven.walangitan@kampus.ac.id');
                      setLoginPassword('password123');
                      setFeedback(null);
                    }}
                    className="py-1.5 px-2 text-xs font-medium border border-[#D7DDD9] rounded-lg text-[#2E3A36] hover:bg-[#F7F8F7] whitespace-nowrap"
                  >
                    Mahasiswa
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setLoginEmail('maya.ratnasari@kampus.ac.id');
                      setLoginPassword('password123');
                      setFeedback(null);
                    }}
                    className="py-1.5 px-2 text-xs font-medium border border-[#D7DDD9] rounded-lg text-[#2E3A36] hover:bg-[#F7F8F7] whitespace-nowrap"
                  >
                    Konselor
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setLoginEmail('admin@kampus.ac.id');
                      setLoginPassword('password123');
                      setFeedback(null);
                    }}
                    className="py-1.5 px-2 text-xs font-medium border border-[#D7DDD9] rounded-lg text-[#2E3A36] hover:bg-[#F7F8F7] whitespace-nowrap"
                  >
                    Admin
                  </button>
                </div>
              </div>

              <p className="mt-5 text-center text-xs text-[#63706C]">
                Belum punya akun mahasiswa?{' '}
                <button
                  type="button"
                  onClick={() => {
                    setFeedback(null);
                    setAuthScreenMode('register');
                  }}
                  className="font-semibold text-[#2D736B] underline underline-offset-2 hover:text-[#235B54]"
                >
                  Daftar akun mahasiswa
                </button>
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
