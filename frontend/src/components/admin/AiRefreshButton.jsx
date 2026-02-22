import { useState } from 'react';
import { Button, Tooltip } from '@mui/material';
import { AutoAwesome } from '@mui/icons-material';
import AiRefreshModal from './AiRefreshModal';
import { adminApi } from '../../services/api';
import toast from 'react-hot-toast';

/**
 * Reusable "Refresh Latest Data (AI)" button.
 *
 * Props:
 *   companyId?  - if provided, refreshes only that company
 *   variant?    - MUI button variant (default: 'contained')
 *   size?       - MUI button size (default: 'medium')
 *   onComplete? - callback called with result after successful refresh
 */
export default function AiRefreshButton({
  companyId,
  variant = 'contained',
  size = 'medium',
  label,
  onComplete,
}) {
  const [open, setOpen]       = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult]   = useState(null);
  const [error, setError]     = useState(null);

  const handleClick = async () => {
    setOpen(true);
    setLoading(true);
    setResult(null);
    setError(null);

    try {
      const res = companyId
        ? await adminApi.aiRefreshOne(companyId)
        : await adminApi.aiRefreshAll();

      const data = res.data.data;
      setResult(data);

      if (data.status === 'SUCCESS') {
        toast.success(`✨ AI refresh complete — ${data.newSalariesAdded} salaries added`);
      } else if (data.status === 'PARTIAL') {
        toast.error(`⚠️ Partial refresh — some companies failed`);
      } else {
        toast.error('AI refresh failed');
      }

      onComplete?.(data);
    } catch (err) {
      const msg = err.response?.data?.error ?? err.message ?? 'Unknown error';
      setError(msg);
      toast.error('AI refresh failed: ' + msg);
    } finally {
      setLoading(false);
    }
  };

  const btnLabel = label ?? (companyId ? 'AI Refresh' : 'Refresh Latest Data (AI)');

  return (
    <>
      <Tooltip title="Use Claude AI to fetch & import the latest public salary data"
        arrow placement="bottom">
        <Button
          variant={variant}
          size={size}
          onClick={handleClick}
          disabled={loading}
          startIcon={<AutoAwesome />}
          sx={{
            background: 'linear-gradient(135deg, #e94560 0%, #9333ea 100%)',
            color: 'white',
            fontWeight: 700,
            letterSpacing: 0.3,
            boxShadow: '0 0 20px rgba(233,69,96,0.25)',
            '&:hover': {
              background: 'linear-gradient(135deg, #c73652 0%, #7c22c9 100%)',
              boxShadow: '0 0 30px rgba(233,69,96,0.4)',
              transform: 'translateY(-1px)',
            },
            '&:disabled': {
              background: 'rgba(255,255,255,0.08)',
              color: 'rgba(255,255,255,0.3)',
            },
            transition: 'all 0.2s ease',
          }}
        >
          {btnLabel}
        </Button>
      </Tooltip>

      <AiRefreshModal
        open={open}
        loading={loading}
        result={result}
        error={error}
        onClose={() => setOpen(false)}
      />
    </>
  );
}
