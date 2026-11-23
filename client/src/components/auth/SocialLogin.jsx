import { useEffect, useRef, useState } from 'react';
import { api } from '../../api/axios.js';
import { useAuth } from '../../contexts/AuthContext.jsx';

const scripts = new Map();
/** Tải script ngoài đúng một lần, dùng lại promise cho các lần gọi sau. */
function loadScript(src) {
    if (!scripts.has(src)) {
        scripts.set(src, new Promise((resolve, reject) => {
            const s = document.createElement('script');
            s.src = src;
            s.async = true;
            s.onload = resolve;
            s.onerror = () => {
                scripts.delete(src);
                reject(new Error('Script blocked'));
            };
            document.body.appendChild(s);
        }));
    }
    return scripts.get(src);
}

let fbReady;
function loadFacebookSdk(appId, version) {
    if (window.FB) return Promise.resolve();
    if (!fbReady) {
        fbReady = new Promise((resolve, reject) => {
            window.fbAsyncInit = () => {
                try {
                    window.FB.init({ appId, cookie: true, xfbml: false, version: version || 'v21.0' });
                    resolve();
                } catch (err) {
                    reject(err);
                }
            };
            loadScript('https://connect.facebook.net/vi_VN/sdk.js').catch((e) => {
                fbReady = undefined;
                reject(e);
            });
        });
    }
    return fbReady;
}

export default function SocialLogin({ onDone }) {
    const { loginWithGoogle, loginWithFacebook } = useAuth();
    const [cfg, setCfg] = useState(null);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState('');
    const tokenClientRef = useRef(null);

    useEffect(() => {
        api.get('/auth/config').then((r) => setCfg(r.data)).catch(() => setCfg({}));
    }, []);

    const finish = async (fn) => {
        setError('');
        setBusy(true);
        try {
            await fn();
            if (onDone) onDone();
        } catch (e) {
            setError(e.message || 'Đăng nhập không thành công.');
        } finally {
            setBusy(false);
        }
    };

    // Google: Khởi tạo Google Identity Services
    useEffect(() => {
        if (!cfg?.googleClientId) return undefined;
        let cancelled = false;

        loadScript('https://accounts.google.com/gsi/client').then(() => {
            if (cancelled) return;
            try {
                // 1. Khởi tạo Token Client cho nút bấm tùy chỉnh (chuẩn OAuth2 hiện đại)
                if (window.google?.accounts?.oauth2) {
                    tokenClientRef.current = window.google.accounts.oauth2.initTokenClient({
                        client_id: cfg.googleClientId,
                        scope: 'email profile openid',
                        callback: (resp) => {
                            if (resp?.error) {
                                if (resp.error !== 'access_denied') {
                                    setError(resp.error_description || 'Đăng nhập Google không thành công.');
                                }
                                return;
                            }
                            if (resp?.access_token) {
                                finish(() => loginWithGoogle(resp.access_token));
                            } else {
                                setError('Không nhận được mã xác thực từ Google.');
                            }
                        },
                    });
                }

                // 2. Đồng thời kích hoạt One Tap cho người dùng có sẵn session trên Chrome
                if (window.google?.accounts?.id) {
                    window.google.accounts.id.initialize({
                        client_id: cfg.googleClientId,
                        callback: (resp) => {
                            if (resp?.credential) {
                                finish(() => loginWithGoogle(resp.credential));
                            }
                        },
                    });
                    try {
                        window.google.accounts.id.prompt();
                    } catch {
                        // Bỏ qua nếu trình duyệt không hỗ trợ One Tap
                    }
                }
            } catch (err) {
                console.warn('[Google Init Error]:', err);
            }
        }).catch(() => {
            console.warn('[Google] Không tải được Google Sign-In SDK (có thể do trình chặn quảng cáo).');
        });

        return () => { cancelled = true; };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [cfg]);

    // Facebook: Tải ngầm SDK trước nếu có cấu hình
    useEffect(() => {
        if (!cfg?.facebookAppId) return;
        loadFacebookSdk(cfg.facebookAppId, cfg.facebookVersion).catch(() => {});
    }, [cfg]);

    const googleLogin = () => {
        setError('');
        if (!cfg?.googleClientId) {
            setError('Chưa cấu hình Google Client ID.');
            return;
        }

        if (tokenClientRef.current) {
            tokenClientRef.current.requestAccessToken();
            return;
        }

        loadScript('https://accounts.google.com/gsi/client').then(() => {
            if (window.google?.accounts?.oauth2) {
                tokenClientRef.current = window.google.accounts.oauth2.initTokenClient({
                    client_id: cfg.googleClientId,
                    scope: 'email profile openid',
                    callback: (resp) => {
                        if (resp?.access_token) {
                            finish(() => loginWithGoogle(resp.access_token));
                        } else if (resp?.error && resp.error !== 'access_denied') {
                            setError(resp.error_description || 'Đăng nhập Google thất bại.');
                        }
                    },
                });
                tokenClientRef.current.requestAccessToken();
            } else {
                setError('Không thể khởi tạo thư viện đăng nhập Google.');
            }
        }).catch(() => {
            setError('Trình duyệt đang chặn thư viện Google. Vui lòng tắt tiện ích chặn quảng cáo và thử lại.');
        });
    };

    const facebookLogin = () => {
        setError('');
        if (!cfg?.facebookAppId) {
            setError('Chưa cấu hình Facebook App ID.');
            return;
        }

        // Cách 1: Dùng window.FB.login nếu SDK đã tải
        if (window.FB) {
            window.FB.login((resp) => {
                if (!resp.authResponse) {
                    setError('Bạn đã hủy đăng nhập Facebook.');
                    return;
                }
                finish(() => loginWithFacebook(resp.authResponse.accessToken));
            }, { scope: 'public_profile,email' });
            return;
        }

        // Cách 2: Popup OAuth trực tiếp nếu SDK bị ad-blocker chặn
        const redirectUri = window.location.origin;
        const version = cfg.facebookVersion || 'v21.0';
        const authUrl = `https://www.facebook.com/${version}/dialog/oauth?client_id=${encodeURIComponent(cfg.facebookAppId)}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=token&scope=public_profile,email`;

        const width = 600, height = 700;
        const left = window.screenX + (window.outerWidth - width) / 2;
        const top = window.screenY + (window.outerHeight - height) / 2;
        const popup = window.open(authUrl, 'facebook_oauth', `width=${width},height=${height},left=${left},top=${top}`);

        if (!popup) {
            setError('Trình duyệt đã chặn cửa sổ đăng nhập Facebook. Vui lòng cho phép popup hoặc tắt tiện ích chặn quảng cáo.');
            return;
        }

        const timer = setInterval(() => {
            try {
                if (popup.closed) {
                    clearInterval(timer);
                    return;
                }
                const popupUrl = popup.location.href;
                if (popupUrl && popupUrl.startsWith(window.location.origin)) {
                    const hash = popup.location.hash || popup.location.search;
                    const params = new URLSearchParams(hash.replace(/^[#?]/, ''));
                    const token = params.get('access_token');
                    const errReason = params.get('error_description') || params.get('error');

                    popup.close();
                    clearInterval(timer);

                    if (token) {
                        finish(() => loginWithFacebook(token));
                    } else if (errReason) {
                        setError(`Đăng nhập Facebook bị hủy hoặc lỗi: ${errReason}`);
                    }
                }
            } catch {
                // Bỏ qua lỗi CORS khi popup còn ở domain facebook.com
            }
        }, 500);
    };

    if (!cfg || (!cfg.googleClientId && !cfg.facebookAppId)) return null;

    return (
        <div className="space-y-4 pt-1 w-full">
            <div className="flex items-center gap-3 text-xs text-slate-500 font-medium">
                <span className="h-px flex-1 bg-white/10" />
                <span>Hoặc tiếp tục với</span>
                <span className="h-px flex-1 bg-white/10" />
            </div>

            {error && (
                <div className="rounded-xl bg-red-500/10 border border-red-500/30 p-3 text-xs text-red-300">
                    {error}
                </div>
            )}

            <div className={`flex flex-col items-center gap-3 w-full ${busy ? 'pointer-events-none opacity-60' : ''}`}>
                {cfg.googleClientId && (
                    <button
                        type="button"
                        onClick={googleLogin}
                        disabled={busy}
                        className="group relative flex h-11 w-full items-center justify-center gap-3 rounded-xl bg-white hover:bg-slate-100 text-slate-900 text-sm font-semibold shadow-md shadow-white/5 transition-all duration-200 hover:shadow-lg hover:shadow-white/10 active:scale-[0.98] disabled:opacity-50 border border-slate-200/80 cursor-pointer"
                    >
                        <svg className="h-5 w-5 shrink-0 transition-transform group-hover:scale-105" viewBox="0 0 24 24" aria-hidden="true">
                            <path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.17z" />
                            <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.34 24 12 24z" />
                            <path fill="#FBBC05" d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.19 0 10.04 0 12s.45 3.81 1.25 5.42l4.03-3.15z" />
                            <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.34 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z" />
                        </svg>
                        <span>{busy ? 'Đang xác thực...' : 'Tiếp tục với Google'}</span>
                    </button>
                )}

                {cfg.facebookAppId && (
                    <button
                        type="button"
                        onClick={facebookLogin}
                        disabled={busy}
                        className="group relative flex h-11 w-full items-center justify-center gap-3 rounded-xl bg-[#1877F2] hover:bg-[#166fe5] text-sm font-semibold text-white shadow-[0_4px_16px_rgba(24,119,242,0.3)] transition-all duration-200 hover:shadow-[0_6px_20px_rgba(24,119,242,0.5)] active:scale-[0.98] disabled:opacity-50 cursor-pointer"
                    >
                        <svg viewBox="0 0 24 24" className="h-5 w-5 fill-current shrink-0 transition-transform group-hover:scale-105" aria-hidden="true">
                            <path d="M24 12.07C24 5.4 18.63 0 12 0S0 5.4 0 12.07C0 18.1 4.39 23.1 10.13 24v-8.44H7.08v-3.49h3.05V9.41c0-3.02 1.79-4.7 4.53-4.7 1.31 0 2.68.24 2.68.24v2.97h-1.51c-1.49 0-1.96.93-1.96 1.89v2.26h3.33l-.53 3.49h-2.8V24C19.61 23.1 24 18.1 24 12.07z" />
                        </svg>
                        <span>{busy ? 'Đang xác thực...' : 'Tiếp tục với Facebook'}</span>
                    </button>
                )}
            </div>
        </div>
    );
}
