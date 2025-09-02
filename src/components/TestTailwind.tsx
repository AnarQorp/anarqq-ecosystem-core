import * as React from 'react';

export const TestTailwind = () => {
  return (
    <div className="p-4">
      <div className="bg-green-500 text-white p-4 rounded-lg shadow-lg">
        <h2 className="text-xl font-bold mb-2">¡Tailwind CSS está funcionando!</h2>
        <p>Si ves este mensaje con fondo verde, significa que Tailwind CSS está correctamente configurado.</p>
      </div>
    </div>
  );
};

export default TestTailwind;
