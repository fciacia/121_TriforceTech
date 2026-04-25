function LoginForm() {
  const router       = useRouter()
  const searchParams = useSearchParams()
  const next         = searchParams.get('next') ?? '/dashboard'

  const [email,    setEmail]    = useState('')
  const [password, setPassword] = useState('')
  const [loading,  setLoading]  = useState(false)
  const [error,    setError]    = useState<string | null>(null)

  // Redirect if already authenticated
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) router.replace(next)
    })
  }, [next, router])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const { error: authError } = await supabase.auth.signInWithPassword({ email, password })

    if (authError) {
      setError(authError.message)
      setLoading(false)
      return
    }

    router.replace(next)
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center relative overflow-hidden"
      style={{ background: '#05060A' }}
    >
      {/* Ambient glow */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'radial-gradient(ellipse 60% 50% at 50% 60%, #16A37A08 0%, transparent 70%)',
        }}
      />

      {/* Dot grid */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.15]"
        style={{
          backgroundImage: 'radial-gradient(circle, #2A2D38 1px, transparent 1px)',
          backgroundSize:  '32px 32px',
        }}
      />

      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="relative z-10 w-full max-w-sm mx-4"
      >
        {/* Logo */}
        <div className="flex items-center justify-center gap-3 mb-8">
          <img src="/logo.png" alt="GreenTrust Pulse" className="w-10 h-10 object-contain" />
          <span className="font-semibold text-[#EAEAEA] tracking-tight">GreenTrust Pulse</span>
        </div>

        {/* Card */}
        <div
          className="rounded-2xl p-8 flex flex-col gap-6"
          style={{
            background: '#111318',
            border:     '1px solid #1C1E26',
            boxShadow:  '0 8px 40px #00000060',
          }}
        >
          <div>
            <h1 className="text-[#EAEAEA] text-xl font-bold tracking-tight mb-1">Sign in</h1>
            <p className="text-[#6B7280] text-sm">ESG Intelligence Platform · Authorised access only</p>
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] uppercase tracking-[0.08em] text-[#6B7280] font-semibold">
                Email
              </label>
              <input
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@company.com"
                className="w-full rounded-xl px-4 py-2.5 text-sm text-[#EAEAEA] placeholder-[#3E414D] outline-none transition-all"
                style={{
                  background: '#1C1E26',
                  border:     '1px solid #2A2D38',
                }}
                onFocus={(e) => (e.currentTarget.style.borderColor = '#16A37A60')}
                onBlur={(e)  => (e.currentTarget.style.borderColor = '#2A2D38')}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] uppercase tracking-[0.08em] text-[#6B7280] font-semibold">
                Password
              </label>
              <input
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full rounded-xl px-4 py-2.5 text-sm text-[#EAEAEA] placeholder-[#3E414D] outline-none transition-all"
                style={{
                  background: '#1C1E26',
                  border:     '1px solid #2A2D38',
                }}
                onFocus={(e) => (e.currentTarget.style.borderColor = '#16A37A60')}
                onBlur={(e)  => (e.currentTarget.style.borderColor = '#2A2D38')}
              />
            </div>

            {error && (
              <motion.p
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-xs rounded-lg px-3 py-2"
                style={{ background: '#DC262615', color: '#DC2626', border: '1px solid #DC262630' }}
              >
                {error}
              </motion.p>
            )}

            <motion.button
              type="submit"
              disabled={loading}
              whileHover={{ scale: loading ? 1 : 1.01 }}
              whileTap={{ scale: loading ? 1 : 0.98 }}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-sm text-white transition-opacity disabled:opacity-60 disabled:cursor-not-allowed mt-1"
              style={{
                background: 'linear-gradient(135deg, #16A37A 0%, #0D9268 100%)',
                boxShadow:  '0 2px 16px #16A37A35',
              }}
            >
              {loading ? (
                <><Loader2 size={14} className="animate-spin" /> Signing in…</>
              ) : (
                <><LogIn size={14} /> Sign in</>
              )}
            </motion.button>
          </form>
        </div>
      </motion.div>
    </div>
  )
}

// useSearchParams requires Suspense boundary
export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  )
}
