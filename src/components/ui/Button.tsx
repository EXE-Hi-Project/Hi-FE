import { forwardRef, type ReactNode } from 'react';
import { clsx } from 'clsx';
import { motion, useReducedMotion, type HTMLMotionProps } from 'motion/react';
import { hoverMotion, motionTransition, pressMotion } from '../../lib/motion';

interface ButtonProps extends Omit<HTMLMotionProps<'button'>, 'children'> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger' | 'icon';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  fullWidth?: boolean;
  children?: ReactNode;
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = 'primary', size = 'md', loading, fullWidth, children, className, disabled, ...props }, ref) => {
    const reduceMotion = useReducedMotion();
    const base = 'inline-flex items-center justify-center font-semibold rounded-xl transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-60 disabled:cursor-not-allowed disabled:translate-y-0 disabled:shadow-none active:scale-[0.98]';
    const variants = {
      primary: 'hi-btn-primary text-white focus:ring-pink-300',
      secondary: 'hi-btn-secondary focus:ring-pink-200',
      outline: 'hi-btn-secondary focus:ring-pink-200',
      ghost: 'bg-transparent text-slate-600 hover:bg-pink-50 hover:text-pink-600 focus:ring-pink-200',
      danger: 'hi-btn-danger focus:ring-rose-300',
      icon: 'bg-white/90 text-slate-500 border border-white/80 shadow-sm hover:-translate-y-0.5 hover:border-pink-100 hover:bg-pink-50 hover:text-pink-500 focus:ring-pink-200',
    };
    const sizes = {
      sm: variant === 'icon' ? 'h-8 w-8 text-sm' : 'px-3 py-1.5 text-sm',
      md: variant === 'icon' ? 'h-9 w-9 text-sm' : 'px-5 py-2.5 text-sm',
      lg: variant === 'icon' ? 'h-11 w-11 text-base' : 'px-6 py-3 text-base',
    };
    return (
      <motion.button
        ref={ref}
        disabled={disabled || loading}
        aria-busy={loading || undefined}
        whileHover={reduceMotion || disabled || loading ? undefined : hoverMotion}
        whileTap={reduceMotion || disabled || loading ? undefined : pressMotion}
        transition={motionTransition.quick}
        className={clsx(base, variants[variant], sizes[size], fullWidth && 'w-full', className)}
        {...props}
      >
        {loading && (
          <svg className="animate-spin -ml-1 mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
        )}
        {children}
      </motion.button>
    );
  }
);

Button.displayName = 'Button';
export default Button;
