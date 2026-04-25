'use client'
import Link from 'next/link'
import { motion } from 'framer-motion'

const fadeUp = {
  hidden:  { opacity: 0, y: 28 },
  visible: { opacity: 1, y: 0 },
}
const stagger = { visible: { transition: { staggerChildren: 0.12 } } }

const STATS = [
  { value: '4',    label: 'AI Agents',        sub: 'Swarm consensus' },
  { value: '91%',  label: 'AI Confidence',    sub: 'Per decision' },
  { value: 'RM',   label: 'Exact figures',    sub: 'Not estimates' },
  { value: '24/7', label: 'Live monitoring',  sub: 'ESG surveillance' },
]

export default function LandingPage() {
  return (
    <div
      className="min-h-screen relative overflow-hidden"
      style={{ background: '#05060A' }}
    >
      {/* ── Deep ambient glow ── */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'radial-gradient(ellipse 80% 60% at 15% 50%, #16A37A09 0%, transparent 65%),' +
            'radial-gradient(ellipse 40% 40% at 80% 20%, #A855F706 0%, transparent 50%)',
        }}
      />

      {/* ── Subtle dot grid ── */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.18]"
        style={{
          backgroundImage:
            'radial-gradient(circle, #2A2D38 1px, transparent 1px)',
          backgroundSize: '32px 32px',
        }}
      />

      {/* ── Navbar ── */}
      <nav className="fixed top-0 inset-x-0 z-50 flex items-center justify-between px-8 py-4 border-b border-[#1C1E26]/60 bg-[#05060A]/90 backdrop-blur-2xl">
        <div className="flex items-center gap-3">
          <img src="/logo.png" alt="GreenTrust Pulse" className="w-8 h-8 object-contain" />
          <span className="font-semibold text-[#EAEAEA] tracking-tight text-sm">GreenTrust Pulse</span>
          <span
            className="ml-2 text-[9px] font-semibold tracking-[0.1em] uppercase px-2 py-0.5 rounded-full"
            style={{ background: '#16A37A12', color: '#16A37A', border: '1px solid #16A37A25' }}
          >
            Beta
          </span>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/dashboard">
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.97 }}
              className="btn-primary text-sm"
            >
              Open Dashboard →
            </motion.button>
          </Link>
        </div>
      </nav>

      {/* ── Hero ── */}
      <div className="min-h-screen flex items-center">
        <motion.div
          className="pl-[18%] pr-12 max-w-[860px]"
          initial="hidden"
          animate="visible"
          variants={stagger}
        >
          {/* Eyebrow badge */}
          <motion.div variants={fadeUp} transition={{ duration: 0.5 }}>
            <span
              className="inline-flex items-center gap-2 text-[10px] font-semibold tracking-[0.1em] uppercase mb-10 px-3 py-1.5 rounded-full"
              style={{
                background: 'linear-gradient(90deg, #16A37A15, #A855F710)',
                border: '1px solid #16A37A25',
                color: '#16A37A',
              }}
            >
              <span
                className="w-1.5 h-1.5 rounded-full animate-pulse-green"
                style={{ background: '#16A37A' }}
              />
              Powered by Zhipu AI GLM-4 + GraphRAG
            </span>
          </motion.div>

          {/* Headline */}
          <motion.h1
            variants={fadeUp}
            transition={{ duration: 0.5 }}
            className="font-semibold text-[#EAEAEA] mb-7"
            style={{ fontSize: 'clamp(48px, 6vw, 76px)', lineHeight: 1.04, letterSpacing: '-0.02em' }}
          >
            The ESG intelligence<br />
            <span style={{ color: '#16A37A' }}>your banker</span> never<br />
            told you about.
          </motion.h1>

          {/* Sub */}
          <motion.p
            variants={fadeUp}
            transition={{ duration: 0.5 }}
            className="text-[#71747D] text-lg leading-relaxed mb-10 max-w-[480px]"
          >
            Four AI agents. Real RM figures. Greenwash detection.
            Green-loan decisions in seconds.
          </motion.p>

          {/* CTAs */}
          <motion.div
            variants={fadeUp}
            transition={{ duration: 0.5 }}
            className="flex items-center gap-4"
          >
            <Link href="/dashboard">
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.97 }}
                className="btn-primary text-sm px-6 py-3"
              >
                Launch Demo
              </motion.button>
            </Link>
            <Link href="/report">
              <button
                className="text-sm font-medium text-[#71747D] hover:text-[#EAEAEA] transition-colors px-5 py-3 rounded-xl border border-[#1C1E26] hover:border-[#2A2D38] bg-transparent"
              >
                View Sample Report →
              </button>
            </Link>
          </motion.div>

          {/* ── Stats row ── */}
          <motion.div
            variants={fadeUp}
            transition={{ duration: 0.5 }}
            className="mt-20 grid grid-cols-4 gap-6 max-w-[520px]"
          >
            {STATS.map(({ value, label, sub }) => (
              <div key={label} className="flex flex-col gap-1">
                <p
                  className="font-mono font-bold text-2xl"
                  style={{ color: '#EAEAEA', letterSpacing: '-0.02em' }}
                >
                  {value}
                </p>
                <p className="text-xs font-semibold text-[#EAEAEA]">{label}</p>
                <p className="text-[10px] text-[#3E414D]">{sub}</p>
              </div>
            ))}
          </motion.div>
        </motion.div>
      </div>

      {/* ── Bottom edge gradient ── */}
      <div
        className="pointer-events-none absolute bottom-0 inset-x-0 h-40"
        style={{ background: 'linear-gradient(to top, #05060A, transparent)' }}
      />
    </div>
  )
}
