export const jsonTransformer = {
    to: (value: any) => {
        if (value === null || value === undefined) return null;
        return JSON.stringify(value);
    },
    from: (value: any) => {
        if (value === null || value === undefined) return null;
        if (typeof value === 'string') {
            try {
                return JSON.parse(value);
            } catch (error) {
                return {};
            }
        }
        return value;
    }
};