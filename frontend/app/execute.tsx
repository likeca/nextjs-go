"use client";

import { Button } from "@/components/ui/button";
import { runMyScript } from "@/actions/backend/actions";
import { useState as reactUseState } from "react";

export function BackendExecuteButton() {
  const [result, setResult] = reactUseState<string | null>(null);

  const handleAction = async () => {
    const res = await runMyScript();
    setResult(res.output ?? null);
  };

  return (
    <div className="flex flex-col gap-4">
      <Button size="lg" onClick={handleAction}>
        Backend Execute Command
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
