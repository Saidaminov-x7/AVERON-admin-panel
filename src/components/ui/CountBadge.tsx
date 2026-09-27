import { motion } from 'framer-motion';
import { useReducedMotion } from '../../hooks/useReducedMotion';

export function CountBadge({ count }: { count: number }) {
  const prefersReducedMotion = useReducedMotion();
  if (!count) return null;
  return (
    <motion.span
      key={count}
      initial={{ scale: prefersReducedMotion ? 1 : 1.3 }}
      animate={{ scale: 1 }}
      transition={{ duration: 0.2 }}
      className="inline-flex items-center justify-center min-w-[1.375rem] h-[1.375rem] px-1.5 rounded-full bg-red-500 text-white text-[11px] font-bold leading-none whitespace-nowrap shadow-xs"
    >
      {count > 99 ? '99+' : count}
    </motion.span>
  );
}

export default CountBadge;
