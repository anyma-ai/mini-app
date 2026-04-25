import { MiniAppShell, Typography } from '@/components';

export function HomePage() {
  return (
    <MiniAppShell>
      <div style={{ color: '#fff', paddingTop: '24px' }}>
        <Typography variant="display-lg">SweetMe mini-app</Typography>
      </div>
    </MiniAppShell>
  );
}
