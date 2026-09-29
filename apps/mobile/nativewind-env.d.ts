/// <reference types="nativewind/types" />

// Metro turns the stylesheet into a side-effect import; TypeScript needs a
// declaration for it or `import "../global.css"` fails with TS2882.
declare module "*.css";
