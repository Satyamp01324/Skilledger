import { AnimatePresence, motion } from 'framer-motion';

export default function Toast({ toast }) {
  return (
    <AnimatePresence>
      {toast && (
        <motion.div
          key={toast.id}
          initial={{ opacity: 0, y: 20, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 10, scale: 0.95 }}
          className={`toast ${toast.type === 'error' ? 'toast-error' : 'toast-success'}`}
        >
          {toast.message}
        </motion.div>
      )}
    </AnimatePresence>
  );
}