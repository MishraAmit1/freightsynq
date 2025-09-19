export const DevModeIndicator = () => {
    if (import.meta.env.VITE_DEV_MODE !== 'true') return null;

    return (
        <div className="fixed bottom-4 right-4 bg-yellow-500 text-yellow-900 px-3 py-2 rounded-lg text-sm font-medium shadow-lg">
            🔧 DEV MODE: Any email format allowed
        </div>
    );
};