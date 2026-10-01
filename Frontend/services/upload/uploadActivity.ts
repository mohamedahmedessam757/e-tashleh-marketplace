let active = 0;

export const beginUploadActivity = () => {
    active += 1;
};

export const endUploadActivity = () => {
    active = Math.max(0, active - 1);
};

export const getActiveUploadCount = () => active;
