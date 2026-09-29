import base from "./base.mjs";

/** Next.js. React rules come from the react-native config's shared plugin set. */
export default [...base, { settings: { react: { version: "detect" } } }];
