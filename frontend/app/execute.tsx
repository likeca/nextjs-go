"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { runScript } from "@/actions/backend/actions";

export function BackendExecuteButton() {
  const [result, setResult] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleClick = async () => {
    setLoading(true);
    try {
      const res = await runScript();
      setResult(res.output ?? res.error ?? null);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <Button size="lg" onClick={handleClick} disabled={loading}>
        {loading ? 'Loading...' : 'Backend Execution'}
      </Button>
      {result && (
        <pre className="text-left p-4 rounded text-sm overflow-auto">
          {result}
        </pre>
      )}
    </div>
  );
}

// Test
// export function ToggleSwitch() {
//   const [isOn, setIsOn] = useState(true);   // or false for default off

//   const handleToggle = () => {
//     setIsOn(!isOn);
//   };

//   return (
//     <div className="toggle-container">
//       <div
//         className={`toggle-track ${isOn ? 'bg-blue-600' : 'bg-gray-600'}`}
//         onClick={handleToggle}
//       >
//         <div className={`toggle-knob ${isOn ? 'translate-x-6' : 'translate-x-0'}`} />
//       </div>
//     </div>
//   );
// }

// const useState: typeof reactUseState = reactUseState;
