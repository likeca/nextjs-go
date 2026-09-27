'use client';

import { useState } from 'react';

import { Button } from '@/components/ui/button';
import { getGroups } from '@/actions/groups/get-groups';

export function GroupsButton() {
  const [result, setResult] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleClick = async () => {
    setLoading(true);
    try {
      setResult(await getGroups());
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <Button size="lg" onClick={handleClick} disabled={loading}>
        {loading ? 'Loading...' : 'Groups'}
      </Button>
      {result && <pre className="text-left p-4 rounded text-sm overflow-auto">{result}</pre>}
    </div>
  );
}
