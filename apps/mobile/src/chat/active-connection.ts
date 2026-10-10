/** The room on screen, so a push for it does not show a banner over itself. */
let active: string | null = null;

export const getActiveConnection = () => active;
export const setActiveConnection = (connectionId: string | null) => {
  active = connectionId;
};
