import { useEffect, useRef, useState } from 'react';
import { api } from '../../api/axios.js';
import { useAuth } from '../../contexts/AuthContext.jsx';

const scripts = new Map();
/** Tải script ngoài đúng một lần, dùng lại promise cho các lần gọi sau. */
function loadScript(src) {
    if (!scripts.has(src)) {
        scripts.set(src, new Promise((resolve, reject) => {
            const s = document.createElement('script');
            s.src = src; s.async = true; s.onload = resolve;
            s.onerror = () => { scripts.delete(src); reject(new Error('Không tải được thư viện đăng nhập. Kiểm tra kết nối mạng hoặc trình chặn quảng cáo.')); };
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
                    window.FB.init({ appId, cookie: true, xfbml: false, version: version || 'v25.0' });
                    resolve();
                } catch (err) {
                    reject(err);
                }
            };
            loadScript('https://connect.facebook.net/vi_VN/sdk.js').catch((e) => { fbReady = undefined; reject(e); });
        });
    }
    return fbReady;
}

export default function SocialLogin({ onDone }) {
    const { loginWithGoogle, loginWithFacebook } = useAuth();
    const [cfg, setCfg] = useState(null);
    const [fbOk, setFbOk] = useState(false);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState('');
    const googleBtn = useRef(null);

    useEffect(() => {
        api.get('/auth/config').then((r) => setCfg(r.data)).catch(() => setCfg({}));
    }, []);

    const finish = async (fn) => {
        setError(''); setBusy(true);
        try {
            await fn();
            if (onDone) onDone();
        } catch (e) {
            setError(e.message);
        } finally {
            setBusy(false);
        }
    };

    // Google: Google tự vẽ nút; khi đăng nhập xong trả về "credential" (ID token) để gửi lên server kiểm tra
    useEffect(() => {
        if (!cfg?.googleClientId) return undefined;
        let cancelled = false;
        loadScript('https://accounts.google.com/gsi/client').then(() => {
            if (cancelled || !googleBtn.current) return;
            window.google.accounts.id.initialize({
                client_id: cfg.googleClientId,
                callback: (resp) => finish(() => loginWithGoogle(resp.credential))
            });
            window.google.accounts.id.renderButton(googleBtn.current, {
                theme: 'filled_black',
                size: 'large',
                shape: 'pill',
                text: 'continue_with',
                locale: 'vi',
                width: 320
            });
        }).catch((e) => setError(e.message));
        return () => { cancelled = true; };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [cfg]);

    // Facebook: tải SDK trước để bấm nút là mở popup ngay (trình duyệt chặn popup nếu mở chậm)
    useEffect(() => {
        if (!cfg?.facebookAppId) return;
        loadFacebookSdk(cfg.facebookAppId, cfg.facebookVersion).then(() => setFbOk(true)).catch((e) => setError(e.message));
    }, [cfg]);

    const facebookLogin = () => {
        setError('');
        if (!window.FB) {
            setError('Đang kết nối tới Facebook SDK... Vui lòng thử lại sau 2 giây.');
            return;
        }
        window.FB.login((resp) => {
            if (!resp.authResponse) return setError('Bạn đã hủy đăng nhập Facebook.');
            finish(() => loginWithFacebook(resp.authResponse.accessToken));
        }, { scope: 'public_profile,email' });
    };

    if (!cfg || (!cfg.googleClientId && !cfg.facebookAppId)) return null;

    return (
        <div className="space-y-4 pt-1">
            <div className="flex items-center gap-3 text-xs uppercase tracking-wider text-slate-500 font-semibold">
                <span className="h-px flex-1 bg-white/10" />
                <span>Hoặc tiếp tục với</span>
                <span className="h-px flex-1 bg-white/10" />
            </div>

            {error && (
                <div className="rounded-xl bg-red-500/10 border border-red-500/30 p-3 text-xs text-red-300">
                    {error}
                </div>
            )}

            <div className={`flex flex-col items-center gap-3 ${busy ? 'pointer-events-none opacity-60' : ''}`}>
                {cfg.googleClientId && (
                    <div className="flex justify-center w-full">
                        <div ref={googleBtn} className="min-h-[44px]" />
                    </div>
                )}

                {cfg.facebookAppId && (
                    <button
                        type="button"
                        onClick={facebookLogin}
                        disabled={!fbOk || busy}
                        className="btn relative overflow-hidden flex h-11 w-full max-w-[320px] items-center justify-center gap-2.5 rounded-xl bg-[#1877F2] hover:bg-[#166fe5] text-sm font-bold text-white shadow-[0_0_20px_rgba(24,119,242,0.35)] transition-all hover:shadow-[0_0_25px_rgba(24,119,242,0.6)] active:scale-95 disabled:opacity-50"
                    >
                        <svg viewBox="0 0 24 24" className="h-5 w-5 fill-current" aria-hidden="true">
                            <path d="M24 12.07C24 5.4 18.63 0 12 0S0 5.4 0 12.07C0 18.1 4.39 23.1 10.13 24v-8.44H7.08v-3.49h3.05V9.41c0-3.02 1.79-4.7 4.53-4.7 1.31 0 2.68.24 2.68.24v2.97h-1.51c-1.49 0-1.96.93-1.96 1.89v2.26h3.33l-.53 3.49h-2.8V24C19.61 23.1 24 18.1 24 12.07z" />
                        </svg>
                        <span>{busy ? 'Đang xác thực...' : 'Tiếp tục với Facebook'}</span>
                    </button>
                )}
            </div>
        </div>
    );
}