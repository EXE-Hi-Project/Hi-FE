import { Heart, Sparkle, Wrench } from '@phosphor-icons/react';
import { motion, useReducedMotion } from 'motion/react';

export default function MaintenanceVisual({ compact = false }: { compact?: boolean }) {
  const reduceMotion = useReducedMotion();
  const duration = compact ? 3.8 : 5;
  const shell = compact ? 'h-32 max-w-[250px]' : 'h-64 max-w-[470px] sm:h-72';
  const phone = compact ? 'h-[82px] w-[49px] rounded-xl border-[3px]' : 'h-[150px] w-[86px] rounded-[1.35rem] border-[5px]';
  const heart = compact ? 16 : 29;

  return (
    <div className={`relative mx-auto w-full ${shell}`} aria-hidden="true">
      <motion.div
        className="absolute inset-x-[5%] bottom-[1%] h-[82%] rounded-[50%] border border-rose-100/80"
        initial={{ opacity: 0, scale: 0.94 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: reduceMotion ? 0.01 : 0.55, ease: [0.16, 1, 0.3, 1] }}
      />
      <motion.div className={`absolute left-[8%] top-[48%] text-rose-200 ${compact ? 'text-sm' : 'text-xl'}`} animate={reduceMotion ? undefined : { y: [0, -7, 0] }} transition={{ duration, repeat: Infinity, ease: 'easeInOut' }}><Heart weight="fill" /></motion.div>
      <motion.div className={`absolute right-[10%] top-[37%] text-rose-200 ${compact ? 'text-xs' : 'text-lg'}`} animate={reduceMotion ? undefined : { y: [0, 6, 0] }} transition={{ duration: duration + 0.8, repeat: Infinity, ease: 'easeInOut' }}><Heart weight="fill" /></motion.div>
      <motion.div
        className={`absolute left-[23%] top-[23%] grid ${phone} place-items-center border-rose-400 bg-white shadow-[8px_10px_0_rgba(251,113,133,0.13)]`}
        animate={reduceMotion ? undefined : { y: [0, -5, 0], rotate: [0, -1, 0] }}
        transition={{ duration, repeat: Infinity, ease: 'easeInOut' }}
      >
        <span className="absolute left-1/2 top-0 h-[8%] w-[42%] -translate-x-1/2 rounded-b-md bg-rose-300" />
        <span className={`grid ${compact ? 'h-8 w-8' : 'h-14 w-14'} place-items-center rounded-full border border-rose-100 bg-rose-50 text-rose-500`}><Heart size={heart} weight="fill" /></span>
      </motion.div>
      <motion.div
        className={`absolute right-[23%] top-[23%] grid ${phone} place-items-center border-sky-400 bg-white shadow-[-8px_10px_0_rgba(96,165,250,0.13)]`}
        animate={reduceMotion ? undefined : { y: [0, 5, 0], rotate: [0, 1, 0] }}
        transition={{ duration: duration + 0.4, repeat: Infinity, ease: 'easeInOut' }}
      >
        <span className="absolute left-1/2 top-0 h-[8%] w-[42%] -translate-x-1/2 rounded-b-md bg-sky-300" />
        <span className={`grid ${compact ? 'h-8 w-8' : 'h-14 w-14'} place-items-center rounded-full border border-sky-100 bg-sky-50 text-sky-500`}><Heart size={heart} weight="fill" /></span>
      </motion.div>
      <motion.div className={`absolute bottom-[9%] left-1/2 grid -translate-x-1/2 place-items-center rounded-lg bg-rose-500 text-white shadow-lg shadow-rose-200 ${compact ? 'h-9 w-14' : 'h-14 w-24'}`} animate={reduceMotion ? undefined : { y: [0, -3, 0] }} transition={{ duration: duration - 0.4, repeat: Infinity, ease: 'easeInOut' }}>
        <Wrench size={compact ? 18 : 28} weight="bold" />
        <span className={`absolute ${compact ? 'bottom-1 h-1 w-4' : 'bottom-1.5 h-1.5 w-7'} rounded-full border border-white/70`} />
      </motion.div>
      <motion.div className="absolute right-[17%] top-[10%] text-amber-400" animate={reduceMotion ? undefined : { scale: [1, 1.18, 1], rotate: [0, 10, 0] }} transition={{ duration: duration - 0.8, repeat: Infinity, ease: 'easeInOut' }}><Sparkle size={compact ? 14 : 22} weight="fill" /></motion.div>
    </div>
  );
}
